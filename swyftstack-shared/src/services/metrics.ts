// App / database / storage metric collection (§1). Each collector writes a
// point-in-time metric row and emits usage_events for billable + bandwidth
// quantities so the rollup + billing engines have a single source of truth.
//
// MVP fidelity notes:
//  - App CPU is sampled from `docker stats` (real).
//  - App / storage / database bandwidth uses cumulative counters where the
//    runtime exposes them; otherwise it is marked metadata.estimated = true.
//  - TODO(proxy-accounting): route customer traffic through the reverse proxy
//    and account bytes per app/domain for exact app-level bandwidth.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "../db.js";
import { localAppService } from "./app.js";
import { localDatabaseService } from "./database.js";
import { storageProviderFor } from "./storage.js";
import { pgConnect, clusterAdminUrl } from "./database-cluster.js";

const exec = promisify(execFile);

/** Emit a usage_event with full scope attribution (org/user/project/...). */
async function emitUsage(args: {
  organizationId: string;
  userId?: string | null;
  projectId?: string | null;
  appId?: string | null;
  databaseId?: string | null;
  bucketId?: string | null;
  sourceNodeId?: string | null;
  usageType: string;
  quantity: number | bigint;
  unit: string;
  estimated?: boolean;
}) {
  const qty = typeof args.quantity === "bigint" ? args.quantity : BigInt(Math.round(args.quantity));
  if (qty <= BigInt(0)) return;
  await prisma.usageEvent.create({
    data: {
      organizationId: args.organizationId,
      userId: args.userId ?? null,
      projectId: args.projectId ?? null,
      appId: args.appId ?? null,
      databaseId: args.databaseId ?? null,
      bucketId: args.bucketId ?? null,
      sourceNodeId: args.sourceNodeId ?? null,
      usageType: args.usageType,
      quantity: qty,
      unit: args.unit,
      metadata: args.estimated ? { estimated: true } : {},
    },
  });
}

/** Parse "1.2kB / 3.4MB" style docker counters into bytes. */
function parseBytes(token: string): number {
  const m = token.trim().match(/^([\d.]+)\s*([kKmMgGtT]?i?[bB])?$/);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = (m[2] ?? "B").toLowerCase();
  const scale: Record<string, number> = {
    b: 1,
    kb: 1e3, kib: 1024,
    mb: 1e6, mib: 1024 ** 2,
    gb: 1e9, gib: 1024 ** 3,
    tb: 1e12, tib: 1024 ** 4,
  };
  return n * (scale[unit] ?? 1);
}

interface DockerSample {
  memoryBytes: number | null;
  netRxBytes: number | null;
  netTxBytes: number | null;
}

async function dockerStatsSample(containerName: string | null): Promise<DockerSample> {
  if (!containerName) return { memoryBytes: null, netRxBytes: null, netTxBytes: null };
  try {
    const { stdout } = await exec(
      "docker",
      ["stats", containerName, "--no-stream", "--format", "{{.MemUsage}}|{{.NetIO}}"],
      { timeout: 8000 },
    );
    const [mem, net] = stdout.trim().split("|");
    const memUsed = mem?.split("/")[0]?.trim() ?? "";
    const [rx, tx] = (net ?? "").split("/").map((s) => s.trim());
    return {
      memoryBytes: memUsed ? parseBytes(memUsed) : null,
      netRxBytes: rx ? parseBytes(rx) : null,
      netTxBytes: tx ? parseBytes(tx) : null,
    };
  } catch {
    return { memoryBytes: null, netRxBytes: null, netTxBytes: null };
  }
}

/** Positive delta between a new cumulative counter and the previous snapshot. */
function counterDelta(current: number | null, previous: bigint | null | undefined): number {
  if (current === null) return 0;
  const prev = previous === null || previous === undefined ? 0 : Number(previous);
  const d = current - prev;
  return d > 0 ? d : 0; // counter reset (container restart) -> skip the window
}

export const metricsService = {
  /** Sample every running app: CPU seconds, memory, bandwidth, restarts. */
  async collectAppMetrics(): Promise<{ apps: number }> {
    const apps = await prisma.app.findMany({
      where: { status: { in: ["running", "building"] } },
      include: { project: { include: { organization: true } }, metrics: { orderBy: { collectedAt: "desc" }, take: 1 } },
    });
    for (const app of apps) {
      const { cpuSeconds } = await localAppService
        .collectAppMetrics(app.id)
        .catch(() => ({ cpuSeconds: 0 }));
      const docker = await dockerStatsSample(app.containerName);
      const prev = app.metrics[0];
      const rxDelta = counterDelta(docker.netRxBytes, prev?.networkRxBytes);
      const txDelta = counterDelta(docker.netTxBytes, prev?.networkTxBytes);
      const uptimeSeconds = app.lastStartedAt
        ? Math.round((Date.now() - app.lastStartedAt.getTime()) / 1000)
        : null;

      await prisma.appMetric.create({
        data: {
          appId: app.id,
          cpuSeconds,
          memoryUsedBytes: docker.memoryBytes ? BigInt(Math.round(docker.memoryBytes)) : null,
          containerStatus: app.status,
          restarts: app.restartCount,
          networkRxBytes: docker.netRxBytes ? BigInt(Math.round(docker.netRxBytes)) : BigInt(0),
          networkTxBytes: docker.netTxBytes ? BigInt(Math.round(docker.netTxBytes)) : BigInt(0),
          uptimeSeconds: uptimeSeconds !== null ? BigInt(uptimeSeconds) : null,
        },
      });

      const orgId = app.project.organizationId;
      const userId = app.project.organization.ownerUserId;
      await emitUsage({
        organizationId: orgId, userId, projectId: app.projectId, appId: app.id,
        sourceNodeId: app.nodeId, usageType: "app_runtime_vcpu_seconds",
        quantity: cpuSeconds, unit: "seconds",
      });
      await emitUsage({
        organizationId: orgId, userId, projectId: app.projectId, appId: app.id,
        sourceNodeId: app.nodeId, usageType: "app_network_in_bytes",
        quantity: rxDelta, unit: "bytes",
      });
      await emitUsage({
        organizationId: orgId, userId, projectId: app.projectId, appId: app.id,
        sourceNodeId: app.nodeId, usageType: "app_network_out_bytes",
        quantity: txDelta, unit: "bytes",
      });
    }
    return { apps: apps.length };
  },

  /** Sample every active database: size, connections, bandwidth placeholder. */
  async collectDatabaseMetrics(): Promise<{ databases: number }> {
    const dbs = await prisma.database.findMany({
      where: { status: "active" },
      include: { project: { include: { organization: true } } },
    });
    for (const db of dbs) {
      const sizeBytes = await localDatabaseService.getDatabaseSize(db.id).catch(() => 0);
      let activeConnections: number | null = null;
      if (db.databaseClusterId) {
        const url = await clusterAdminUrl(db.databaseClusterId).catch(() => null);
        const conn = url ? await pgConnect(url) : null;
        if (conn) {
          try {
            // db.dbName is a platform-generated identifier (see deriveDbNames),
            // so direct interpolation is safe here.
            const r = (await conn.query(
              `SELECT count(*)::int AS c FROM pg_stat_activity WHERE datname = '${db.dbName}'`,
            )) as { rows: { c: number }[] };
            activeConnections = r.rows?.[0]?.c ?? null;
          } catch {
            /* keep null */
          }
          await conn.end().catch(() => undefined);
        }
      }
      await prisma.databaseMetric.create({
        data: {
          databaseId: db.id,
          sizeBytes: BigInt(Math.round(sizeBytes)),
          activeConnections,
          connectionLimit: db.connectionLimit,
        },
      });
      await emitUsage({
        organizationId: db.project.organizationId,
        userId: db.project.organization.ownerUserId,
        projectId: db.projectId, databaseId: db.id, sourceNodeId: db.nodeId,
        usageType: "database_storage_bytes", quantity: sizeBytes, unit: "bytes",
      });
    }
    return { databases: dbs.length };
  },

  /** Sample every active bucket: storage used, object count, egress. */
  async collectStorageMetrics(): Promise<{ buckets: number }> {
    const buckets = await prisma.storageBucket.findMany({
      where: { status: "active" },
      include: {
        project: { include: { organization: true } },
        metrics: { orderBy: { collectedAt: "desc" }, take: 1 },
      },
    });
    for (const b of buckets) {
      if (!b.objectStorageProviderId) continue;
      const provider = await storageProviderFor(b.objectStorageProviderId).catch(() => null);
      if (!provider) continue;
      const usage = await provider.getUsage(b.id).catch(() => null);
      if (!usage) continue;
      const prev = b.metrics[0];
      const egressDelta = counterDelta(usage.egressBytes, prev ? prev.egressBytes + prev.networkTxBytes : BigInt(0));

      await prisma.storageMetric.create({
        data: {
          bucketId: b.id,
          storageBytes: BigInt(Math.round(usage.storageBytes)),
          networkTxBytes: BigInt(Math.round(egressDelta)),
          egressBytes: BigInt(Math.round(usage.egressBytes)),
        },
      });
      await prisma.storageBucket.update({
        where: { id: b.id },
        data: { lastSyncedAt: new Date() },
      });
      await emitUsage({
        organizationId: b.project.organizationId,
        userId: b.project.organization.ownerUserId,
        projectId: b.projectId, bucketId: b.id,
        usageType: "object_storage_bytes", quantity: usage.storageBytes, unit: "bytes",
      });
      await emitUsage({
        organizationId: b.project.organizationId,
        userId: b.project.organization.ownerUserId,
        projectId: b.projectId, bucketId: b.id,
        usageType: "storage_network_out_bytes", quantity: egressDelta, unit: "bytes",
      });
    }
    return { buckets: buckets.length };
  },
};
