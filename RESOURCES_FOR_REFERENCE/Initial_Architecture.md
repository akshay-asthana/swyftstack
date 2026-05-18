Below is the architecture I’d hand to an engineering team.

# Admin orchestration platform architecture

## 1. Core concept

You are building a **control plane** that manages VPS nodes, user projects, app runtimes, databases, object storage, plans, limits, usage, billing, logs, backups, and migrations.

The VPS machines are not the platform. They are **worker nodes**.

```text
Admin Platform / Control Plane
  ├── Admin dashboard
  ├── User/project/account database
  ├── Node registry
  ├── Scheduler
  ├── Usage metering
  ├── Billing/plan limits
  ├── Audit/activity logs
  ├── Backup manager
  ├── Migration manager
  └── Node agent API

Worker VPS Nodes
  ├── App containers
  ├── Build jobs
  ├── Static files
  ├── Postgres databases
  ├── Reverse proxy
  ├── Metrics/log agents
  └── Node agent
```

The platform must support:

- adding/removing VPS nodes
- assigning node roles
- deploying Next.js apps/serverless APIs
- metering vCPU-hours
- provisioning Postgres databases
- provisioning object storage buckets
- enforcing plan limits
- overriding limits for users/projects
- custom plans
- project collaborators and roles
- admin logs
- user activity logs
- migrations between VPSs
- control-plane backup every 6 hours

---

# 2. High-level system architecture

```text
                         ┌─────────────────────────────┐
                         │ Admin Dashboard              │
                         │ admin.yourplatform.com       │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │ Control Plane API            │
                         │ Auth, RBAC, billing, limits  │
                         └──────────────┬──────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
┌───────▼────────┐          ┌───────────▼───────────┐       ┌──────────▼──────────┐
│ Control DB     │          │ Scheduler / Orchestrator│       │ Usage Metering       │
│ PostgreSQL     │          │ Placement + migrations  │       │ vCPU, egress, DB, logs│
└───────┬────────┘          └───────────┬───────────┘       └──────────┬──────────┘
        │                               │                               │
┌───────▼────────┐          ┌───────────▼───────────┐       ┌──────────▼──────────┐
│ Backup Manager │          │ Node Agent Gateway     │       │ Billing Engine       │
│ 6h backups     │          │ Secure commands        │       │ Plans + overrides     │
└────────────────┘          └───────────┬───────────┘       └─────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         │                              │                              │
┌────────▼────────┐            ┌────────▼────────┐            ┌────────▼────────┐
│ VPS Node 1      │            │ VPS Node 2      │            │ VPS Node 3      │
│ all-in-one MVP  │            │ app node later  │            │ db node later   │
└─────────────────┘            └─────────────────┘            └─────────────────┘

External Services:
  ├── Backblaze B2 / Cloudflare R2 / Hetzner object storage
  ├── DNS provider, likely Cloudflare
  ├── Payment provider, Stripe/Razorpay
  ├── Email provider
  └── Monitoring/alerting provider
```

---

# 3. MVP deployment model

Since you are starting with **one 2 vCPU / 4GB / 100GB VPS**, the first version should be an **all-in-one node**.

```text
VPS-1
  ├── Caddy / Traefik reverse proxy
  ├── node-agent
  ├── platform-control-api
  ├── platform-admin-dashboard
  ├── platform-user-dashboard later
  ├── platform-control-db PostgreSQL
  ├── postgres-main for customer databases
  ├── app containers
  ├── build job containers
  ├── static site files
  ├── log collector
  └── backup agent
```

This is fine for MVP, but design the software as if each component can later move.

Later split into:

```text
VPS-1: control plane
VPS-2: app runtime node
VPS-3: database node
VPS-4: build node
Object storage: B2/R2
```

---

# 4. Node types

Each VPS should register as a node with one or more roles.

```text
node roles:
  - control
  - app
  - database
  - build
  - static
  - proxy
  - monitoring
```

For MVP, your first VPS has all roles:

```text
node-001:
  roles = ["control", "app", "database", "build", "static", "proxy"]
```

When adding a new VPS:

```text
node-002:
  roles = ["app", "build"]
```

Later:

```text
node-003:
  roles = ["database"]
```

---

# 5. Node agent

Every VPS runs a **node agent**.

The node agent is responsible for executing commands from the control plane.

## Node agent responsibilities

```text
- register node
- heartbeat every 10-30 seconds
- report CPU/RAM/disk/network usage
- report running containers
- create app container
- stop app container
- restart app container
- delete app container
- run build job
- create database
- create database user
- reset database password
- run database backup
- restore database
- collect logs
- sync static files
- enforce container resource limits
- report app health
```

## Agent communication

Use HTTPS with mTLS or signed tokens.

Do not expose agents publicly without authentication.

```text
Control Plane → Node Agent
  POST /v1/apps/create
  POST /v1/apps/stop
  POST /v1/databases/create
  POST /v1/backups/run
  POST /v1/migrations/receive
  GET  /v1/health
```

For MVP, SSH + scripts is acceptable, but build the schema and orchestration as if an agent exists.

---

# 6. Workload model

Separate project resources.

Do **not** put app + database inside one Docker container.

Correct model:

```text
Project
  ├── App container(s)
  ├── Database allocation
  ├── Object storage bucket/prefix
  ├── Static site files
  ├── Env vars
  ├── Usage counters
  └── Backups
```

For Starter:

```text
1 project
1 app/service
1 database
25GB object storage
100GB egress
100 vCPU-hours including builds
```

For Pro:

```text
10 projects
10 databases max
50GB combined database storage
500GB object storage
1TB egress
1000 vCPU-hours including builds
```

---

# 7. App runtime architecture

Each dynamic app runs in its own Docker container.

```text
app_project_123_service_web
  cpu limit: 0.25 to 0.5 vCPU
  memory limit: based on plan
  restart policy: unless-stopped
  logs: capped
  network: internal app network
```

Static sites do not need app containers after build. Store build output and serve using Caddy/Nginx.

```text
/srv/static/project_123/
  index.html
  _next/static/
  assets/
```

Later move static files to object storage + CDN.

---

# 8. vCPU-hours metering

You should not give unlimited CPU. Meter usage.

## Definition

One vCPU-hour means:

```text
1 full vCPU used for 1 hour
```

Formula:

```text
vCPU-hours = CPU_seconds_used / 3600
```

For Docker containers, collect CPU usage from Docker stats / cgroups.

Meter both:

```text
- build containers
- runtime app containers
```

Do **not** meter Postgres CPU separately in Starter/Pro at first unless abuse appears. But you should reserve the right to throttle abusive database workloads.

## Usage buckets

```text
usage_type:
  - app_runtime_vcpu_seconds
  - build_vcpu_seconds
  - database_storage_bytes
  - object_storage_bytes
  - object_egress_bytes
  - app_egress_bytes
  - build_minutes
  - log_bytes
```

## Enforcement

For Starter:

```text
100 vCPU-hours/month = 360,000 CPU-seconds
```

For Pro:

```text
1000 vCPU-hours/month = 3,600,000 CPU-seconds
```

When user crosses threshold:

```text
80% usage: warning
100% usage: throttle / sleep apps / block new builds
110% usage: suspend dynamic runtime unless overage enabled
```

Admin should be able to override this per user/project.

---

# 9. Scheduler

The scheduler decides where a workload goes.

## Inputs

```text
- project plan
- service type: app, db, static, build
- required CPU
- required RAM
- required disk
- required region
- node health
- node role
- node reserved capacity
- current actual usage
```

## Basic scheduler rule

```text
Find healthy node where:
  node.role includes requested role
  node.status = active
  reserved_ram + requested_ram <= ram_capacity * ram_limit_ratio
  reserved_disk + requested_disk <= disk_capacity * disk_limit_ratio
  active_workloads < max_workloads
```

For MVP, use simple least-used-node scheduling.

Later add:

```text
- region preference
- affinity rules
- anti-affinity rules
- noisy-neighbor scoring
- paid plan priority
```

---

# 10. Database architecture

## MVP

One shared Postgres instance for customer databases.

```text
postgres-main
  ├── db_project_001
  ├── db_project_002
  ├── db_project_003
```

Each project gets:

```text
- separate database
- separate username
- separate random password
- no superuser
- no createdb
- no createrole
- connection limit
- statement timeout
- idle transaction timeout
```

Security setup:

```sql
CREATE DATABASE db_project_123;
CREATE USER user_project_123 WITH PASSWORD 'random-password';

REVOKE ALL ON DATABASE db_project_123 FROM PUBLIC;
GRANT CONNECT ON DATABASE db_project_123 TO user_project_123;

ALTER ROLE user_project_123 CONNECTION LIMIT 10;
ALTER ROLE user_project_123 SET statement_timeout = '30s';
ALTER ROLE user_project_123 SET idle_in_transaction_session_timeout = '60s';
```

Inside the DB:

```sql
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO user_project_123;
ALTER SCHEMA public OWNER TO user_project_123;
```

Admin should have a database test that verifies:

```text
user_a cannot connect to db_b
```

## Higher plans

For Business and Custom:

```text
- dedicated Postgres container
- dedicated Postgres VM
- replica
- PITR
- longer retention
```

---

# 11. Database backups

## Customer database backup policy

Starter:

```text
1 automatic daily backup
Retention: latest successful backup only
```

Pro:

```text
daily backup
recommended retention: 7 days
```

Business/custom:

```text
custom retention
PITR optional later
```

## Backup process

```text
1. Start backup job
2. Run pg_dump -Fc
3. Upload backup to B2/R2
4. Verify upload checksum
5. Mark backup as verified
6. Delete old backup only after new backup is verified
7. Record backup metadata
```

Never delete the old backup before the new one is verified.

## Control plane backup

Your platform database must be backed up every **6 hours**.

```text
control plane DB backup schedule:
  00:00
  06:00
  12:00
  18:00
```

Retention suggestion:

```text
last 24 hours: every 6h
last 7 days: daily
last 4 weeks: weekly
```

Minimum:

```text
6-hour backups retained for 7 days
```

Backup destination:

```text
primary: Backblaze B2/R2
secondary: another provider or Hetzner Storage Box later
```

Also back up:

```text
- control DB
- encrypted secrets
- project metadata
- node registry
- billing state
- deployment metadata
- DNS/domain mappings
```

Without this, platform migration is painful.

---

# 12. Platform transfer to another VPS

To transfer the platform to another VPS, you need clean separation.

## Everything needed to rebuild platform

```text
- control plane DB backup
- encryption key backup
- Docker images or Git repos
- environment variables
- object storage credentials
- node agent credentials
- DNS provider credentials
- payment provider credentials
- backup restore scripts
```

## Restore flow

```text
1. Buy new VPS
2. Install Docker + platform runtime
3. Restore latest control DB backup
4. Restore encrypted secrets
5. Start control API and admin dashboard
6. Re-register existing worker nodes
7. Verify node heartbeats
8. Repoint admin domain DNS
9. Run integrity checks
```

Critical: encrypt secrets, but keep master key safely outside the platform, for example password manager + offline copy.

---

# 13. Object storage architecture

Use external object storage from day one for user uploads.

Possible providers:

```text
- Backblaze B2
- Cloudflare R2
- Hetzner Object Storage / Storage Box
```

For each project:

```text
bucket or prefix:
  project_123/
    uploads/
    static/
    backups/
```

Better for isolation:

```text
one bucket per paid project
```

Cheaper/simple MVP:

```text
one bucket per provider/region
prefix per project
```

Admin should be able to:

```text
- view storage usage
- set bucket quota
- set egress quota
- rotate storage keys
- disable public access
- suspend bucket
```

---

# 14. Logs and activity tracking

You need two kinds of logs.

## System audit logs

For admin/security.

Examples:

```text
admin created node
admin changed user limit
admin suspended project
backup failed
node went offline
database restored
payment failed
```

These should be immutable.

## User activity logs

For customer/project visibility.

Examples:

```text
user deployed app
user created database
user rotated DB password
user invited teammate
user changed env var
```

## Runtime logs

For apps.

For $9 users:

```text
logs retained 24-72 hours
log size capped
```

Docker log limits:

```json
{
  "max-size": "10m",
  "max-file": "3"
}
```

---

# 15. Admin features

The admin dashboard should allow:

## Node management

```text
- add VPS
- run installation script
- approve node registration
- set node role
- set node capacity
- drain node
- disable node
- see node health
- see containers/databases on node
- migrate workloads away
```

## User/project management

```text
- view users
- view projects
- view databases
- view apps
- view object storage
- view usage
- view activity logs
- impersonate user carefully
- suspend/unsuspend user
- suspend/unsuspend project
```

## Plan management

```text
- create plan
- edit plan price
- edit limits
- enable/disable services
- archive plan
- set overage pricing
```

## Overrides

Admin must be able to override:

```text
- vCPU-hours
- projects count
- database count
- database capacity
- object storage
- egress
- backup retention
- enabled services
- support level
```

Overrides can apply at:

```text
- user level
- project level
- service level
- plan level
```

Order of precedence:

```text
service override > project override > user override > plan default
```

---

# 16. Services toggle system

Services should be controlled by feature flags.

Examples:

```text
services:
  - app_hosting
  - static_hosting
  - serverless_api
  - postgres_database
  - object_storage
  - custom_domain
  - backups
  - team_members
  - logs
  - env_vars
```

Each plan can enable/disable services.

Each user/project can also have overrides.

Example:

```text
Starter:
  app_hosting: enabled
  postgres_database: enabled
  object_storage: enabled
  custom_domain: enabled
  team_members: disabled or limited
  serverless_api: enabled
```

---

# 17. Team members and roles

Users can invite others to projects.

Suggested roles:

```text
owner
admin
developer
billing
viewer
```

Permissions:

| Permission         | Owner |       Admin |   Developer | Billing | Viewer |
| ------------------ | ----: | ----------: | ----------: | ------: | -----: |
| Delete project     |   Yes | No/optional |          No |      No |     No |
| Deploy app         |   Yes |         Yes |         Yes |      No |     No |
| View logs          |   Yes |         Yes |         Yes |      No |    Yes |
| Manage env vars    |   Yes |         Yes |         Yes |      No |     No |
| Create DB          |   Yes |         Yes | No/optional |      No |     No |
| Rotate DB password |   Yes |         Yes |          No |      No |     No |
| Manage billing     |   Yes |          No |          No |     Yes |     No |
| Invite users       |   Yes |         Yes |          No |      No |     No |

---

# 18. Edge-case handling built into architecture

## Node failure

```text
- node heartbeat missing
- mark node degraded
- alert admin
- show affected projects
- if backups exist, allow migration/recovery
```

## Backup failure

```text
- retry
- alert admin
- do not delete previous backup
- mark backup status failed
```

## Over-quota

```text
- 80% warning
- 100% hard limit
- admin override possible
```

## Payment failure

```text
Day 0: payment failed
Day 3: warning
Day 7: suspend builds/deployments
Day 14: stop apps
Day 30: delete after final backup
```

## Build abuse

```text
- max build duration
- max concurrent builds
- vCPU metering
- memory limit
- kill runaway builds
```

## App abuse

```text
- CPU/memory limits
- request timeout
- log limits
- egress metering
- suspend project
```

## Database abuse

```text
- connection limits
- statement timeout
- storage monitoring
- slow query alerts later
```

---

# 19. Database schema

Use PostgreSQL for the control plane.

Below is a practical schema. This is not exhaustive, but it is strong enough for v1.

## Core users and auth

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, deleted
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- owner, admin, developer, billing, viewer
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
```

## Plans and limits

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active', -- active, archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,

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
```

Example plan values:

```text
Starter:
  max_projects = 1
  max_databases = 1
  max_database_storage_bytes = 5GB
  max_object_storage_bytes = 25GB
  max_egress_bytes = 100GB
  max_vcpu_seconds = 360000
  daily_db_backups = 1
  backup_retention_hours = 24

Pro:
  max_projects = 10
  max_databases = 10
  max_database_storage_bytes = 50GB
  max_object_storage_bytes = 500GB
  max_egress_bytes = 1TB
  max_vcpu_seconds = 3600000
```

## Subscriptions

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, past_due, cancelled, trialing
  provider TEXT, -- stripe, razorpay
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Overrides

```sql
CREATE TABLE limit_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  scope_type TEXT NOT NULL, -- organization, user, project, service
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

CREATE TABLE feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  scope_type TEXT NOT NULL, -- organization, user, project, service
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
```

## Projects and members

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, deleted
  region TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- owner, admin, developer, billing, viewer
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired, revoked
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Nodes

```sql
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL, -- hetzner, digitalocean, vultr, custom
  provider_instance_id TEXT,
  public_ip INET,
  private_ip INET,
  region TEXT,
  status TEXT NOT NULL DEFAULT 'provisioning', -- provisioning, active, draining, degraded, offline, disabled
  roles TEXT[] NOT NULL DEFAULT '{}',

  cpu_cores NUMERIC NOT NULL,
  ram_bytes BIGINT NOT NULL,
  disk_bytes BIGINT NOT NULL,

  reserved_cpu NUMERIC NOT NULL DEFAULT 0,
  reserved_ram_bytes BIGINT NOT NULL DEFAULT 0,
  reserved_disk_bytes BIGINT NOT NULL DEFAULT 0,

  agent_version TEXT,
  last_heartbeat_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE node_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  cpu_usage_percent NUMERIC,
  ram_used_bytes BIGINT,
  disk_used_bytes BIGINT,
  network_rx_bytes BIGINT,
  network_tx_bytes BIGINT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Apps and deployments

```sql
CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- nextjs, static, node, python, serverless_api
  status TEXT NOT NULL DEFAULT 'created', -- created, building, running, stopped, failed, suspended
  container_name TEXT,
  image_ref TEXT,

  cpu_limit NUMERIC,
  memory_limit_bytes BIGINT,
  disk_limit_bytes BIGINT,

  default_domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, building, deploying, live, failed, rolled_back
  source_type TEXT NOT NULL, -- github, git, upload, cli
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

CREATE TABLE app_env_vars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (app_id, key)
);
```

## Domains

```sql
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- platform_subdomain, custom
  status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, active, failed
  verification_token TEXT,
  ssl_status TEXT DEFAULT 'pending',
  target_node_id UUID REFERENCES nodes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Databases

```sql
CREATE TABLE databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id),
  name TEXT NOT NULL,
  engine TEXT NOT NULL DEFAULT 'postgres',
  engine_version TEXT,
  status TEXT NOT NULL DEFAULT 'provisioning', -- provisioning, active, suspended, restoring, failed, deleted

  db_name TEXT NOT NULL,
  db_user TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,

  storage_limit_bytes BIGINT NOT NULL,
  current_size_bytes BIGINT NOT NULL DEFAULT 0,
  connection_limit INTEGER DEFAULT 10,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name),
  UNIQUE (db_name),
  UNIQUE (db_user)
);

CREATE TABLE database_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, uploading, verified, failed, expired
  backup_type TEXT NOT NULL DEFAULT 'logical', -- logical, physical, pitr
  storage_provider TEXT NOT NULL, -- b2, r2, hetzner
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  checksum TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Object storage

```sql
CREATE TABLE storage_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- b2, r2, hetzner
  bucket_name TEXT NOT NULL,
  prefix TEXT,
  region TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  storage_limit_bytes BIGINT NOT NULL,
  egress_limit_bytes BIGINT NOT NULL,
  current_storage_bytes BIGINT NOT NULL DEFAULT 0,
  current_egress_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, bucket_name, prefix)
);

CREATE TABLE storage_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id UUID NOT NULL REFERENCES storage_buckets(id) ON DELETE CASCADE,
  access_key TEXT NOT NULL,
  encrypted_secret_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ
);
```

## Usage metering

```sql
CREATE TABLE usage_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open, closed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
  database_id UUID REFERENCES databases(id) ON DELETE SET NULL,
  bucket_id UUID REFERENCES storage_buckets(id) ON DELETE SET NULL,

  usage_type TEXT NOT NULL,
  quantity BIGINT NOT NULL,
  unit TEXT NOT NULL, -- cpu_seconds, bytes, requests, seconds

  source_node_id UUID REFERENCES nodes(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
```

## Activity and audit logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  actor_type TEXT NOT NULL, -- user, admin, system, node_agent
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Migrations

```sql
CREATE TABLE migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- app, database, static, full_project
  resource_id UUID,
  source_node_id UUID REFERENCES nodes(id),
  target_node_id UUID REFERENCES nodes(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, verifying, completed, failed, rolled_back
  strategy TEXT NOT NULL, -- redeploy, rsync, pg_dump_restore, replication
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 20. Product description for development team

## Product name

Internal name: **Infra Control Plane**

## Product summary

Build an admin orchestration platform that allows us to manage a multi-tenant app hosting, database, and object storage platform on top of multiple VPS providers. The system should start on a single VPS but be designed to scale to many VPS nodes. Admins must be able to add nodes, assign node roles, manage plans, set usage limits, override user/project limits, provision app runtimes, databases, object storage, backups, and migrate workloads between nodes.

The platform will initially support hosting Next.js/static/serverless-style apps, managed Postgres databases, and object storage. Users will be charged based on plans that include vCPU-hours, database capacity, object storage, egress, project count, and database count.

## Initial plans

### Starter

```text
Price: $9/month
Projects: 1
vCPU-hours: 100/month, including builds
Database: 1 database
Database capacity: 5GB
Database backup: 1 daily backup, latest only
Object storage: 25GB
Egress: 100GB/month
```

### Pro

```text
Price: $49/month
Projects: 10
vCPU-hours: 1000/month, including builds
Databases: 10
Combined database capacity: 50GB
Object storage: 500GB/month
Egress: 1TB/month
```

### Business / Custom

Limits configurable by admin.

## Required admin capabilities

```text
1. Add/register VPS nodes.
2. Assign node roles: control, app, database, build, static, proxy.
3. See node health, CPU, RAM, disk, workloads, and heartbeat.
4. Drain or disable nodes.
5. Move apps/databases/static sites between nodes.
6. Create/edit/archive plans.
7. Set plan-level limits and feature flags.
8. Override limits for specific users, organizations, projects, or services.
9. Enable/disable services per plan/user/project.
10. View all users, organizations, projects, apps, databases, buckets, backups.
11. See usage and activity logs.
12. Suspend/unsuspend users/projects/services.
13. Trigger backups and restores.
14. View backup status and failures.
15. View vCPU-hour usage for apps and builds.
16. View object storage and egress usage.
17. Manage team roles and project invitations.
```

## Required infrastructure capabilities

```text
1. Run apps as isolated Docker containers.
2. Run build jobs as isolated Docker containers.
3. Serve static sites from local disk initially, object storage later.
4. Run shared Postgres instance for Starter/Pro initially.
5. Create separate DB/user/password per project.
6. Enforce DB permissions so users cannot access other databases.
7. Run daily database backups.
8. Back up control plane DB every 6 hours.
9. Store backups in external object storage.
10. Verify backups before marking them successful.
11. Meter vCPU usage from app and build containers.
12. Meter storage and egress usage.
13. Enforce plan limits.
14. Support migration workflows.
```

## Technical stack recommendation

```text
Frontend:
  Next.js admin dashboard

Backend:
  Node.js/NestJS or FastAPI

Control database:
  PostgreSQL

Runtime:
  Docker

Reverse proxy:
  Caddy or Traefik

Node agent:
  Go, Node.js, or Python service running on each VPS

Backups:
  pg_dump for MVP
  B2/R2/Hetzner object storage
  Later pgBackRest/WAL-G

Metrics:
  Docker stats/cgroups
  node_exporter
  postgres_exporter
  custom usage collector

Billing:
  Stripe and/or Razorpay

Object storage:
  Backblaze B2 / Cloudflare R2 / Hetzner

DNS:
  Cloudflare API
```

## Development phases

### Phase 1: Single-node MVP

```text
- Admin login
- Plan creation
- User/project management
- Node registry with one all-in-one node
- App deployment via Docker
- Static file hosting
- Shared Postgres database provisioning
- Object storage provisioning
- Daily DB backup
- 6-hour control DB backup
- Basic usage metering
- Basic admin logs
```

### Phase 2: Multi-node support

```text
- Node agent
- Add/register more VPS nodes
- Scheduler
- Move app between nodes
- Move database using pg_dump/restore
- Node drain mode
- Better usage rollups
- Feature/limit overrides
```

### Phase 3: Production hardening

```text
- Build node separation
- Better backup verification
- Restore tests
- PgBouncer
- Role-based project collaboration
- Alerting
- Abuse controls
- Custom domains
- SSL automation
- More advanced migration workflows
```

### Phase 4: Scale architecture

```text
- Dedicated app nodes
- Dedicated database nodes
- Dedicated Business plan nodes
- HA database options
- PITR
- Kubernetes optional later
```

---

# 21. Important implementation rules

The development team should follow these rules:

```text
1. Do not hardcode resources to one VPS.
2. Every app, database, bucket, and static site must have a node/resource mapping.
3. Every resource must be movable.
4. Every action must be logged.
5. Every backup must have status and checksum.
6. Never delete old backup before new backup is verified.
7. Never give users Postgres superuser access.
8. Never put app and database in the same Docker container.
9. Do not give unlimited CPU, RAM, logs, storage, or egress.
10. Control plane must be restorable from backup.
11. User uploads should go to object storage, not VPS disk.
12. Admin overrides must take precedence over plan defaults.
13. The platform should continue running user apps even if dashboard is temporarily down.
```

## Final architecture decision

Start with:

```text
Single VPS:
  control plane + admin dashboard + apps + shared Postgres + static hosting
External:
  object storage + backups
```

But build the software model as:

```text
multi-node control plane + node agents + scheduler + movable workloads
```

That lets you start cheap, then scale without rewriting the platform.
