// DatabaseClusterService — customer Postgres clusters are DB-managed, never a
// global CUSTOMER_PG_ADMIN_URL env var. Each cluster stores its admin
// connection string encrypted at rest.
import { prisma } from "../db.js";
import { encryptSecret, decryptSecret } from "../crypto.js";
import { audit } from "../audit.js";

type PgClient = { query: (sql: string) => Promise<unknown>; end: () => Promise<void> };

export async function pgConnect(connectionString: string): Promise<PgClient | null> {
  try {
    const { Client } = await import("pg");
    const client = new Client({ connectionString, connectionTimeoutMillis: 3000 });
    await client.connect();
    return client as unknown as PgClient;
  } catch {
    return null; // pg missing or server unreachable -> simulated mode
  }
}

/** Decrypted libpq URL for a cluster, optionally targeting a specific database. */
export async function clusterAdminUrl(clusterId: string, dbName?: string): Promise<string> {
  const cluster = await prisma.databaseCluster.findUniqueOrThrow({ where: { id: clusterId } });
  const url = new URL(decryptSecret(cluster.adminConnectionEncrypted));
  if (dbName) url.pathname = `/${dbName}`;
  return url.toString();
}

export interface ClusterCredentials {
  adminConnectionString: string; // full libpq URL with admin role
  host: string;
  port?: number;
  defaultDatabase?: string;
  sslRequired?: boolean;
}

export const databaseClusterService = {
  async listActiveClusters(region?: string) {
    return prisma.databaseCluster.findMany({
      where: { status: "active", ...(region ? { region } : {}) },
      orderBy: [{ currentStorageBytes: "asc" }, { currentDatabases: "asc" }],
    });
  },

  async testConnection(clusterId: string): Promise<{ ok: boolean; detail: string }> {
    const url = await clusterAdminUrl(clusterId);
    const conn = await pgConnect(url);
    if (!conn) return { ok: false, detail: "could not connect (pg unavailable or unreachable)" };
    try {
      await conn.query("SELECT 1");
      await conn.end();
      await audit({
        actorType: "admin",
        action: "database_cluster.test_ok",
        targetType: "database_cluster",
        targetId: clusterId,
      });
      return { ok: true, detail: "connection successful" };
    } catch (e) {
      await conn.end().catch(() => undefined);
      return { ok: false, detail: String(e) };
    }
  },

  /**
   * Pick a cluster for a project. Excludes disabled/full/degraded unless
   * `allowOverride`. Region preference falls back to any region.
   */
  async selectClusterForProject(
    projectId: string,
    opts: { region?: string; allowOverride?: boolean } = {},
  ) {
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const region = opts.region ?? project.region ?? undefined;

    const where = opts.allowOverride
      ? {}
      : { status: "active" as const };

    const all = await prisma.databaseCluster.findMany({ where });
    const usable = all.filter((c) => {
      if (opts.allowOverride) return true;
      if (c.status !== "active") return false;
      if (c.maxDatabases != null && c.currentDatabases >= c.maxDatabases) return false;
      if (c.maxStorageBytes != null && c.currentStorageBytes >= c.maxStorageBytes) return false;
      return true;
    });
    if (usable.length === 0) return null;

    // Prefer same region, then least storage, then fewest databases.
    usable.sort((a, b) => {
      const ra = a.region === region ? 0 : 1;
      const rb = b.region === region ? 0 : 1;
      if (ra !== rb) return ra - rb;
      if (a.currentStorageBytes !== b.currentStorageBytes) {
        return Number(a.currentStorageBytes - b.currentStorageBytes);
      }
      return a.currentDatabases - b.currentDatabases;
    });
    return usable[0];
  },

  /** Recompute usage counters from the databases that reference this cluster. */
  async updateClusterUsage(clusterId: string) {
    const dbs = await prisma.database.findMany({
      where: { databaseClusterId: clusterId, status: { not: "deleted" } },
      select: { currentSizeBytes: true },
    });
    const totalBytes = dbs.reduce((s, d) => s + d.currentSizeBytes, BigInt(0));
    const cluster = await prisma.databaseCluster.update({
      where: { id: clusterId },
      data: { currentDatabases: dbs.length, currentStorageBytes: totalBytes },
    });
    // Auto-flag a cluster as full when it hits its ceiling.
    if (
      cluster.status === "active" &&
      ((cluster.maxDatabases != null && cluster.currentDatabases >= cluster.maxDatabases) ||
        (cluster.maxStorageBytes != null && cluster.currentStorageBytes >= cluster.maxStorageBytes))
    ) {
      await prisma.databaseCluster.update({ where: { id: clusterId }, data: { status: "full" } });
    }
    return cluster;
  },

  /** Helper used by the admin API to register a new cluster (encrypts creds). */
  async createCluster(input: {
    name: string;
    adminConnectionString: string;
    host: string;
    port?: number;
    defaultDatabase?: string;
    sslRequired?: boolean;
    region?: string;
    maxDatabases?: number | null;
    maxStorageBytes?: number | null;
    providerId?: string | null;
    nodeId?: string | null;
    engineVersion?: string;
  }) {
    return prisma.databaseCluster.create({
      data: {
        name: input.name,
        adminConnectionEncrypted: encryptSecret(input.adminConnectionString),
        host: input.host,
        port: input.port ?? 5432,
        defaultDatabase: input.defaultDatabase ?? "postgres",
        sslRequired: input.sslRequired ?? false,
        region: input.region,
        maxDatabases: input.maxDatabases ?? null,
        maxStorageBytes: input.maxStorageBytes != null ? BigInt(input.maxStorageBytes) : null,
        providerId: input.providerId ?? null,
        nodeId: input.nodeId ?? null,
        engineVersion: input.engineVersion,
        status: "active",
      },
    });
  },
};
