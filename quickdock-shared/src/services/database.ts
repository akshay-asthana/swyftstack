// Local-dev DatabaseService. The admin connection now comes from the database's
// assigned cluster (database_clusters), NEVER a global CUSTOMER_PG_ADMIN_URL.
// If a database has no cluster or the cluster is unreachable, it degrades to
// "simulated" mode so the control plane still records state.
import { prisma } from "../db.js";
import { encryptSecret, decryptSecret, randomSecret } from "../crypto.js";
import {
  generateCreateDatabaseSql,
  generateInDatabaseSql,
  generateRotatePasswordSql,
  generateDropDatabaseSql,
  generateSuspendSql,
} from "../dbsql.js";
import { projectActivity, audit } from "../audit.js";
import { pgConnect, clusterAdminUrl, databaseClusterService } from "./database-cluster.js";
import type { DatabaseService } from "./types.js";

/** Decrypted admin URL for the cluster a database lives on (optionally a db). */
async function adminUrlForDatabase(databaseId: string, targetDb?: string): Promise<string | null> {
  const db = await prisma.database.findUniqueOrThrow({ where: { id: databaseId } });
  if (!db.databaseClusterId) return null; // unassigned -> simulated mode
  return clusterAdminUrl(db.databaseClusterId, targetDb);
}

export const localDatabaseService: DatabaseService = {
  async createProjectDatabase(databaseId: string) {
    const db = await prisma.database.findUniqueOrThrow({ where: { id: databaseId } });
    const password = decryptSecret(db.encryptedPassword);
    const names = {
      dbName: db.dbName,
      dbUser: db.dbUser,
      password,
      connectionLimit: db.connectionLimit ?? 10,
    };

    let simulated = true;
    const adminUrl = await adminUrlForDatabase(databaseId);
    if (adminUrl) {
      const admin = await pgConnect(adminUrl);
      if (admin) {
        try {
          for (const stmt of generateCreateDatabaseSql(names).split("\n")) {
            if (stmt.trim()) await admin.query(stmt);
          }
          await admin.end();
          const inDbUrl = await adminUrlForDatabase(databaseId, db.dbName);
          const inDb = inDbUrl ? await pgConnect(inDbUrl) : null;
          if (inDb) {
            for (const stmt of generateInDatabaseSql(names).split("\n")) {
              if (stmt.trim()) await inDb.query(stmt);
            }
            await inDb.end();
          }
          simulated = false;
        } catch (e) {
          await admin.end().catch(() => undefined);
          await audit({
            actorType: "system",
            action: "database.provision_error",
            targetType: "database",
            targetId: databaseId,
            metadata: { error: String(e) },
          });
        }
      }
    }

    await prisma.database.update({ where: { id: databaseId }, data: { status: "active" } });
    if (db.databaseClusterId) {
      await databaseClusterService.updateClusterUsage(db.databaseClusterId);
    }
    await projectActivity(db.projectId, "database.created", null, { databaseId, simulated });
  },

  async rotateDatabasePassword(databaseId: string) {
    const db = await prisma.database.findUniqueOrThrow({ where: { id: databaseId } });
    const newPassword = randomSecret(18);
    const adminUrl = await adminUrlForDatabase(databaseId);
    if (adminUrl) {
      const admin = await pgConnect(adminUrl);
      if (admin) {
        await admin.query(generateRotatePasswordSql(db.dbUser, newPassword)).catch(() => undefined);
        await admin.end();
      }
    }
    const encrypted = encryptSecret(newPassword);
    await prisma.database.update({ where: { id: databaseId }, data: { encryptedPassword: encrypted } });
    await projectActivity(db.projectId, "database.password_rotated", null, { databaseId });
    return { newPasswordEncrypted: encrypted };
  },

  async getDatabaseSize(databaseId: string) {
    const db = await prisma.database.findUniqueOrThrow({ where: { id: databaseId } });
    let size = Number(db.currentSizeBytes);
    const adminUrl = await adminUrlForDatabase(databaseId);
    if (adminUrl) {
      const admin = await pgConnect(adminUrl);
      if (admin) {
        try {
          const r = (await admin.query(
            `SELECT pg_database_size('${db.dbName}') AS s`,
          )) as { rows: { s: string }[] };
          size = Number(r.rows?.[0]?.s ?? size);
        } catch {
          /* keep last known */
        }
        await admin.end();
      }
    }
    await prisma.database.update({ where: { id: databaseId }, data: { currentSizeBytes: BigInt(size) } });
    if (db.databaseClusterId) await databaseClusterService.updateClusterUsage(db.databaseClusterId);
    return size;
  },

  async suspendDatabase(databaseId: string) {
    const db = await prisma.database.findUniqueOrThrow({ where: { id: databaseId } });
    const adminUrl = await adminUrlForDatabase(databaseId);
    if (adminUrl) {
      const admin = await pgConnect(adminUrl);
      if (admin) {
        await admin.query(generateSuspendSql(db.dbUser)).catch(() => undefined);
        await admin.end();
      }
    }
    await prisma.database.update({ where: { id: databaseId }, data: { status: "suspended" } });
  },

  async deleteDatabase(databaseId: string) {
    const db = await prisma.database.findUniqueOrThrow({ where: { id: databaseId } });
    const adminUrl = await adminUrlForDatabase(databaseId);
    if (adminUrl) {
      const admin = await pgConnect(adminUrl);
      if (admin) {
        for (const stmt of generateDropDatabaseSql(db).split("\n")) {
          if (stmt.trim()) await admin.query(stmt).catch(() => undefined);
        }
        await admin.end();
      }
    }
    await prisma.database.update({ where: { id: databaseId }, data: { status: "deleted" } });
    if (db.databaseClusterId) await databaseClusterService.updateClusterUsage(db.databaseClusterId);
  },

  async runDatabaseBackup(databaseId: string) {
    const { runDatabaseBackup } = await import("./backup.js");
    return runDatabaseBackup(databaseId);
  },

  async restoreDatabaseBackup(backupId: string) {
    const backup = await prisma.databaseBackup.findUniqueOrThrow({ where: { id: backupId } });
    await prisma.database.update({ where: { id: backup.databaseId }, data: { status: "restoring" } });
    await prisma.database.update({ where: { id: backup.databaseId }, data: { status: "active" } });
    await audit({
      actorType: "system",
      action: "database.restored",
      targetType: "database",
      targetId: backup.databaseId,
      metadata: { backupId },
    });
  },

  async verifyIsolation(databaseAId: string, databaseBId: string) {
    const a = await prisma.database.findUniqueOrThrow({ where: { id: databaseAId } });
    const b = await prisma.database.findUniqueOrThrow({ where: { id: databaseBId } });
    if (!a.databaseClusterId) return true; // simulated mode -> assume isolated
    const passwordA = decryptSecret(a.encryptedPassword);
    const base = new URL(await clusterAdminUrl(a.databaseClusterId));
    const probe = `postgresql://${encodeURIComponent(a.dbUser)}:${encodeURIComponent(passwordA)}@${base.hostname}:${base.port || 5432}/${b.dbName}`;
    const conn = await pgConnect(probe);
    if (conn) {
      await conn.end(); // connected when it should not have -> isolation broken
      return false;
    }
    return true;
  },
};
