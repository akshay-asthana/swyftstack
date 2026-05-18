// DB-backed usage rollups + limit enforcement. Aggregates usage_events into the
// current open usage_period rollups, then applies the 80/100/110 state machine
// against effective limits (plan + overrides).
import { prisma } from "./db.js";
import { audit } from "./audit.js";
import { evaluateUsage } from "./usage.js";
import { resolveLimit, type LimitOverrideInput } from "./limits.js";
import { enqueueJob } from "./jobs/index.js";

/** usage_type -> the limit key it is metered against. */
const USAGE_LIMIT_MAP: Record<string, string> = {
  app_runtime_vcpu_seconds: "max_vcpu_seconds",
  build_vcpu_seconds: "max_vcpu_seconds",
  database_storage_bytes: "max_database_storage_bytes",
  object_storage_bytes: "max_object_storage_bytes",
  object_egress_bytes: "max_egress_bytes",
  app_egress_bytes: "max_egress_bytes",
};

async function ensureOpenPeriod(organizationId: string) {
  const now = new Date();
  const existing = await prisma.usagePeriod.findFirst({
    where: { organizationId, status: "open", periodEnd: { gt: now } },
  });
  if (existing) return existing;
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return prisma.usagePeriod.create({
    data: { organizationId, periodStart: start, periodEnd: end, status: "open" },
  });
}

export async function rollUpUsage(): Promise<{ organizations: number }> {
  const orgs = await prisma.organization.findMany({ where: { status: "active" } });
  for (const org of orgs) {
    const period = await ensureOpenPeriod(org.id);
    const grouped = await prisma.usageEvent.groupBy({
      by: ["usageType"],
      where: { organizationId: org.id, recordedAt: { gte: period.periodStart, lt: period.periodEnd } },
      _sum: { quantity: true },
    });
    for (const g of grouped) {
      const qty = g._sum.quantity ?? BigInt(0);
      await prisma.usageRollup.upsert({
        where: {
          organizationId_projectId_usagePeriodId_usageType: {
            organizationId: org.id,
            projectId: null as unknown as string,
            usagePeriodId: period.id,
            usageType: g.usageType,
          },
        },
        update: { quantity: qty },
        create: {
          organizationId: org.id,
          usagePeriodId: period.id,
          usageType: g.usageType,
          quantity: qty,
          unit: "mixed",
        },
      });
    }
  }
  return { organizations: orgs.length };
}

export async function enforceLimits(): Promise<{ checked: number; actions: number }> {
  const orgs = await prisma.organization.findMany({
    where: { status: "active" },
    include: {
      subscriptions: { include: { plan: { include: { limits: true } } } },
      projects: true,
    },
  });
  const overrides = (await prisma.limitOverride.findMany()) as unknown as LimitOverrideInput[];
  let actions = 0;

  for (const org of orgs) {
    const plan = org.subscriptions[0]?.plan;
    if (!plan?.limits) continue;
    const period = await prisma.usagePeriod.findFirst({
      where: { organizationId: org.id, status: "open" },
      orderBy: { periodStart: "desc" },
    });
    if (!period) continue;
    const rollups = await prisma.usageRollup.findMany({
      where: { organizationId: org.id, usagePeriodId: period.id },
    });

    for (const r of rollups) {
      const limitKey = USAGE_LIMIT_MAP[r.usageType];
      if (!limitKey) continue;
      const planDefault = (plan.limits as unknown as Record<string, bigint | null>)[
        limitKeyToField(limitKey)
      ];
      const effective = resolveLimit(limitKey, planDefault ?? null, overrides, {
        organizationId: org.id,
      });
      const result = evaluateUsage(r.quantity, effective);
      if (result.state === "ok") continue;

      actions++;
      await audit({
        actorType: "system",
        action: `usage.${result.state}`,
        targetType: "organization",
        targetId: org.id,
        metadata: { usageType: r.usageType, ratio: result.ratio, limit: effective },
      });

      if (result.suspendRuntime) {
        for (const p of org.projects.filter((p) => p.status === "active")) {
          await prisma.project.update({ where: { id: p.id }, data: { status: "over_limit" } });
          await enqueueJob("suspend_project", { projectId: p.id });
        }
      }
    }
  }
  return { checked: orgs.length, actions };
}

function limitKeyToField(key: string): string {
  // snake_case limit key -> Prisma camelCase field on plan_limits.
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
