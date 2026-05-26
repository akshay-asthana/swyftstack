// PlanResourceService (§9 / §11) — resolves which resources a plan includes
// and how much. Plans need NOT include every resource: a DB-only or a
// static-hosting-only plan is valid. This is the single gate every customer
// resource creation must pass before provisioning.
import { prisma } from "../db.js";
import { FEATURE_KEYS } from "../constants.js";
import {
  resolveAllLimits,
  resolveFeature,
  type ScopeChain,
  type LimitOverrideInput,
  type FeatureOverrideInput,
  type ScopeType,
} from "../limits.js";

export class ResourceNotInPlanError extends Error {
  constructor(public readonly featureKey: string) {
    super(`This plan does not include "${featureKey.replace(/_/g, " ")}".`);
    this.name = "ResourceNotInPlanError";
  }
}

export class ResourceLimitReachedError extends Error {
  constructor(public readonly limitKey: string, public readonly limit: number) {
    super(`Plan limit reached for "${limitKey.replace(/_/g, " ")}" (max ${limit}).`);
    this.name = "ResourceLimitReachedError";
  }
}

export interface EffectivePlanResources {
  planId: string | null;
  planName: string | null;
  /** featureKey -> enabled. False when the plan omits the resource. */
  features: Record<string, boolean>;
  /** limitKey -> value. null means unlimited. */
  limits: Record<string, number | null>;
}

/** PlanLimit column -> snake_case limit key used everywhere else. */
const LIMIT_COLUMNS: Record<string, string> = {
  maxProjects: "max_projects",
  maxDatabases: "max_databases",
  maxStorageBuckets: "max_storage_buckets",
  maxDatabaseStorageBytes: "max_database_storage_bytes",
  maxObjectStorageBytes: "max_object_storage_bytes",
  maxEgressBytes: "max_egress_bytes",
  maxVcpuSeconds: "max_vcpu_seconds",
  maxBuildVcpuSeconds: "max_build_vcpu_seconds",
  dailyDbBackups: "daily_db_backups",
  backupRetentionHours: "backup_retention_hours",
  maxTeamMembers: "max_team_members",
  maxCustomDomains: "max_custom_domains",
};

export const planResourceService = {
  /**
   * The effective feature + limit set for an organization (optionally narrowed
   * to a user/project so service/project/user overrides apply too).
   */
  async getEffectivePlanResources(chain: ScopeChain): Promise<EffectivePlanResources> {
    if (!chain.organizationId) {
      return { planId: null, planName: null, features: {}, limits: {} };
    }
    const sub = await prisma.subscription.findFirst({
      where: {
        organizationId: chain.organizationId,
        status: { in: ["active", "trialing", "past_due"] },
      },
      orderBy: { createdAt: "desc" },
      include: { plan: { include: { limits: true, features: true } } },
    });

    // Plan defaults — a missing plan means nothing is included.
    const featureDefaults: Record<string, boolean> = {};
    for (const key of FEATURE_KEYS) {
      featureDefaults[key] =
        sub?.plan.features.find((f) => f.featureKey === key)?.enabled ?? false;
    }
    const limitDefaults: Record<string, number | bigint | null> = {};
    for (const [col, key] of Object.entries(LIMIT_COLUMNS)) {
      const raw = sub?.plan.limits
        ? (sub.plan.limits as Record<string, unknown>)[col]
        : null;
      limitDefaults[key] =
        raw === null || raw === undefined ? null : (raw as number | bigint);
    }

    // Overrides for every scope level we know about.
    const scopeFilters: { scopeType: ScopeType; scopeId: string }[] = [];
    if (chain.organizationId) scopeFilters.push({ scopeType: "organization", scopeId: chain.organizationId });
    if (chain.userId) scopeFilters.push({ scopeType: "user", scopeId: chain.userId });
    if (chain.projectId) scopeFilters.push({ scopeType: "project", scopeId: chain.projectId });

    const [limitRows, featureRows] =
      scopeFilters.length > 0
        ? await Promise.all([
            prisma.limitOverride.findMany({ where: { OR: scopeFilters } }),
            prisma.featureOverride.findMany({ where: { OR: scopeFilters } }),
          ])
        : [[], []];

    const limitOverrides: LimitOverrideInput[] = limitRows.map((o) => ({
      scopeType: o.scopeType as ScopeType,
      scopeId: o.scopeId,
      limitKey: o.limitKey,
      limitValue: o.limitValue,
      enabled: o.enabled,
      expiresAt: o.expiresAt,
    }));
    const featureOverrides: FeatureOverrideInput[] = featureRows.map((o) => ({
      scopeType: o.scopeType as ScopeType,
      scopeId: o.scopeId,
      featureKey: o.featureKey,
      enabled: o.enabled,
      expiresAt: o.expiresAt,
    }));

    const features: Record<string, boolean> = {};
    for (const key of FEATURE_KEYS) {
      features[key] = resolveFeature(key, featureDefaults[key], featureOverrides, chain);
    }
    const limits = resolveAllLimits(limitDefaults, limitOverrides, chain);

    return {
      planId: sub?.plan.id ?? null,
      planName: sub?.plan.name ?? null,
      features,
      limits,
    };
  },

  /** Throw ResourceNotInPlanError when the feature is not part of the plan. */
  async validateResourceAllowed(chain: ScopeChain, featureKey: string): Promise<void> {
    const effective = await this.getEffectivePlanResources(chain);
    if (!effective.features[featureKey]) {
      throw new ResourceNotInPlanError(featureKey);
    }
  },

  /**
   * Throw ResourceLimitReachedError when adding `requested` more of a resource
   * would exceed the plan limit. `current` is the present count/usage.
   */
  async validateResourceLimit(
    chain: ScopeChain,
    limitKey: string,
    current: number,
    requested = 1,
  ): Promise<void> {
    const effective = await this.getEffectivePlanResources(chain);
    const limit = effective.limits[limitKey];
    if (limit === null || limit === undefined) return; // unlimited
    if (current + requested > limit) {
      throw new ResourceLimitReachedError(limitKey, limit);
    }
  },
};
