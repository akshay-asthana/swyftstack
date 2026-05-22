// Seed: platform admin, Starter + Pro plans (limits + features), one local
// all-in-one node. Idempotent — safe to run repeatedly.
import os from "node:os";
import { prisma } from "./db.js";
import { env } from "./env.js";
import { hashPassword, encryptSecret } from "./crypto.js";
import { PLAN_PRESETS, NODE_ROLES } from "./constants.js";

async function seedPlan(preset: (typeof PLAN_PRESETS)["starter"]) {
  const plan = await prisma.plan.upsert({
    where: { slug: preset.slug },
    update: { name: preset.name, priceCents: preset.priceCents },
    create: { name: preset.name, slug: preset.slug, priceCents: preset.priceCents },
  });

  await prisma.planLimit.upsert({
    where: { planId: plan.id },
    update: {},
    create: {
      planId: plan.id,
      maxProjects: preset.limits.max_projects,
      maxDatabases: preset.limits.max_databases,
      maxDatabaseStorageBytes: bigOrNull(preset.limits.max_database_storage_bytes),
      maxObjectStorageBytes: bigOrNull(preset.limits.max_object_storage_bytes),
      maxEgressBytes: bigOrNull(preset.limits.max_egress_bytes),
      maxVcpuSeconds: bigOrNull(preset.limits.max_vcpu_seconds),
      maxBuildVcpuSeconds: bigOrNull(preset.limits.max_build_vcpu_seconds),
      dailyDbBackups: preset.limits.daily_db_backups,
      backupRetentionHours: preset.limits.backup_retention_hours,
      maxTeamMembers: preset.limits.max_team_members,
      maxCustomDomains: preset.limits.max_custom_domains,
    },
  });

  for (const [featureKey, enabled] of Object.entries(preset.features)) {
    await prisma.planFeature.upsert({
      where: { planId_featureKey: { planId: plan.id, featureKey } },
      update: { enabled },
      create: { planId: plan.id, featureKey, enabled },
    });
  }
  return plan;
}

function bigOrNull(v: number | null): bigint | null {
  return v === null ? null : BigInt(v);
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: env.PLATFORM_ADMIN_EMAIL },
    update: { isPlatformAdmin: true },
    create: {
      email: env.PLATFORM_ADMIN_EMAIL,
      name: "Platform Admin",
      passwordHash: hashPassword(env.PLATFORM_ADMIN_PASSWORD),
      isPlatformAdmin: true,
      emailVerified: true,
    },
  });

  const starter = await seedPlan(PLAN_PRESETS.starter);
  const pro = await seedPlan(PLAN_PRESETS.pro);

  const node = await prisma.node.upsert({
    where: { name: "node-001" },
    update: {
      provider: "local",
      publicIp: "127.0.0.1",
      privateIp: "127.0.0.1",
      connectionMode: "local",
      sshHost: null,
      sshUser: null,
      sshPrivateKeyEncrypted: null,
      status: "active",
    },
    create: {
      name: "node-001",
      provider: "local",
      publicIp: "127.0.0.1",
      privateIp: "127.0.0.1",
      connectionMode: "local",
      region: "local",
      status: "active",
      roles: [...NODE_ROLES],
      cpuCores: os.cpus().length || 2,
      ramBytes: BigInt(os.totalmem()),
      diskBytes: BigInt(100) * BigInt(1024 ** 3),
      lastHeartbeatAt: new Date(),
      agentVersion: "local-dev",
    },
  });

  // --- DB-managed infrastructure providers (replaces customer infra env) ---

  // local_dev customer Postgres cluster. For the single-node MVP this reuses
  // the control Postgres server's superuser, targeting the default `postgres`
  // database. Production registers real clusters from the admin UI instead.
  const adminUrl = new URL(env.DATABASE_URL);
  const clusterAdmin = new URL(env.DATABASE_URL);
  clusterAdmin.pathname = "/postgres";

  const dbInfra =
    (await prisma.infrastructureProvider.findFirst({ where: { name: "local-postgres" } })) ??
    (await prisma.infrastructureProvider.create({
      data: {
        name: "local-postgres",
        type: "database",
        provider: "postgres",
        status: "active",
        region: "local",
      },
    }));

  const cluster = await prisma.databaseCluster.upsert({
    where: { name: "local-cluster" },
    update: {},
    create: {
      name: "local-cluster",
      providerId: dbInfra.id,
      nodeId: node.id,
      engine: "postgres",
      engineVersion: "16",
      adminConnectionEncrypted: encryptSecret(clusterAdmin.toString()),
      host: adminUrl.hostname,
      port: Number(adminUrl.port || 5432),
      defaultDatabase: "postgres",
      sslRequired: false,
      region: "local",
      status: "active",
    },
  });

  const objStore = await prisma.objectStorageProvider.upsert({
    where: { name: "local-object-storage" },
    update: {},
    create: {
      name: "local-object-storage",
      provider: "local_dev",
      localPath: env.DEV_LOCAL_STORAGE_ROOT,
      pathStyle: true,
      status: "active",
    },
  });

  const backupStore = await prisma.backupStorageProvider.upsert({
    where: { name: "local-backups" },
    update: { isDefault: true },
    create: {
      name: "local-backups",
      provider: "local_dev",
      localPath: env.DEV_LOCAL_BACKUP_ROOT,
      isDefault: true,
      status: "active",
      retentionPolicy: { last24h: "6h", last7d: "daily", last4w: "weekly" },
    },
  });

  const workerCfg = await prisma.workerConfig.upsert({
    where: { workerType: "default" },
    update: {},
    create: {
      name: "Default worker",
      workerType: "default",
      enabled: true,
      pollIntervalMs: env.DEFAULT_WORKER_POLL_INTERVAL_MS,
      concurrency: env.DEFAULT_WORKER_CONCURRENCY,
      lockTimeoutMs: env.DEFAULT_WORKER_LOCK_TIMEOUT_MS,
      queues: [],
      config: {},
    },
  });

  console.log("Seed complete:");
  console.log("  admin:", admin.email);
  console.log("  plans:", starter.slug, pro.slug);
  console.log("  node :", node.name, node.roles.join(","));
  console.log("  db cluster        :", cluster.name);
  console.log("  object storage    :", objStore.name);
  console.log("  backup provider   :", backupStore.name, "(default)");
  console.log("  worker config     :", workerCfg.workerType);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
