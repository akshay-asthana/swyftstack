// Job handler registry. Each handler is idempotent-ish and writes audit logs.
import { prisma } from "../db.js";
import { audit } from "../audit.js";
import { localNodeService } from "../services/node.js";
import { localAppService } from "../services/app.js";
import { localDatabaseService } from "../services/database.js";
import { backupService } from "../services/backup.js";
import { migrationService } from "../services/migration.js";
import { nodeDrainService } from "../services/node-drain.js";
import { storageProviderFor } from "../services/storage.js";
import { objectStorageProviderService } from "../services/object-storage-provider.js";
import { discoveryService } from "../services/discovery.js";
import { metricsService } from "../services/metrics.js";
import { databaseImportService } from "../services/database-import.js";
import { createStorageBucketOnProvider, rotateStorageCredentials } from "../services/customer-storage.js";
import { rollUpUsage, enforceLimits } from "../usage-engine.js";
import { rollUpMetrics } from "../metrics-rollup.js";

type Handler = (payload: Record<string, unknown>) => Promise<unknown>;

export const JOB_HANDLERS: Record<string, Handler> = {
  async deploy_app(p) {
    const deploymentId = String(p.deploymentId);
    const dep = await prisma.deployment.findUniqueOrThrow({ where: { id: deploymentId } });
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: "building" } });
    const app = await prisma.app.findUniqueOrThrow({ where: { id: dep.appId } });
    if (app.type === "static") {
      await localAppService.deployStaticSite(app.id, deploymentId);
    } else {
      await prisma.deployment.update({ where: { id: deploymentId }, data: { status: "deploying" } });
      await localAppService.createAppContainer(app.id);
      await prisma.deployment.update({
        where: { id: deploymentId },
        data: { status: "live", finishedAt: new Date() },
      });
    }
    await audit({ actorType: "system", action: "deployment.completed", targetType: "app", targetId: app.id });
    return { deploymentId };
  },

  async create_database(p) {
    await localDatabaseService.createProjectDatabase(String(p.databaseId));
    return { databaseId: p.databaseId };
  },

  async rotate_database_password(p) {
    await localDatabaseService.rotateDatabasePassword(String(p.databaseId));
    return { databaseId: p.databaseId };
  },

  async create_storage_bucket(p) {
    await createStorageBucketOnProvider(String(p.bucketId));
    return { bucketId: p.bucketId };
  },

  async rotate_storage_credentials(p) {
    await rotateStorageCredentials(String(p.bucketId));
    return { bucketId: p.bucketId };
  },

  async backup_database(p) {
    return { backupId: await backupService.runDatabaseBackup(String(p.databaseId)) };
  },

  async schedule_database_backups() {
    const cutoff = new Date(Date.now() - 23 * 60 * 60_000);
    const databases = await prisma.database.findMany({
      where: { status: "active" },
      include: {
        backups: { orderBy: { createdAt: "desc" }, take: 1 },
        project: {
          include: {
            organization: {
              include: {
                subscriptions: {
                  where: { status: { in: ["active", "trialing", "past_due"] } },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  include: { plan: { include: { limits: true, features: true } } },
                },
              },
            },
          },
        },
      },
    });
    let enqueued = 0;
    for (const db of databases) {
      const sub = db.project.organization.subscriptions[0];
      const backupsEnabled = sub?.plan.features.some((f) => f.featureKey === "backups" && f.enabled) ?? false;
      const daily = sub?.plan.limits?.dailyDbBackups ?? 0;
      const latest = db.backups[0];
      if (!backupsEnabled || daily <= 0) continue;
      if (latest && latest.createdAt > cutoff && ["pending", "running", "uploading", "verified"].includes(latest.status)) continue;
      await prisma.job.create({
        data: {
          type: "backup_database",
          payload: { databaseId: db.id },
          priority: 70,
          runAfter: new Date(),
          maxAttempts: 5,
        },
      });
      enqueued += 1;
    }
    return { enqueued };
  },

  async restore_database(p) {
    await localDatabaseService.restoreDatabaseBackup(String(p.backupId));
    return { backupId: p.backupId };
  },

  async collect_node_metrics() {
    // Include "offline" so a node recovers once metrics resume (§4); only
    // disabled / archived / provisioning nodes are skipped.
    const nodes = await prisma.node.findMany({
      where: { status: { in: ["active", "draining", "degraded", "offline"] } },
    });
    for (const n of nodes) await localNodeService.collectMetrics(n.id).catch(() => undefined);
    await localNodeService.reconcileHealth();
    return { count: nodes.length };
  },

  async discover_node_hardware(p) {
    const nodeId = String(p.nodeId);
    const hw = await discoveryService.discoverNode(nodeId);
    return { nodeId, cpuCores: hw.cpuCores, ramBytes: String(hw.ramBytes ?? "") };
  },

  async collect_app_metrics() {
    return metricsService.collectAppMetrics();
  },

  async collect_database_metrics() {
    return metricsService.collectDatabaseMetrics();
  },

  async collect_storage_metrics() {
    return metricsService.collectStorageMetrics();
  },

  async collect_usage() {
    return rollUpUsage();
  },

  async rollup_metrics() {
    const r = await rollUpMetrics();
    return { hourly: r.hourly.toISOString(), daily: r.daily.toISOString() };
  },

  async enforce_limits() {
    return enforceLimits();
  },

  async import_database_from_url(p) {
    const importId = String(p.importId);
    await databaseImportService.runImport(importId);
    return { importId };
  },

  async sync_storage_usage() {
    const buckets = await prisma.storageBucket.findMany({
      where: { status: "active", objectStorageProviderId: { not: null } },
    });
    for (const b of buckets) {
      const provider = await storageProviderFor(b.objectStorageProviderId!);
      await provider.getUsage(b.id).catch(() => undefined);
    }
    // Roll bucket usage up into each object_storage_providers row.
    const providers = await objectStorageProviderService.listActiveProviders();
    for (const p of providers) await objectStorageProviderService.updateProviderUsage(p.id);
    return { count: buckets.length };
  },

  async migrate_app(p) {
    const migrationId = String(p.migrationId);
    await migrationService.runMigration(migrationId);
    const m = await prisma.migration.findUnique({
      where: { id: migrationId },
      select: { sourceNodeId: true },
    });
    if (m?.sourceNodeId) await nodeDrainService.finalizeIfDrained(m.sourceNodeId).catch(() => undefined);
    return { migrationId };
  },

  async migrate_database(p) {
    const migrationId = String(p.migrationId);
    await migrationService.runMigration(migrationId);
    const m = await prisma.migration.findUnique({
      where: { id: migrationId },
      select: { sourceNodeId: true },
    });
    if (m?.sourceNodeId) await nodeDrainService.finalizeIfDrained(m.sourceNodeId).catch(() => undefined);
    return { migrationId };
  },

  async suspend_project(p) {
    const projectId = String(p.projectId);
    await prisma.project.update({ where: { id: projectId }, data: { status: "suspended" } });
    const apps = await prisma.app.findMany({ where: { projectId } });
    for (const a of apps) await localAppService.stopAppContainer(a.id).catch(() => undefined);
    await audit({ actorType: "system", action: "project.suspended", targetType: "project", targetId: projectId });
    return { projectId };
  },

  async delete_project(p) {
    const projectId = String(p.projectId);
    // Final backup before destroy (payment-failure Day 30 path).
    const dbs = await prisma.database.findMany({ where: { projectId } });
    for (const d of dbs) await backupService.runDatabaseBackup(d.id).catch(() => undefined);
    await prisma.project.update({ where: { id: projectId }, data: { status: "deleted" } });
    await audit({ actorType: "system", action: "project.deleted", targetType: "project", targetId: projectId });
    return { projectId };
  },

  async backup_control_db() {
    return { backupId: await backupService.runControlPlaneBackup() };
  },
};
