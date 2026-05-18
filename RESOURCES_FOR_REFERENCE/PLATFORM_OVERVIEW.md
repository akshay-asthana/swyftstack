# Quickdock — Platform Overview

> Architecture, features, workflows, and user flows. Keep updated as behaviour
> changes. Companion to `Initial_Architecture.md` (the original spec) and
> `CODEBASE_OVERVIEW.md` (where the code lives).

## 1. What it is

Quickdock is an **admin-first control plane** for a small PaaS/DBaaS. It manages
VPS worker nodes and allocates app hosting, PostgreSQL databases, object
storage, usage limits, backups, logs, and migrations to users/projects. The VPS
machines are worker nodes; the control plane is the product.

Single-node MVP, multi-node by design — every app/db/bucket/static site maps to
a node and is movable, so scaling out never requires a rewrite.

## 2. Components

| Component | Role |
|---|---|
| `quickdock-platform` | Admin dashboard + control API (auth, RBAC, plans, limits, resource actions). |
| `quickdock-workers` | Job worker + scheduler. Runs deploys, backups, metrics, usage rollups, enforcement. |
| `quickdock-userapp` | Customer view of their projects/apps/databases (role-gated). |
| `quickdock-shared` | Schema, services, job runtime, and all business logic. |
| Postgres (control) | Source of truth for the whole platform. |
| Postgres (customer) | Shared instance hosting isolated per-project databases. |
| Object storage | `local_dev` filesystem in MVP; B2/R2/Hetzner via same interface. |

## 3. Plans

| | Starter ($9/mo) | Pro ($49/mo) | Business/Custom |
|---|---|---|---|
| Projects | 1 | 10 | admin-set |
| vCPU-hours/mo | 100 (360k s) | 1000 (3.6M s) | admin-set |
| Databases | 1 | 10 | admin-set |
| DB capacity | 5 GB | 50 GB | admin-set |
| Object storage | 25 GB | 500 GB | admin-set |
| Egress | 100 GB | 1 TB | admin-set |
| DB backups | 1 daily, latest only | daily, 7-day | custom |

Limits/features resolve with precedence **service > project > user >
organization > plan default**. `null` = unlimited; an `enabled:false` override
hard-zeros a limit.

## 4. Key workflows

### Deploy an app
Admin/API `POST /api/admin/projects/:id/apps` → creates `apps` + `deployments`
rows → enqueues `deploy_app` → worker builds (static = build output to disk;
dynamic = Docker container) → deployment `live` → audit log.

### DB-managed infrastructure (no customer infra in env)

`.env` is control-plane bootstrap only. Customer Postgres clusters, object
storage, backup targets, and worker tuning live in the control DB
(`infrastructure_providers`, `database_clusters`, `object_storage_providers`,
`backup_storage_providers`, `worker_configs`) and are managed from the admin
**Infrastructure** page. All provider credentials are AES-256-GCM encrypted.
`databases.database_cluster_id`, `storage_buckets.object_storage_provider_id`,
and `database_backups.backup_storage_provider_id` bind each resource to its
provider. The seed creates `local_dev` provider rows from the `DEV_*` paths.

### Provision a database
`POST /api/admin/projects/:id/databases` → validates `max_databases` /
`max_database_storage_bytes` against effective limits →
`databaseClusterService.selectClusterForProject` picks an **active** cluster
(region match, then least storage, then fewest DBs; disabled/full/degraded
excluded unless `?allowOverride=1`) → creates `databases` row bound to that
`database_cluster_id` with encrypted password → enqueues `create_database` →
worker connects using the cluster's decrypted admin URL and runs the generated
SQL (non-superuser role, connection limit, statement/idle timeouts, locked-down
`public` schema), then updates cluster usage. Isolation test: a project user
must fail to connect to another project's DB on the same cluster.

### Backups
`backup_database` / `backup_control_db` jobs: create job → `pg_dump -Fc` →
upload → verify checksum → mark `verified` → only then prune older verified
backups. Control-plane DB backs up every 6h, retained ≥7 days.

### Usage metering & enforcement
Containers/builds emit `usage_events`. `collect_usage` rolls them into the open
`usage_period`. `enforce_limits` evaluates effective limits:
- ≥80% → warning (audit)
- ≥100% → block new builds/deploys
- ≥110% → suspend dynamic runtime (unless overage/override) → `suspend_project`

### Migration between nodes
`POST /api/admin/migrations` → `migrations` row + job → worker re-points the
resource's `node_id`, keeping the source until `verifying`→`completed`; failures
mark `failed` (rollback-able).

### Node health
Scheduler enqueues `collect_node_metrics` every 30s. Missed heartbeats:
>60s → `degraded`, >180s → `offline` (audited; affected workloads visible).

### Payment failure path (designed, not wired)
Day 0 fail → Day 3 warn → Day 7 suspend builds → Day 14 stop apps → Day 30
delete after final backup (`delete_project` takes a final DB backup first).

## 5. User flows

- **Admin**: sign in (`isPlatformAdmin`) → Overview → manage nodes, plans,
  users, projects, view usage/jobs/backups/audit, trigger backups/migrations,
  suspend/unsuspend, edit limits/overrides.
- **Customer**: sign in → see projects they're a member of → open a project
  (gated by `project_members`) → view apps/databases/activity and the
  permissions their role grants (`owner/admin/developer/billing/viewer`).

## 6. Security model

- Secrets (env vars, DB passwords, storage keys, node tokens) encrypted with
  AES-256-GCM before storage; master key stays in env, not the DB.
- Admin endpoints require an admin session; internal worker calls use a bearer
  token. Destructive UI actions are explicit buttons (confirmation-ready).
- Customer DB roles are never superuser and cannot reach other tenants' DBs.
- Every admin/system action is appended to immutable `audit_logs`.

## 7. MVP boundaries / next steps

- Real node-agent (placeholder install script today; services are interface-
  ready for HTTPS/mTLS).
- Real object storage providers (B2/R2/Hetzner) behind the existing
  `StorageProvider` interface.
- Live billing (Stripe/Razorpay) — schema present, not wired.
- PgBouncer, PITR, dedicated nodes, HA — Phase 3/4.
