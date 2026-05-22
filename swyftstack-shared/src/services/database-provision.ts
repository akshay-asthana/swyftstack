// Shared database-provisioning helper. Used by the admin API, the user
// dashboard "Create Database" flow (§10) and the import flow (§11) so the
// cluster-selection + naming + credential logic lives in exactly one place.
import { prisma, type Database } from "../db.js";
import { encryptSecret, decryptSecret, randomSecret } from "../crypto.js";
import { deriveDbNames } from "../dbsql.js";
import { enqueueJob } from "../jobs/index.js";
import { databaseClusterService } from "./database-cluster.js";
import { provisioningPolicyService } from "./provisioning-policy.js";

/**
 * Pick the database cluster for a new database. Placement flows through the
 * admin-configured provisioning policy (§7/§10); when no policy/healthy target
 * exists it falls back to the least-loaded active cluster.
 */
async function selectDatabaseCluster(projectId: string) {
  const decision = await provisioningPolicyService.selectTarget("database");
  if (decision.chosen && decision.chosen.targetType === "database_cluster") {
    const cluster = await prisma.databaseCluster.findUnique({
      where: { id: decision.chosen.targetId },
    });
    if (cluster && cluster.status === "active") return cluster;
  }
  return databaseClusterService.selectClusterForProject(projectId);
}

const GB = BigInt(1024) ** BigInt(3);

export class NoClusterAvailableError extends Error {
  constructor() {
    super("No active database cluster has capacity for a new database.");
    this.name = "NoClusterAvailableError";
  }
}

export class DatabaseLimitReachedError extends Error {
  constructor(limit: number) {
    super(`This plan allows at most ${limit} database(s).`);
    this.name = "DatabaseLimitReachedError";
  }
}

export interface ProvisionDatabaseInput {
  projectId: string;
  name: string;
  engine?: string;
  storageLimitBytes?: bigint;
  connectionLimit?: number;
  sslMode?: string;
  /** When false, the caller provisions inline (used by the import job). */
  enqueue?: boolean;
}

/**
 * Create a Database row, assign it a cluster, and (by default) enqueue the
 * create_database job that actually provisions it on the cluster.
 */
export async function provisionDatabase(input: ProvisionDatabaseInput): Promise<Database> {
  const cluster = await selectDatabaseCluster(input.projectId);
  if (!cluster) throw new NoClusterAvailableError();

  const { dbName, dbUser } = deriveDbNames(input.projectId);
  const password = randomSecret(20);

  const database = await prisma.database.create({
    data: {
      projectId: input.projectId,
      nodeId: cluster.nodeId,
      databaseClusterId: cluster.id,
      name: input.name,
      engine: input.engine ?? "postgres",
      engineVersion: cluster.engineVersion,
      status: "provisioning",
      dbName,
      dbUser,
      encryptedPassword: encryptSecret(password),
      storageLimitBytes: input.storageLimitBytes ?? GB,
      connectionLimit: input.connectionLimit ?? 10,
      sslMode: input.sslMode ?? (cluster.sslRequired ? "require" : "prefer"),
    },
  });

  if (input.enqueue !== false) {
    await enqueueJob("create_database", { databaseId: database.id });
  }
  return database;
}

/** Throw DatabaseLimitReachedError when the org is at its plan's max_databases. */
export async function assertDatabaseLimit(organizationId: string): Promise<void> {
  const sub = await prisma.subscription.findFirst({
    where: { organizationId, status: { in: ["active", "trialing", "past_due"] } },
    orderBy: { createdAt: "desc" },
    include: { plan: { include: { limits: true } } },
  });
  const planMax = sub?.plan.limits?.maxDatabases ?? null;

  const override = await prisma.limitOverride.findFirst({
    where: { scopeType: "organization", scopeId: organizationId, limitKey: "max_databases" },
  });
  const max = override?.limitValue != null ? Number(override.limitValue) : planMax;
  if (max == null) return; // unlimited

  const count = await prisma.database.count({
    where: { project: { organizationId }, status: { not: "deleted" } },
  });
  if (count >= max) throw new DatabaseLimitReachedError(max);
}

/**
 * Build the customer-facing connection URL for a database. host/port come from
 * the assigned cluster; the password is decrypted from storage.
 */
export async function databaseConnectionUrl(databaseId: string): Promise<{
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: string;
  url: string;
} | null> {
  const db = await prisma.database.findUnique({
    where: { id: databaseId },
    include: { cluster: true },
  });
  if (!db || !db.cluster) return null;
  const password = decryptSecret(db.encryptedPassword);
  const host = db.cluster.host;
  const port = db.cluster.port;
  const url =
    `postgresql://${encodeURIComponent(db.dbUser)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${db.dbName}?sslmode=${db.sslMode}`;
  return { host, port, database: db.dbName, username: db.dbUser, password, sslMode: db.sslMode, url };
}
