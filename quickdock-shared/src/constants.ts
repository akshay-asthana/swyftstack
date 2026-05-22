// Platform-wide constants: feature keys, limit keys, usage types, plan presets.

export const FEATURE_KEYS = [
  "app_hosting",
  "static_hosting",
  "serverless_api",
  "postgres_database",
  "database_import",
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
  // Bandwidth metering (§12). in/out tracked at every level.
  "node_network_in_bytes",
  "node_network_out_bytes",
  "app_network_in_bytes",
  "app_network_out_bytes",
  "storage_network_in_bytes",
  "storage_network_out_bytes",
  "database_network_in_bytes",
  "database_network_out_bytes",
] as const;
export type UsageType = (typeof USAGE_TYPES)[number];

/** Bandwidth usage types — summed for inbound/outbound bandwidth dashboards. */
export const BANDWIDTH_IN_TYPES = [
  "node_network_in_bytes",
  "app_network_in_bytes",
  "storage_network_in_bytes",
  "database_network_in_bytes",
] as const;
export const BANDWIDTH_OUT_TYPES = [
  "node_network_out_bytes",
  "app_network_out_bytes",
  "storage_network_out_bytes",
  "database_network_out_bytes",
] as const;

/**
 * Scope levels for metric_rollups / granular monitoring (§1). `platform` rows
 * carry a null scopeId; everything else carries the resource id.
 */
export const ROLLUP_SCOPES = [
  "platform",
  "node",
  "organization",
  "user",
  "project",
  "app",
  "database",
  "bucket",
  "backup",
  "build",
] as const;
export type RollupScope = (typeof ROLLUP_SCOPES)[number];

/** Rollup periods stored in metric_rollups.period. */
export const ROLLUP_PERIODS = ["hourly", "daily", "billing"] as const;
export type RollupPeriodKey = (typeof ROLLUP_PERIODS)[number];

/**
 * Metric types stored in metric_rollups.metricType. Not exhaustive/strict —
 * collectors may write additional keys — but these power the standard charts.
 */
export const METRIC_TYPES = [
  "cpu_usage_percent",
  "cpu_load1",
  "ram_used_bytes",
  "ram_total_bytes",
  "disk_used_bytes",
  "disk_total_bytes",
  "network_in_bytes",
  "network_out_bytes",
  "containers_running",
  "containers_failed",
  "app_cpu_seconds",
  "app_memory_bytes",
  "app_request_count",
  "app_error_count",
  "database_size_bytes",
  "database_connections",
  "storage_used_bytes",
  "storage_object_count",
  "build_count",
  "build_cpu_seconds",
] as const;
export type MetricType = (typeof METRIC_TYPES)[number];

export const AUTH_PROVIDERS = ["password", "google", "github", "gitlab", "microsoft"] as const;
export type AuthProviderKey = (typeof AUTH_PROVIDERS)[number];

/** Database import job status progression (§11). */
export const DATABASE_IMPORT_STATUSES = [
  "queued",
  "testing_connection",
  "dumping",
  "restoring",
  "verifying",
  "completed",
  "failed",
] as const;
export type DatabaseImportStatusKey = (typeof DATABASE_IMPORT_STATUSES)[number];

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
  description: string;
  hasTrial: boolean;
  trialPriceCents: number | null;
  trialDays: number | null;
  trialRequiresPaymentMethod: boolean;
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
    description: "One project, one database — free for the first 30 days.",
    hasTrial: true,
    trialPriceCents: 0,
    trialDays: 30,
    trialRequiresPaymentMethod: false,
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
    description: "Ten projects, team members, and a 14-day discounted trial.",
    hasTrial: true,
    trialPriceCents: 1900,
    trialDays: 14,
    trialRequiresPaymentMethod: true,
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
