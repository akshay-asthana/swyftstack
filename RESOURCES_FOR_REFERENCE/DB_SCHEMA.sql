-- Quickdock control-plane schema (PostgreSQL).
-- Source of truth is quickdock-shared/prisma/schema.prisma. Keep this file in
-- sync whenever the Prisma schema changes. You can also generate the canonical
-- DDL with: `npm -w quickdock-shared exec prisma migrate diff \
--   --from-empty --to-schema-datamodel prisma/schema.prisma --script`.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE user_status        AS ENUM ('active','suspended','deleted');
CREATE TYPE org_status         AS ENUM ('active','suspended','deleted');
CREATE TYPE member_role        AS ENUM ('owner','admin','developer','billing','viewer');
CREATE TYPE plan_status        AS ENUM ('active','archived');
CREATE TYPE subscription_status AS ENUM ('active','past_due','cancelled','trialing');
CREATE TYPE scope_type         AS ENUM ('organization','user','project','service');
CREATE TYPE project_status     AS ENUM ('active','suspended','over_limit','deleted');
CREATE TYPE invitation_status  AS ENUM ('pending','accepted','expired','revoked');
CREATE TYPE node_status        AS ENUM ('provisioning','active','draining','degraded','offline','disabled');
CREATE TYPE app_type           AS ENUM ('nextjs','static','node','python','serverless_api');
CREATE TYPE app_status         AS ENUM ('created','building','running','stopped','failed','suspended');
CREATE TYPE deployment_status  AS ENUM ('queued','building','deploying','live','failed','rolled_back');
CREATE TYPE deployment_source  AS ENUM ('github','git','upload','cli');
CREATE TYPE domain_type        AS ENUM ('platform_subdomain','custom');
CREATE TYPE domain_status      AS ENUM ('pending','verified','active','failed');
CREATE TYPE database_status    AS ENUM ('provisioning','active','suspended','restoring','failed','deleted');
CREATE TYPE backup_status      AS ENUM ('pending','running','uploading','verified','failed','expired');
CREATE TYPE backup_type        AS ENUM ('logical','physical','pitr');
CREATE TYPE bucket_status      AS ENUM ('active','suspended','deleted');
CREATE TYPE usage_period_status AS ENUM ('open','closed');
CREATE TYPE migration_status   AS ENUM ('pending','running','verifying','completed','failed','rolled_back');
CREATE TYPE migration_strategy AS ENUM ('redeploy','rsync','pg_dump_restore','replication');
CREATE TYPE migration_resource AS ENUM ('app','database','static','full_project');
CREATE TYPE job_status         AS ENUM ('queued','running','succeeded','failed','retrying','cancelled');
CREATE TYPE actor_type         AS ENUM ('user','admin','system','node_agent');

-- ---------------------------------------------------------------------------
-- Users / orgs
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  is_platform_admin BOOLEAN NOT NULL DEFAULT false,
  status user_status NOT NULL DEFAULT 'active',
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES users(id),
  status org_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON organizations(owner_user_id);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role member_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX ON organization_members(user_id);

-- ---------------------------------------------------------------------------
-- Plans / limits / features / subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  status plan_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID UNIQUE NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  max_projects INTEGER,
  max_databases INTEGER,
  max_database_storage_bytes BIGINT,
  max_object_storage_bytes BIGINT,
  max_egress_bytes BIGINT,
  max_vcpu_seconds BIGINT,
  max_build_vcpu_seconds BIGINT,
  daily_db_backups INTEGER,
  backup_retention_hours INTEGER,
  max_team_members INTEGER,
  max_custom_domains INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  UNIQUE (plan_id, feature_key)
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status subscription_status NOT NULL DEFAULT 'active',
  provider TEXT,
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON subscriptions(organization_id);
CREATE INDEX ON subscriptions(plan_id);

-- ---------------------------------------------------------------------------
-- Overrides
-- ---------------------------------------------------------------------------
CREATE TABLE limit_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type scope_type NOT NULL,
  scope_id UUID NOT NULL,
  limit_key TEXT NOT NULL,
  limit_value BIGINT,
  enabled BOOLEAN,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (scope_type, scope_id, limit_key)
);
CREATE INDEX ON limit_overrides(scope_type, scope_id);

CREATE TABLE feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type scope_type NOT NULL,
  scope_id UUID NOT NULL,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (scope_type, scope_id, feature_key)
);
CREATE INDEX ON feature_overrides(scope_type, scope_id);

-- ---------------------------------------------------------------------------
-- Projects / members / invitations
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status project_status NOT NULL DEFAULT 'active',
  region TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);
CREATE INDEX ON projects(organization_id);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role member_role NOT NULL,
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);
CREATE INDEX ON project_members(user_id);

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role member_role NOT NULL,
  token_hash TEXT NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON invitations(organization_id);
CREATE INDEX ON invitations(project_id);
CREATE INDEX ON invitations(email);

-- ---------------------------------------------------------------------------
-- Nodes
-- ---------------------------------------------------------------------------
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  provider_instance_id TEXT,
  public_ip TEXT,
  private_ip TEXT,
  connection_mode TEXT NOT NULL DEFAULT 'ssh',
  ssh_host TEXT,
  ssh_port INTEGER NOT NULL DEFAULT 22,
  ssh_user TEXT,
  ssh_key_path TEXT,
  ssh_private_key_encrypted TEXT,
  last_connection_status TEXT,
  last_connection_error TEXT,
  last_connection_at TIMESTAMPTZ,
  region TEXT,
  status node_status NOT NULL DEFAULT 'provisioning',
  roles TEXT[] NOT NULL DEFAULT '{}',
  cpu_cores NUMERIC(8,2) NOT NULL,
  ram_bytes BIGINT NOT NULL,
  disk_bytes BIGINT NOT NULL,
  reserved_cpu NUMERIC(8,2) NOT NULL DEFAULT 0,
  reserved_ram_bytes BIGINT NOT NULL DEFAULT 0,
  reserved_disk_bytes BIGINT NOT NULL DEFAULT 0,
  agent_version TEXT,
  agent_token_hash TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE node_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  cpu_usage_percent NUMERIC(6,2),
  ram_used_bytes BIGINT,
  disk_used_bytes BIGINT,
  network_rx_bytes BIGINT,
  network_tx_bytes BIGINT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON node_metrics(node_id, collected_at);

CREATE TABLE node_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  exit_code INTEGER,
  command TEXT,
  output TEXT,
  error TEXT,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON node_connection_logs(node_id, created_at);

-- ---------------------------------------------------------------------------
-- Apps / deployments / env / domains
-- ---------------------------------------------------------------------------
CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id),
  name TEXT NOT NULL,
  type app_type NOT NULL,
  status app_status NOT NULL DEFAULT 'created',
  container_name TEXT,
  image_ref TEXT,
  cpu_limit NUMERIC(6,2),
  memory_limit_bytes BIGINT,
  disk_limit_bytes BIGINT,
  default_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);
CREATE INDEX ON apps(project_id);
CREATE INDEX ON apps(node_id);

CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  status deployment_status NOT NULL DEFAULT 'queued',
  source_type deployment_source NOT NULL,
  repo_url TEXT,
  branch TEXT,
  commit_sha TEXT,
  build_command TEXT,
  start_command TEXT,
  output_dir TEXT,
  build_node_id UUID REFERENCES nodes(id),
  runtime_node_id UUID REFERENCES nodes(id),
  image_ref TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON deployments(app_id);

CREATE TABLE app_env_vars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_id, key)
);

CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  type domain_type NOT NULL,
  status domain_status NOT NULL DEFAULT 'pending',
  verification_token TEXT,
  ssl_status TEXT DEFAULT 'pending',
  target_node_id UUID REFERENCES nodes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON domains(project_id);
CREATE INDEX ON domains(app_id);

-- ---------------------------------------------------------------------------
-- Databases / backups
-- ---------------------------------------------------------------------------
CREATE TABLE databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id),
  name TEXT NOT NULL,
  engine TEXT NOT NULL DEFAULT 'postgres',
  engine_version TEXT,
  status database_status NOT NULL DEFAULT 'provisioning',
  db_name TEXT UNIQUE NOT NULL,
  db_user TEXT UNIQUE NOT NULL,
  encrypted_password TEXT NOT NULL,
  storage_limit_bytes BIGINT NOT NULL,
  current_size_bytes BIGINT NOT NULL DEFAULT 0,
  connection_limit INTEGER DEFAULT 10,
  database_cluster_id UUID,  -- FK added after database_clusters is created
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);
CREATE INDEX ON databases(project_id);
CREATE INDEX ON databases(node_id);
CREATE INDEX ON databases(database_cluster_id);

CREATE TABLE database_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  status backup_status NOT NULL DEFAULT 'pending',
  backup_type backup_type NOT NULL DEFAULT 'logical',
  storage_provider TEXT NOT NULL,
  backup_storage_provider_id UUID,  -- FK added after backup_storage_providers
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  checksum TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON database_backups(database_id);
CREATE INDEX ON database_backups(backup_storage_provider_id);

-- ---------------------------------------------------------------------------
-- Object storage
-- ---------------------------------------------------------------------------
CREATE TABLE storage_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  bucket_name TEXT NOT NULL,
  prefix TEXT,
  region TEXT,
  status bucket_status NOT NULL DEFAULT 'active',
  storage_limit_bytes BIGINT NOT NULL,
  egress_limit_bytes BIGINT NOT NULL,
  current_storage_bytes BIGINT NOT NULL DEFAULT 0,
  current_egress_bytes BIGINT NOT NULL DEFAULT 0,
  object_storage_provider_id UUID,  -- FK added after object_storage_providers
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, bucket_name, prefix)
);
CREATE INDEX ON storage_buckets(project_id);
CREATE INDEX ON storage_buckets(object_storage_provider_id);

CREATE TABLE storage_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID NOT NULL REFERENCES storage_buckets(id) ON DELETE CASCADE,
  access_key TEXT NOT NULL,
  encrypted_secret_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ
);
CREATE INDEX ON storage_credentials(bucket_id);

-- ---------------------------------------------------------------------------
-- Usage metering
-- ---------------------------------------------------------------------------
CREATE TABLE usage_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status usage_period_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON usage_periods(organization_id);

CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
  database_id UUID REFERENCES databases(id) ON DELETE SET NULL,
  bucket_id UUID REFERENCES storage_buckets(id) ON DELETE SET NULL,
  usage_type TEXT NOT NULL,
  quantity BIGINT NOT NULL,
  unit TEXT NOT NULL,
  source_node_id UUID REFERENCES nodes(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON usage_events(organization_id, usage_type, recorded_at);
CREATE INDEX ON usage_events(project_id);

CREATE TABLE usage_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  usage_period_id UUID NOT NULL REFERENCES usage_periods(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL,
  quantity BIGINT NOT NULL,
  unit TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, project_id, usage_period_id, usage_type)
);
CREATE INDEX ON usage_rollups(organization_id);

-- ---------------------------------------------------------------------------
-- Logs / audit
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  actor_type actor_type NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_logs(actor_user_id);
CREATE INDEX ON audit_logs(action);
CREATE INDEX ON audit_logs(created_at);

CREATE TABLE project_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON project_activity_logs(project_id, created_at);

-- ---------------------------------------------------------------------------
-- Migrations (workload moves)
-- ---------------------------------------------------------------------------
CREATE TABLE migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  resource_type migration_resource NOT NULL,
  resource_id UUID,
  source_node_id UUID REFERENCES nodes(id),
  target_node_id UUID REFERENCES nodes(id),
  status migration_status NOT NULL DEFAULT 'pending',
  strategy migration_strategy NOT NULL,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON migrations(project_id);

-- ---------------------------------------------------------------------------
-- Background jobs
-- ---------------------------------------------------------------------------
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status job_status NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 100,
  queue TEXT NOT NULL DEFAULT 'default',
  required_worker_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT,
  result JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON jobs(status, run_after, priority);
CREATE INDEX ON jobs(type);
CREATE INDEX ON jobs(queue, required_worker_type);

-- ---------------------------------------------------------------------------
-- Control-plane DB backups (every 6h)
-- ---------------------------------------------------------------------------
CREATE TABLE control_plane_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status backup_status NOT NULL DEFAULT 'pending',
  storage_provider TEXT NOT NULL,
  backup_storage_provider_id UUID,  -- FK added after backup_storage_providers
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  checksum TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON control_plane_backups(created_at);
CREATE INDEX ON control_plane_backups(backup_storage_provider_id);

-- ---------------------------------------------------------------------------
-- DB-managed infrastructure providers
-- (replaces customer DB/storage/backup/worker env vars)
-- ---------------------------------------------------------------------------
CREATE TABLE infrastructure_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,                 -- database|object_storage|backup_storage|compute_node|dns|email
  provider TEXT NOT NULL,            -- postgres|b2|r2|hetzner|local_dev|cloudflare|custom
  status TEXT NOT NULL DEFAULT 'active', -- active|disabled|degraded
  region TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  encrypted_credentials TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON infrastructure_providers(type, status);

CREATE TABLE database_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  provider_id UUID REFERENCES infrastructure_providers(id),
  node_id UUID REFERENCES nodes(id),
  engine TEXT NOT NULL DEFAULT 'postgres',
  engine_version TEXT,
  admin_connection_encrypted TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 5432,
  default_database TEXT NOT NULL DEFAULT 'postgres',
  ssl_required BOOLEAN NOT NULL DEFAULT false,
  max_databases INTEGER,
  max_storage_bytes BIGINT,
  current_databases INTEGER NOT NULL DEFAULT 0,
  current_storage_bytes BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active|disabled|full|degraded
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON database_clusters(status, region);

CREATE TABLE object_storage_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,            -- b2|r2|hetzner|local_dev|custom
  endpoint TEXT,
  region TEXT,
  access_key_encrypted TEXT,
  secret_key_encrypted TEXT,
  default_bucket TEXT,
  path_style BOOLEAN NOT NULL DEFAULT true,
  public_base_url TEXT,
  local_path TEXT,
  max_storage_bytes BIGINT,
  current_storage_bytes BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active|disabled|degraded
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON object_storage_providers(status);

CREATE TABLE backup_storage_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,            -- b2|r2|hetzner|local_dev|custom
  endpoint TEXT,
  region TEXT,
  bucket TEXT,
  prefix TEXT,
  access_key_encrypted TEXT,
  secret_key_encrypted TEXT,
  local_path TEXT,
  retention_policy JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active', -- active|disabled|degraded
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON backup_storage_providers(status);

CREATE TABLE worker_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  worker_type TEXT UNIQUE NOT NULL,  -- default|deploy|backup|metrics|migration|usage
  enabled BOOLEAN NOT NULL DEFAULT true,
  poll_interval_ms INTEGER NOT NULL,
  concurrency INTEGER NOT NULL,
  lock_timeout_ms INTEGER NOT NULL,
  queues TEXT[] NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deferred foreign keys (declared here so table order does not matter).
ALTER TABLE databases
  ADD CONSTRAINT databases_database_cluster_id_fkey
  FOREIGN KEY (database_cluster_id) REFERENCES database_clusters(id);
ALTER TABLE storage_buckets
  ADD CONSTRAINT storage_buckets_object_storage_provider_id_fkey
  FOREIGN KEY (object_storage_provider_id) REFERENCES object_storage_providers(id);
ALTER TABLE database_backups
  ADD CONSTRAINT database_backups_backup_storage_provider_id_fkey
  FOREIGN KEY (backup_storage_provider_id) REFERENCES backup_storage_providers(id);
ALTER TABLE control_plane_backups
  ADD CONSTRAINT control_plane_backups_backup_storage_provider_id_fkey
  FOREIGN KEY (backup_storage_provider_id) REFERENCES backup_storage_providers(id);
