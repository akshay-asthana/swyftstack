// Platform-wide constants: feature keys, limit keys, usage types, plan presets.

export const FEATURE_KEYS = [
  "app_hosting",
  "static_hosting",
  "serverless_api",
  "postgres_database",
  "object_storage",
  "custom_domain",
  "backups",
  "team_members",
  "logs",
  "env_vars",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const LIMIT_KEYS = [
  "max_projects",
  "max_databases",
  "max_database_storage_bytes",
  "max_object_storage_bytes",
  "max_egress_bytes",
  "max_vcpu_seconds",
  "max_build_vcpu_seconds",
  "daily_db_backups",
  "backup_retention_hours",
  "max_team_members",
  "max_custom_domains",
] as const;
export type LimitKey = (typeof LIMIT_KEYS)[number];

export const USAGE_TYPES = [
  "app_runtime_vcpu_seconds",
  "build_vcpu_seconds",
  "database_storage_bytes",
  "object_storage_bytes",
  "object_egress_bytes",
  "app_egress_bytes",
  "build_minutes",
  "log_bytes",
] as const;
export type UsageType = (typeof USAGE_TYPES)[number];

export const NODE_ROLES = [
  "control",
  "app",
  "database",
  "build",
  "static",
  "proxy",
  "monitoring",
] as const;
export type NodeRole = (typeof NODE_ROLES)[number];

// Override precedence (most specific first). Mirrors architecture §15.
export const SCOPE_PRECEDENCE = ["service", "project", "user", "organization"] as const;

const GB = 1024 ** 3;
const TB = 1024 ** 4;

export interface PlanPreset {
  name: string;
  slug: string;
  priceCents: number;
  limits: Record<LimitKey, number | null>;
  features: Record<FeatureKey, boolean>;
}

const allFeaturesEnabled: Record<FeatureKey, boolean> = Object.fromEntries(
  FEATURE_KEYS.map((k) => [k, true]),
) as Record<FeatureKey, boolean>;

export const PLAN_PRESETS: Record<"starter" | "pro", PlanPreset> = {
  starter: {
    name: "Starter",
    slug: "starter",
    priceCents: 900,
    limits: {
      max_projects: 1,
      max_databases: 1,
      max_database_storage_bytes: 5 * GB,
      max_object_storage_bytes: 25 * GB,
      max_egress_bytes: 100 * GB,
      max_vcpu_seconds: 360_000,
      max_build_vcpu_seconds: 360_000,
      daily_db_backups: 1,
      backup_retention_hours: 24,
      max_team_members: 1,
      max_custom_domains: 1,
    },
    features: { ...allFeaturesEnabled, team_members: false },
  },
  pro: {
    name: "Pro",
    slug: "pro",
    priceCents: 4900,
    limits: {
      max_projects: 10,
      max_databases: 10,
      max_database_storage_bytes: 50 * GB,
      max_object_storage_bytes: 500 * GB,
      max_egress_bytes: TB,
      max_vcpu_seconds: 3_600_000,
      max_build_vcpu_seconds: 3_600_000,
      daily_db_backups: 1,
      backup_retention_hours: 168,
      max_team_members: 10,
      max_custom_domains: 25,
    },
    features: { ...allFeaturesEnabled },
  },
};
