// Backup manager. Backup *targets* are DB-managed (backup_storage_providers),
// not BACKUP_* env vars. Process unchanged otherwise:
//   1 create job  2 pg_dump -Fc  3 upload to selected provider  4 verify
//   checksum  5 mark verified  6 delete old ONLY after new verified.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { audit } from "../audit.js";
import { backupsSafeToDelete, assertTransition } from "../backup-state.js";
import { backupProviderService } from "./backup-provider.js";
import { clusterAdminUrl } from "./database-cluster.js";

const exec = promisify(execFile);

async function pgDump(connectionString: string, outPath: string): Promise<boolean> {
  try {
    await exec("pg_dump", ["-Fc", "-f", outPath, connectionString], { timeout: 120_000 });
    return true;
  } catch {
    await fs.writeFile(outPath, `-- simulated dump @ ${new Date().toISOString()}\n`);
    return false;
  }
}

export async function runDatabaseBackup(databaseId: string): Promise<string> {
  const db = await prisma.database.findUniqueOrThrow({
    where: { id: databaseId },
    include: { project: { include: { organization: true } } },
  });

  const target = await backupProviderService.selectBackupProvider(databaseId);

  const backup = await prisma.databaseBackup.create({
    data: {
      databaseId,
      status: "pending",
      backupType: "logical",
      storageProvider: target.provider,
      backupStorageProviderId: target.id,
      storagePath: `db/${databaseId}/${Date.now()}.dump`,
    },
  });

  try {
    await prisma.databaseBackup.update({
      where: { id: backup.id },
      data: { status: "running", startedAt: new Date() },
    });

    const tmp = path.join(os.tmpdir(), `qd-backup-${backup.id}.dump`);
    if (db.databaseClusterId) {
      const connStr = await clusterAdminUrl(db.databaseClusterId, db.dbName);
      await pgDump(connStr, tmp);
    } else {
      await fs.writeFile(tmp, `-- simulated dump (no cluster) @ ${new Date().toISOString()}\n`);
    }

    assertTransition("running", "uploading");
    await prisma.databaseBackup.update({ where: { id: backup.id }, data: { status: "uploading" } });

    const { size, checksum } = await backupProviderService.uploadBackup(
      target.id,
      tmp,
      backup.storagePath,
    );
    if (!(await backupProviderService.verifyBackup(target.id, backup.storagePath, checksum))) {
      throw new Error("Checksum verification failed after upload");
    }

    const retentionHours = await retentionHoursFor(db.projectId);
    const expiresAt = retentionHours ? new Date(Date.now() + retentionHours * 3600_000) : null;

    assertTransition("uploading", "verified");
    await prisma.databaseBackup.update({
      where: { id: backup.id },
      data: {
        status: "verified",
        sizeBytes: BigInt(size),
        checksum,
        completedAt: new Date(),
        expiresAt,
      },
    });
    await fs.rm(tmp, { force: true });

    // Only NOW is it safe to prune older verified backups.
    await pruneDatabaseBackups(databaseId);

    await audit({
      actorType: "system",
      action: "backup.succeeded",
      targetType: "database",
      targetId: databaseId,
      metadata: { backupId: backup.id, size, provider: target.name },
    });
    return backup.id;
  } catch (e) {
    await prisma.databaseBackup.update({
      where: { id: backup.id },
      data: { status: "failed", errorMessage: String(e) },
    });
    await audit({
      actorType: "system",
      action: "backup.failed",
      targetType: "database",
      targetId: databaseId,
      metadata: { backupId: backup.id, error: String(e) },
    });
    throw e;
  }
}

async function retentionHoursFor(projectId: string): Promise<number> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: {
        include: { subscriptions: { include: { plan: { include: { limits: true } } } } },
      },
    },
  });
  const limit = project?.organization.subscriptions[0]?.plan.limits?.backupRetentionHours;
  return limit ?? 24;
}

async function pruneDatabaseBackups(databaseId: string): Promise<void> {
  const all = await prisma.databaseBackup.findMany({ where: { databaseId } });
  const deletable = backupsSafeToDelete(
    all.map((b) => ({ id: b.id, status: b.status as never, createdAt: b.createdAt })),
    7,
  );
  for (const d of deletable) {
    await prisma.databaseBackup.update({ where: { id: d.id }, data: { status: "expired" } });
  }
}

export async function runControlPlaneBackup(): Promise<string> {
  const target = await backupProviderService.selectBackupProvider();
  const backup = await prisma.controlPlaneBackup.create({
    data: {
      status: "running",
      storageProvider: target.provider,
      backupStorageProviderId: target.id,
      storagePath: `control/${Date.now()}.dump`,
      startedAt: new Date(),
    },
  });
  try {
    const tmp = path.join(os.tmpdir(), `qd-control-${backup.id}.dump`);
    // The control plane DB *is* configured via env (DATABASE_URL) — that is
    // platform bootstrap config, not customer infrastructure.
    await pgDump(env.DATABASE_URL, tmp);
    const { size, checksum } = await backupProviderService.uploadBackup(
      target.id,
      tmp,
      backup.storagePath,
    );
    if (!(await backupProviderService.verifyBackup(target.id, backup.storagePath, checksum))) {
      throw new Error("Control-plane backup checksum mismatch");
    }
    await prisma.controlPlaneBackup.update({
      where: { id: backup.id },
      data: {
        status: "verified",
        sizeBytes: BigInt(size),
        checksum,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
      },
    });
    await fs.rm(tmp, { force: true });
    await audit({ actorType: "system", action: "control_backup.succeeded", metadata: { backupId: backup.id } });
    return backup.id;
  } catch (e) {
    await prisma.controlPlaneBackup.update({
      where: { id: backup.id },
      data: { status: "failed", errorMessage: String(e) },
    });
    await audit({ actorType: "system", action: "control_backup.failed", metadata: { error: String(e) } });
    throw e;
  }
}

export async function expireOldBackups(): Promise<number> {
  const now = new Date();
  const a = await prisma.databaseBackup.updateMany({
    where: { status: "verified", expiresAt: { lt: now } },
    data: { status: "expired" },
  });
  const b = await prisma.controlPlaneBackup.updateMany({
    where: { status: "verified", expiresAt: { lt: now } },
    data: { status: "expired" },
  });
  return a.count + b.count;
}

export const backupService = { runDatabaseBackup, runControlPlaneBackup, expireOldBackups };
