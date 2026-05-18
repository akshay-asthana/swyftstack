import {
  prisma,
  enqueueJob,
  encryptSecret,
  randomSecret,
  deriveDbNames,
  resolveLimit,
  wouldExceed,
  audit,
  databaseClusterService,
  type LimitOverrideInput,
} from "quickdock-shared";
import { authorize, json } from "@/lib/api";

// Provision an isolated project database (validates plan limits first).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      organization: { include: { subscriptions: { include: { plan: { include: { limits: true } } } } } },
      databases: true,
    },
  });
  if (!project) return json({ error: "project not found" }, { status: 404 });

  const plan = project.organization.subscriptions[0]?.plan;
  const overrides = (await prisma.limitOverride.findMany()) as unknown as LimitOverrideInput[];

  const maxDbs = resolveLimit("max_databases", plan?.limits?.maxDatabases ?? 1, overrides, {
    organizationId: project.organizationId,
    projectId: project.id,
  });
  if (wouldExceed(project.databases.length, 1, maxDbs)) {
    return json({ error: "database limit reached", limit: maxDbs }, { status: 409 });
  }

  const storageLimit =
    resolveLimit("max_database_storage_bytes", plan?.limits?.maxDatabaseStorageBytes ?? null, overrides, {
      organizationId: project.organizationId,
      projectId: project.id,
    }) ?? 5 * 1024 ** 3;

  // Pick a customer DB cluster from the DB-managed registry — never a global
  // CUSTOMER_PG_ADMIN_URL. `allowOverride` lets an admin force-place onto a
  // non-ideal cluster when none are cleanly available.
  const allowOverride = new URL(req.url).searchParams.get("allowOverride") === "1";
  const cluster = await databaseClusterService.selectClusterForProject(project.id, { allowOverride });
  if (!cluster) {
    return json(
      { error: "no available database cluster (all disabled/full/degraded)" },
      { status: 503 },
    );
  }

  const { dbName, dbUser } = deriveDbNames(project.id);
  const password = randomSecret(18);

  const db = await prisma.database.create({
    data: {
      projectId: project.id,
      nodeId: cluster.nodeId,
      databaseClusterId: cluster.id,
      name: `${project.slug}-db-${project.databases.length + 1}`,
      dbName,
      dbUser,
      encryptedPassword: encryptSecret(password),
      storageLimitBytes: BigInt(storageLimit),
      status: "provisioning",
    },
  });
  await databaseClusterService.updateClusterUsage(cluster.id);
  const jobId = await enqueueJob("create_database", { databaseId: db.id }, { priority: 40 });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "database.create_requested",
    targetType: "database",
    targetId: db.id,
  });
  return json({ database: db, jobId }, { status: 201 });
}
