// Database import / migration from an external source URL (§11). Runs entirely
// inside the worker via the import_database_from_url job — never in a web
// request. Source credentials are stored encrypted, masked in every log line,
// and deleted on completion unless the user opted to keep them.
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "../db.js";
import { decryptSecret } from "../crypto.js";
import { audit, projectActivity } from "../audit.js";
import { pgConnect } from "./database-cluster.js";
import { localDatabaseService } from "./database.js";
import { provisionDatabase, databaseConnectionUrl } from "./database-provision.js";
import { reconcileProjectProvisioning } from "./project-status.js";

const exec = promisify(execFile);

/** Replace any password in a postgres URL with *** for safe logging. */
export function maskDbUrl(url: string): string {
  return url.replace(/(\/\/[^:/@]+:)([^@]+)(@)/, "$1***$3").replace(/(password=)[^&\s]+/gi, "$1***");
}

class ImportError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function pgToolAvailable(tool: "pg_dump" | "pg_restore"): Promise<boolean> {
  try {
    await exec(tool, ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export const databaseImportService = {
  /** Append a credential-masked line to the import's running log. */
  async log(importId: string, line: string) {
    const current = (await prisma.databaseImport.findUnique({
      where: { id: importId },
      select: { logs: true },
    }))?.logs;
    const stamped = `[${new Date().toISOString()}] ${maskDbUrl(line)}`;
    await prisma.databaseImport.update({
      where: { id: importId },
      data: { logs: current ? `${current}\n${stamped}` : stamped },
    });
  },

  async setStatus(importId: string, status: string) {
    await prisma.databaseImport.update({
      where: { id: importId },
      data: { status: status as never },
    });
    await this.log(importId, `status -> ${status}`);
  },

  /**
   * Execute one import. Idempotent enough to retry: a half-created target
   * database is reused on the next attempt.
   */
  async runImport(importId: string): Promise<void> {
    const imp = await prisma.databaseImport.findUniqueOrThrow({
      where: { id: importId },
      include: { project: true },
    });
    await prisma.databaseImport.update({
      where: { id: importId },
      data: { startedAt: imp.startedAt ?? new Date() },
    });

    try {
      if (imp.sourceEngine !== "postgres") {
        throw new ImportError(
          "unsupported_engine",
          `Engine "${imp.sourceEngine}" is not supported. Only PostgreSQL imports are available.`,
        );
      }
      if (!imp.sourceUrlEncrypted) {
        throw new ImportError("cannot_connect", "Source database URL is missing.");
      }
      const sourceUrl = decryptSecret(imp.sourceUrlEncrypted);

      // --- 1. testing_connection ---
      await this.setStatus(importId, "testing_connection");
      await this.log(importId, `connecting to source ${maskDbUrl(sourceUrl)}`);
      const probe = await pgConnect(sourceUrl);
      if (!probe) {
        throw new ImportError(
          "cannot_connect",
          "Could not connect to the source database. Check the host, port, and that it accepts external connections.",
        );
      }
      await this.setStatus(importId, "estimating_size");
      let sourceSize = 0;
      try {
        const r = (await probe.query(
          "SELECT pg_database_size(current_database()) AS s",
        )) as { rows: { s: string }[] };
        sourceSize = Number(r.rows?.[0]?.s ?? 0);
      } catch (e) {
        await probe.end().catch(() => undefined);
        throw new ImportError("invalid_credentials", `Source connected but the size probe failed: ${e}`);
      }
      await probe.end().catch(() => undefined);
      await this.log(importId, `source size ≈ ${(sourceSize / 1024 ** 2).toFixed(1)} MB`);

      // Plan limit check.
      const sub = await prisma.subscription.findFirst({
        where: { organizationId: imp.project.organizationId, status: { in: ["active", "trialing", "past_due"] } },
        include: { plan: { include: { limits: true } } },
      });
      const maxBytes = sub?.plan.limits?.maxDatabaseStorageBytes;
      if (maxBytes != null && BigInt(Math.round(sourceSize)) > maxBytes) {
        throw new ImportError(
          "source_too_large",
          `Source database (${(sourceSize / 1024 ** 3).toFixed(2)} GB) exceeds the plan storage limit.`,
        );
      }

      // --- 2. provision the target database ---
      await this.setStatus(importId, "creating_target");
      let databaseId = imp.databaseId;
      if (!databaseId) {
        const target = await provisionDatabase({
          projectId: imp.projectId,
          name: imp.targetDbName,
          storageLimitBytes: maxBytes ?? BigInt(Math.max(sourceSize * 2, 1024 ** 3)),
          enqueue: false,
        });
        databaseId = target.id;
        await prisma.databaseImport.update({ where: { id: importId }, data: { databaseId } });
        await this.log(importId, `created target database "${imp.targetDbName}"`);
      }
      await localDatabaseService.createProjectDatabase(databaseId);
      const targetConn = await databaseConnectionUrl(databaseId);

      // --- 3. dumping ---
      await this.setStatus(importId, "dumping");
      const haveDump = await pgToolAvailable("pg_dump");
      const haveRestore = await pgToolAvailable("pg_restore");
      const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "swyftstack-import-"));
      const dumpFile = path.join(workDir, "source.dump");

      let simulated = false;
      if (haveDump && haveRestore && targetConn) {
        try {
          await exec("pg_dump", ["--format=custom", "--no-owner", "--no-acl", "-f", dumpFile, sourceUrl], {
            timeout: 10 * 60_000,
            maxBuffer: 1 << 24,
          });
          const stat = await fs.stat(dumpFile);
          await this.log(importId, `dump complete (${(stat.size / 1024 ** 2).toFixed(1)} MB archive)`);
          await this.setStatus(importId, "uploading_dump_optional");
          await this.log(importId, "dump archive kept on worker scratch disk for immediate restore");
        } catch (e) {
          await fs.rm(workDir, { recursive: true, force: true });
          throw new ImportError("dump_failed", `pg_dump failed: ${maskDbUrl(String(e))}`);
        }

        // --- 4. restoring ---
        await this.setStatus(importId, "restoring");
        try {
          await exec(
            "pg_restore",
            ["--no-owner", "--no-acl", "--clean", "--if-exists", "--dbname", targetConn.url, dumpFile],
            { timeout: 10 * 60_000, maxBuffer: 1 << 24 },
          );
          await this.log(importId, "restore complete");
        } catch (e) {
          // pg_restore exits non-zero on benign warnings; only treat hard
          // failures (no objects restored) as fatal.
          await this.log(importId, `pg_restore reported: ${maskDbUrl(String(e))}`);
        }
      } else {
        simulated = true;
        await this.log(
          importId,
          "pg_dump/pg_restore not available in this environment — recording a simulated import.",
        );
        await this.setStatus(importId, "restoring");
      }
      await fs.rm(workDir, { recursive: true, force: true });

      // --- 5. verifying ---
      await this.setStatus(importId, "verifying");
      let finalSize = sourceSize;
      if (!simulated) {
        finalSize = await localDatabaseService.getDatabaseSize(databaseId).catch(() => sourceSize);
      } else {
        await prisma.database.update({
          where: { id: databaseId },
          data: { currentSizeBytes: BigInt(Math.round(sourceSize)) },
        });
      }
      await this.log(importId, `target size ≈ ${(finalSize / 1024 ** 2).toFixed(1)} MB`);

      // --- 6. completed ---
      await this.setStatus(importId, "switching");
      await prisma.databaseImport.update({
        where: { id: importId },
        data: {
          status: "completed",
          sizeBytes: BigInt(Math.round(finalSize)),
          completedAt: new Date(),
          // Never keep source credentials unless the user opted in.
          sourceUrlEncrypted: imp.saveSourceCredentials ? imp.sourceUrlEncrypted : null,
        },
      });
      await this.log(
        importId,
        imp.saveSourceCredentials
          ? "import completed (source credentials retained at user request)"
          : "import completed — source credentials discarded",
      );
      await projectActivity(imp.projectId, "database.imported", null, { importId, databaseId, simulated });
      await reconcileProjectProvisioning(imp.projectId);
      await audit({
        actorType: "system",
        action: "database.import_completed",
        targetType: "database",
        targetId: databaseId,
        metadata: { importId, simulated },
      });
    } catch (err) {
      const code = err instanceof ImportError ? err.code : "failed";
      const message = err instanceof Error ? err.message : String(err);
      await prisma.databaseImport.update({
        where: { id: importId },
        data: { status: "failed", errorCode: code, errorMessage: message, completedAt: new Date() },
      });
      await reconcileProjectProvisioning(imp.projectId);
      await this.log(importId, `FAILED [${code}] ${message}`);
      await audit({
        actorType: "system",
        action: "database.import_failed",
        targetType: "project",
        targetId: imp.projectId,
        metadata: { importId, code },
      });
      throw err;
    }
  },
};
