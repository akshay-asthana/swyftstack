// Seed: platform admin, Starter + Pro plans (limits + features), the single
// local control-plane node, local infrastructure providers, and the default
// provisioning policies. Fully idempotent — re-running it NEVER creates
// duplicate local nodes (it dedupes and upserts by the stable `local-dev` key).
import { prisma } from "./db.js";
import { env, isProductionEnv } from "./env.js";
import { hashPassword, encryptSecret } from "./crypto.js";
import { PLAN_PRESETS } from "./constants.js";
import { PROVIDER_HELP_DOCS } from "./provider-help.js";
import { nodeDiscoveryService } from "./services/node-identity.js";

async function seedPlan(preset: (typeof PLAN_PRESETS)["starter"]) {
  const planFields = {
    name: preset.name,
    priceCents: preset.priceCents,
    description: preset.description,
    hasTrial: preset.hasTrial,
    trialPriceCents: preset.trialPriceCents,
    trialDays: preset.trialDays,
    trialRequiresPaymentMethod: preset.trialRequiresPaymentMethod,
  };
  const plan = await prisma.plan.upsert({
    where: { slug: preset.slug },
    update: planFields,
    create: { slug: preset.slug, ...planFields },
  });

  await prisma.planLimit.upsert({
    where: { planId: plan.id },
    update: { maxStorageBuckets: preset.limits.max_storage_buckets },
    create: {
      planId: plan.id,
      maxProjects: preset.limits.max_projects,
      maxDatabases: preset.limits.max_databases,
      maxStorageBuckets: preset.limits.max_storage_buckets,
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

  // §9 — resource toggles. Each plan explicitly enables/disables every
  // feature, so a plan can ship only DB, only static hosting, etc.
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

/** Idempotently seed one provisioning policy + its ordered targets (§7/§13). */
async function seedPolicy(
  resourceType: string,
  name: string,
  strategy: string,
  targets: { targetType: string; targetId: string }[],
) {
  const policy = await prisma.provisioningPolicy.upsert({
    where: { resourceType },
    update: { name, strategy },
    create: { resourceType, name, strategy, enabled: true },
  });
  let priority = 1;
  for (const t of targets) {
    await prisma.provisioningTarget.upsert({
      where: {
        policyId_targetType_targetId: {
          policyId: policy.id,
          targetType: t.targetType,
          targetId: t.targetId,
        },
      },
      update: {},
      create: {
        policyId: policy.id,
        targetType: t.targetType,
        targetId: t.targetId,
        priority: priority++,
        weight: 100,
        enabled: true,
      },
    });
  }
  return policy;
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

  // --- Local control-plane node (§1) ----------------------------------------
  // Backfill keys on any legacy rows, then register the ONE local node by its
  // stable `local-dev` key. Pre-existing duplicate local nodes are folded in.
  const backfilled = await nodeDiscoveryService.backfillNodeKeys();
  const local = await nodeDiscoveryService.registerLocalNode();
  const node = local.node;
  if (local.archivedDuplicates.length) {
    console.log(
      `  ⚠ archived ${local.archivedDuplicates.length} empty duplicate local node(s).`,
    );
  }
  for (const blocked of local.blockedDuplicates) {
    console.log(
      `  ⚠ duplicate local node "${blocked.name}" still has ${blocked.workloads} workload(s) — ` +
        `migrate them, then archive/delete it from the Nodes page.`,
    );
  }

  // --- DB-managed infrastructure providers (replaces customer infra env) ---
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
    update: { nodeId: node.id },
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

  let emailProvider = await prisma.emailProvider.findFirst({ where: { status: "active" } });
  if (env.ZEPTOMAIL_API_URL && env.ZEPTOMAIL_API_KEY) {
    const existing = await prisma.emailProvider.findFirst({ where: { name: "zeptomail-env-bootstrap" } });
    const data = {
      provider: "zeptomail",
      status: "active",
      fromEmail: env.ZEPTOMAIL_FROM_EMAIL || "no-reply@swyftstack.local",
      fromName: env.ZEPTOMAIL_FROM_NAME || "Swyftstack",
      apiUrl: env.ZEPTOMAIL_API_URL,
      encryptedApiKey: encryptSecret(env.ZEPTOMAIL_API_KEY),
    };
    await prisma.emailProvider.updateMany({ where: { name: { not: "zeptomail-env-bootstrap" } }, data: { status: "disabled" } });
    emailProvider = existing
      ? await prisma.emailProvider.update({ where: { id: existing.id }, data })
      : await prisma.emailProvider.create({ data: { name: "zeptomail-env-bootstrap", ...data } });
  } else if (!emailProvider && !isProductionEnv()) {
    emailProvider = await prisma.emailProvider.create({
      data: {
        name: "local-dev-email",
        provider: "local_dev",
        status: "active",
        fromEmail: "no-reply@swyftstack.local",
        fromName: "Swyftstack",
        apiUrl: "local_dev",
      },
    });
  }

  // --- Default provisioning policies (§7/§13) -------------------------------
  // New customer resources land here unless the admin reconfigures them.
  await seedPolicy("app", "Default app placement", "least_used", [
    { targetType: "node", targetId: node.id },
  ]);
  await seedPolicy("build", "Default build placement", "least_used", [
    { targetType: "node", targetId: node.id },
  ]);
  await seedPolicy("static", "Default static-site placement", "least_used", [
    { targetType: "node", targetId: node.id },
  ]);
  await seedPolicy("database", "Default database placement", "least_used", [
    { targetType: "database_cluster", targetId: cluster.id },
  ]);
  await seedPolicy("object_storage", "Default object storage", "manual_priority", [
    { targetType: "object_storage_provider", targetId: objStore.id },
  ]);
  await seedPolicy("backup", "Default backup storage", "manual_priority", [
    { targetType: "backup_storage_provider", targetId: backupStore.id },
  ]);

  // --- Storage/backup provider help docs ---
  for (const doc of PROVIDER_HELP_DOCS) {
    await prisma.providerHelpDoc.upsert({
      where: { slug: doc.slug },
      update: {
        providerKey: doc.providerKey,
        category: doc.category,
        title: doc.title,
        summary: doc.summary,
        sortOrder: doc.sortOrder,
        body: doc.body as object,
      },
      create: {
        slug: doc.slug,
        providerKey: doc.providerKey,
        category: doc.category,
        title: doc.title,
        summary: doc.summary,
        sortOrder: doc.sortOrder,
        body: doc.body as object,
      },
    });
  }

  console.log("Seed complete:");
  console.log("  admin             :", admin.email);
  console.log("  plans             :", starter.slug, pro.slug);
  console.log("  node              :", node.name, `(${node.nodeKey})`, local.created ? "created" : "updated");
  console.log("  node key backfill :", backfilled, "legacy node(s)");
  console.log("  db cluster        :", cluster.name);
  console.log("  object storage    :", objStore.name);
  console.log("  backup provider   :", backupStore.name, "(default)");
  console.log("  email provider    :", emailProvider?.name ?? "env/local fallback");
  console.log("  worker config     :", workerCfg.workerType);
  console.log("  provisioning      : app, build, static, database, object_storage, backup");
  console.log("  help docs         :", PROVIDER_HELP_DOCS.length, "provider guides");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
