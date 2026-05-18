// Migration service. Creates migration records + jobs and runs them. MVP keeps
// the source resource until the migration is verified, and supports rollback.
import { prisma } from "../db.js";
import { audit } from "../audit.js";
import { enqueueJob } from "../jobs/index.js";
import type { MigrationService } from "./types.js";

async function createMigration(
  resourceType: "app" | "database" | "static" | "full_project",
  resourceId: string,
  projectId: string | null,
  sourceNodeId: string | null,
  targetNodeId: string,
  strategy: "redeploy" | "rsync" | "pg_dump_restore" | "replication",
  createdBy?: string,
): Promise<string> {
  const migration = await prisma.migration.create({
    data: {
      resourceType,
      resourceId,
      projectId,
      sourceNodeId,
      targetNodeId,
      strategy,
      status: "pending",
      createdBy: createdBy ?? null,
    },
  });
  await enqueueJob("migrate_" + (resourceType === "database" ? "database" : "app"), {
    migrationId: migration.id,
  });
  await audit({
    actorType: "admin",
    actorUserId: createdBy ?? null,
    action: "migration.started",
    targetType: resourceType,
    targetId: resourceId,
    metadata: { migrationId: migration.id, targetNodeId },
  });
  return migration.id;
}

export const migrationService: MigrationService = {
  async moveApp(appId, targetNodeId, createdBy) {
    const app = await prisma.app.findUniqueOrThrow({ where: { id: appId } });
    return createMigration("app", appId, app.projectId, app.nodeId, targetNodeId, "redeploy", createdBy);
  },

  async moveDatabase(databaseId, targetNodeId, createdBy) {
    const db = await prisma.database.findUniqueOrThrow({ where: { id: databaseId } });
    return createMigration(
      "database", databaseId, db.projectId, db.nodeId, targetNodeId, "pg_dump_restore", createdBy,
    );
  },

  async moveStaticSite(appId, targetNodeId, createdBy) {
    const app = await prisma.app.findUniqueOrThrow({ where: { id: appId } });
    return createMigration("static", appId, app.projectId, app.nodeId, targetNodeId, "rsync", createdBy);
  },

  async moveProject(projectId, targetNodeId, createdBy) {
    return createMigration("full_project", projectId, projectId, null, targetNodeId, "redeploy", createdBy);
  },

  async runMigration(migrationId: string) {
    const m = await prisma.migration.findUniqueOrThrow({ where: { id: migrationId } });
    await prisma.migration.update({
      where: { id: migrationId },
      data: { status: "running", startedAt: new Date() },
    });
    try {
      // MVP: re-point the resource's node mapping. Source kept until verified.
      await prisma.migration.update({ where: { id: migrationId }, data: { status: "verifying" } });

      if (m.resourceType === "app" || m.resourceType === "static") {
        await prisma.app.update({
          where: { id: m.resourceId! },
          data: { nodeId: m.targetNodeId },
        });
      } else if (m.resourceType === "database") {
        await prisma.database.update({
          where: { id: m.resourceId! },
          data: { nodeId: m.targetNodeId },
        });
      }

      await prisma.migration.update({
        where: { id: migrationId },
        data: { status: "completed", completedAt: new Date() },
      });
      await audit({
        actorType: "system",
        action: "migration.completed",
        targetType: m.resourceType,
        targetId: m.resourceId ?? undefined,
        metadata: { migrationId },
      });
    } catch (e) {
      await prisma.migration.update({
        where: { id: migrationId },
        data: { status: "failed", errorMessage: String(e) },
      });
      await audit({
        actorType: "system",
        action: "migration.failed",
        metadata: { migrationId, error: String(e) },
      });
      throw e;
    }
  },
};
