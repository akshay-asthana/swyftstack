// ProvisioningPolicyService (§7 / §11) — decides WHERE a new customer resource
// is provisioned. Replaces hardcoded "first active cluster / first app node"
// logic: every placement now flows through an admin-configured policy.
import { prisma } from "../db.js";
import {
  RESOURCE_TARGET_KIND,
  type ProvisioningResourceType,
  type ProvisioningTargetType,
} from "../constants.js";

export interface ResolvedTarget {
  id: string; // provisioning_targets row id
  targetType: ProvisioningTargetType;
  targetId: string; // node / cluster / provider id
  name: string;
  priority: number;
  weight: number;
  enabled: boolean;
  healthy: boolean;
  /** 0-100, or null when the target does not report usage. */
  usagePercent: number | null;
  maxUsagePercent: number | null;
  note: string;
}

export interface ProvisioningDecision {
  resourceType: ProvisioningResourceType;
  strategy: string;
  policyEnabled: boolean;
  chosen: ResolvedTarget | null;
  candidates: ResolvedTarget[];
  reason: string;
}

type PolicyTargetRow = {
  id: string;
  targetType: string;
  targetId: string;
  priority: number;
  weight: number;
  enabled: boolean;
  maxUsagePercent: number | null;
};

type PolicyWithTargets = {
  resourceType: string;
  strategy: string;
  enabled: boolean;
  targets: PolicyTargetRow[];
};

/** Inspect the live health + usage of a single provisioning target. */
async function inspectTarget(
  targetType: ProvisioningTargetType,
  targetId: string,
): Promise<{ name: string; healthy: boolean; usagePercent: number | null; note: string }> {
  if (targetType === "node") {
    const node = await prisma.node.findUnique({
      where: { id: targetId },
      include: { metrics: { orderBy: { collectedAt: "desc" }, take: 1 } },
    });
    if (!node) return { name: "(missing node)", healthy: false, usagePercent: null, note: "not found" };
    const m = node.metrics[0];
    const usagePercent =
      m?.ramTotalBytes && Number(m.ramTotalBytes) > 0
        ? (Number(m.ramUsedBytes ?? 0) / Number(m.ramTotalBytes)) * 100
        : null;
    return {
      name: node.name,
      healthy: node.status === "active",
      usagePercent,
      note: `status ${node.status}`,
    };
  }
  if (targetType === "database_cluster") {
    const c = await prisma.databaseCluster.findUnique({ where: { id: targetId } });
    if (!c) return { name: "(missing cluster)", healthy: false, usagePercent: null, note: "not found" };
    const usagePercent =
      c.maxStorageBytes && Number(c.maxStorageBytes) > 0
        ? (Number(c.currentStorageBytes) / Number(c.maxStorageBytes)) * 100
        : c.maxDatabases && c.maxDatabases > 0
          ? (c.currentDatabases / c.maxDatabases) * 100
          : null;
    return {
      name: c.name,
      healthy: c.status === "active",
      usagePercent,
      note: `status ${c.status}`,
    };
  }
  if (targetType === "object_storage_provider") {
    const p = await prisma.objectStorageProvider.findUnique({ where: { id: targetId } });
    if (!p) return { name: "(missing provider)", healthy: false, usagePercent: null, note: "not found" };
    const usagePercent =
      p.maxStorageBytes && Number(p.maxStorageBytes) > 0
        ? (Number(p.currentStorageBytes) / Number(p.maxStorageBytes)) * 100
        : null;
    return { name: p.name, healthy: p.status === "active", usagePercent, note: `status ${p.status}` };
  }
  // backup_storage_provider
  const p = await prisma.backupStorageProvider.findUnique({ where: { id: targetId } });
  if (!p) return { name: "(missing provider)", healthy: false, usagePercent: null, note: "not found" };
  return { name: p.name, healthy: p.status === "active", usagePercent: null, note: `status ${p.status}` };
}

async function resolvePolicyTargets(policy: PolicyWithTargets | null): Promise<ResolvedTarget[]> {
  if (!policy) return [];
  const inspected = await Promise.all(
    policy.targets.map(async (t) => ({
      target: t,
      info: await inspectTarget(t.targetType as ProvisioningTargetType, t.targetId),
    })),
  );
  return inspected.map(({ target: t, info }) => {
    const overCapacity =
      info.usagePercent !== null &&
      t.maxUsagePercent !== null &&
      info.usagePercent >= t.maxUsagePercent;
    return {
      id: t.id,
      targetType: t.targetType as ProvisioningTargetType,
      targetId: t.targetId,
      name: info.name,
      priority: t.priority,
      weight: t.weight,
      enabled: t.enabled,
      healthy: info.healthy && t.enabled && !overCapacity,
      usagePercent: info.usagePercent,
      maxUsagePercent: t.maxUsagePercent,
      note: overCapacity ? `${info.note} · over ${t.maxUsagePercent}% cap` : info.note,
    };
  });
}

/** Pick one target from the healthy candidates using the policy's strategy. */
function applyStrategy(strategy: string, healthy: ResolvedTarget[]): ResolvedTarget | null {
  if (healthy.length === 0) return null;
  switch (strategy) {
    case "least_used":
    case "capacity_available": {
      // Lowest usage% = most capacity available. Unknown usage sorts first.
      return [...healthy].sort(
        (a, b) =>
          (a.usagePercent ?? 0) - (b.usagePercent ?? 0) ||
          a.priority - b.priority,
      )[0];
    }
    case "random_healthy":
      return healthy[Math.floor(Math.random() * healthy.length)];
    case "weighted_round_robin": {
      const total = healthy.reduce((s, t) => s + Math.max(0, t.weight), 0);
      if (total <= 0) return healthy[0];
      let r = Math.random() * total;
      for (const t of healthy) {
        r -= Math.max(0, t.weight);
        if (r <= 0) return t;
      }
      return healthy[healthy.length - 1];
    }
    case "manual_priority":
    default:
      // Lowest priority number wins, heavier weight breaks ties.
      return [...healthy].sort(
        (a, b) => a.priority - b.priority || b.weight - a.weight,
      )[0];
  }
}

export const provisioningPolicyService = {
  /** The provisioning policy for a resource type (with targets), or null. */
  async getPolicy(resourceType: ProvisioningResourceType) {
    return prisma.provisioningPolicy.findUnique({
      where: { resourceType },
      include: { targets: { orderBy: [{ priority: "asc" }, { weight: "desc" }] } },
    });
  },

  /** Resolve every configured target with live health + usage. */
  async resolveTargets(resourceType: ProvisioningResourceType): Promise<ResolvedTarget[]> {
    const policy = await this.getPolicy(resourceType);
    return resolvePolicyTargets(policy);
  },

  /** Health of one resolved target — used by the admin UI capacity column. */
  validateTargetHealth(target: ResolvedTarget): { ok: boolean; reason: string } {
    if (!target.enabled) return { ok: false, reason: "target disabled" };
    if (!target.healthy) return { ok: false, reason: target.note };
    return { ok: true, reason: target.note };
  },

  /**
   * Pick a target for a new resource. Returns the full decision so callers can
   * surface "why this target" and fall back when no policy/target is healthy.
   */
  async selectTarget(
    resourceType: ProvisioningResourceType,
  ): Promise<ProvisioningDecision> {
    const policy = await this.getPolicy(resourceType);
    const candidates = await resolvePolicyTargets(policy);
    if (!policy) {
      return {
        resourceType,
        strategy: "none",
        policyEnabled: false,
        chosen: null,
        candidates,
        reason: `No provisioning policy configured for "${resourceType}".`,
      };
    }
    if (!policy.enabled) {
      return {
        resourceType,
        strategy: policy.strategy,
        policyEnabled: false,
        chosen: null,
        candidates,
        reason: `Provisioning policy for "${resourceType}" is disabled.`,
      };
    }
    const healthy = candidates.filter((c) => c.healthy);
    const chosen = applyStrategy(policy.strategy, healthy);
    return {
      resourceType,
      strategy: policy.strategy,
      policyEnabled: true,
      chosen,
      candidates,
      reason: chosen
        ? `Picked "${chosen.name}" via ${policy.strategy} (${healthy.length} healthy of ${candidates.length}).`
        : `No healthy target available for "${resourceType}".`,
    };
  },

  /** Human-readable explanation of the placement decision (admin "test" tool). */
  async explainDecision(resourceType: ProvisioningResourceType): Promise<{
    decision: ProvisioningDecision;
    targetKind: ProvisioningTargetType;
    lines: string[];
  }> {
    const decision = await this.selectTarget(resourceType);
    const lines = [
      `Resource: ${resourceType}  ·  strategy: ${decision.strategy}`,
      decision.reason,
      ...decision.candidates.map(
        (c) =>
          `  ${c.healthy ? "✓" : "✗"} ${c.name} — priority ${c.priority}, ` +
          `weight ${c.weight}, ` +
          `usage ${c.usagePercent === null ? "not reported" : `${c.usagePercent.toFixed(0)}%`} ` +
          `(${c.note})`,
      ),
    ];
    return { decision, targetKind: RESOURCE_TARGET_KIND[resourceType], lines };
  },
};
