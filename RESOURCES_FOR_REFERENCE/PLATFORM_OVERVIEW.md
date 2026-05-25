# Swyftstack — Platform Overview

> Architecture, features, workflows, and user flows. Keep updated as behaviour
> changes. Companion to `Initial_Architecture.md` (the original spec) and
> `CODEBASE_OVERVIEW.md` (where the code lives).

## 1. What it is

Swyftstack is an **admin-first control plane** for a small PaaS/DBaaS. It manages
VPS worker nodes and allocates app hosting, PostgreSQL databases, object
storage, usage limits, backups, logs, and migrations to users/projects. The VPS
machines are worker nodes; the control plane is the product.

Single-node MVP, multi-node by design — every app/db/bucket/static site maps to
a node and is movable, so scaling out never requires a rewrite.

## 2. Components

| Component | Role |
|---|---|
| `swyftstack-platform` | Admin dashboard + control API (auth, RBAC, plans, limits, resource actions). |
| `swyftstack-workers` | Job worker + scheduler. Runs deploys, backups, metrics, usage rollups, enforcement, threshold notifications, email delivery. |
| `swyftstack-userapp` | Customer view of their projects/apps/databases (role-gated). |
| `swyftstack-shared` | Schema, services, job runtime, and all business logic. |
| Postgres (control) | Source of truth for the whole platform. |
| Postgres (customer) | Shared instance hosting isolated per-project databases. |
| Object storage | `local_dev` filesystem in MVP; B2/R2/Hetzner via same interface. |

## 3. Plans

| | Starter ($9/mo) | Pro ($49/mo) | Business/Custom |
|---|---|---|---|
| Projects | 1 | 10 | admin-set |
| vCPU-hours/mo | 100 (360k s) | 1000 (3.6M s) | admin-set |
| Databases | 1 | 10 | admin-set |
| Storage buckets | 1 | 10 | admin-set |
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

Customer-created databases use the same path from `/console` and project pages.
Password rotation is a `rotate_database_password` worker job. Connection
strings are generated from the admin-configured `database_gateway_domain` when
present; otherwise the customer UI warns that it is falling back to the selected
cluster host.

### Import an existing database

Customer import jobs are always worker-driven and source-safe:
`queued → testing_connection → estimating_size → creating_target → dumping →
uploading_dump_optional → restoring → verifying → switching → completed`.
The source URL is encrypted at rest, masked in logs, discarded after completion
unless the user opts to keep it, and only read through `pg_dump` / metadata
queries. If local `pg_dump`/`pg_restore` is missing, the import is recorded as a
clear local-dev simulation.

### Provision object storage

Customers create buckets from project creation or project storage tabs. The
request validates `object_storage`, `max_storage_buckets`, and object capacity,
creates a `storage_buckets` row in `provisioning`, and enqueues
`create_storage_bucket`. The worker selects an admin-configured object storage
provider through provisioning defaults, creates the bucket/prefix, creates
scoped credentials, encrypts the secret, and marks the bucket active.

The console file browser supports upload/list/download/delete, public object
flags, signed URL generation, and key rotation for the `local_dev` provider.
Customers see Swyftstack API/gateway endpoints and scoped credentials, never
provider master credentials. Full S3-compatible gateway support remains a later
gateway task.

### Backups
`backup_database` / `backup_control_db` jobs: create job → `pg_dump -Fc` →
upload → verify checksum → mark `verified` → only then prune older verified
backups. Control-plane DB backs up every 6h, retained ≥7 days. The scheduler
also enqueues `schedule_database_backups` hourly for customer databases whose
plan includes backups. Restore jobs create a safety backup before the MVP
restore path, then emit project activity and queued email notifications.

### Usage metering & enforcement
Containers/builds emit `usage_events`. `collect_usage` rolls them into the open
`usage_period`. `enforce_limits` evaluates effective limits:
- ≥80% → warning (audit)
- ≥100% → block new builds/deploys
- ≥110% → suspend dynamic runtime (unless overage/override) → `suspend_project`

`check_usage_thresholds` runs after rollups every 15 minutes. It checks database
storage, object storage and egress against effective plan limits, creates only
the highest newly crossed threshold (75/90/100) per billing period, and records
`usage_threshold_events.idempotency_key` to prevent duplicates. Email delivery
is queued through `send_email`, not sent from request handlers.

### Notifications and transactional email

Customer notifications live in `notifications`; delivery attempts live in
`notification_deliveries`; preferences live in `notification_preferences`.
The customer console shows a notification bell and `/console/notifications`.

Admin → Settings → Email providers configures ZeptoMail/local-dev/webhook
providers. ZeptoMail API tokens are AES-256-GCM encrypted. Google OAuth
first-time signup creates one welcome notification/email via a deterministic
`welcome:google:<user_id>` idempotency key.

### Migration between nodes
`POST /api/admin/migrations` → `migrations` row + job → worker re-points the
resource's `node_id`, keeping the source until `verifying`→`completed`; failures
mark `failed` (rollback-able).

### Node drain (auto-migrate)
Admin "Drain" → `nodeDrainService.startDrain(nodeId)`: marks the node
`draining`, walks its live apps + databases + static sites, picks a target
for each via `provisioningPolicyService.selectTarget(...)` (excluding the
source node), and enqueues one `migrate_app` / `migrate_database` job per
workload. Drain progress is derived from `migrations` rows where
`source_node_id = nodeId`; the Drain tab in the admin node detail surfaces
in-flight / blocked / completed counts and per-workload errors. After every
successful migration the handler calls `finalizeIfDrained`, which moves the
node to `disabled` once nothing remains.

### Node health
Scheduler enqueues `collect_node_metrics` every 30s. Missed heartbeats:
>60s → `degraded`, >180s → `offline` (audited; affected workloads visible).

### Payment failure path (designed, not wired)
Day 0 fail → Day 3 warn → Day 7 suspend builds → Day 14 stop apps → Day 30
delete after final backup (`delete_project` takes a final DB backup first).

## 5. User flows

- **Admin**: sign in (`isPlatformAdmin`) → Overview → manage nodes, plans,
  users, projects, view usage/jobs/backups/audit, trigger backups/migrations,
  suspend/unsuspend, edit limits/overrides, configure platform domains
  (`database_gateway_domain`, `storage_gateway_domain`, `app_domain`,
  `console_domain`).
- **Customer**: sign up → verify email → personal organization + default plan
  → `/console`. Console sections cover overview, projects, databases, storage,
  backups, migrations, usage, team, settings, and billing placeholder. Project
  creation only asks for a name (placement comes from provisioning defaults);
  it can create/import a database and create a bucket while jobs run in the
  background. The database detail page includes a **read-only browser**:
  table list, paginated rows with a no-code filter builder, and a SQL runner
  restricted to SELECT-style statements with a 5s timeout. Team invites
  support pending/resend/revoke/accept. Usage alerts appear in the notification
  bell and inbox, with email sent only when verified email + preferences allow it.
- **Public visitor**: lands on `/` (marketing), can read `/platform`,
  `/pricing`, `/blog`, `/announcements`, `/comparisons/*`. Marketing content
  is served from `cms_marketing_pages` (admin → CMS). Only `published` rows
  are publicly visible; previews use a short-lived HMAC token.

## 6. Security model

- Secrets (env vars, DB passwords, storage keys, node tokens) encrypted with
  AES-256-GCM before storage; master key stays in env, not the DB.
- Admin endpoints require an admin session; internal worker calls use a bearer
  token. Destructive UI actions are explicit buttons (confirmation-ready).
- Customer DB roles are never superuser and cannot reach other tenants' DBs.
- Customer-visible secrets are masked by default and reveal/copy only.
- Verification, password-reset and invitation tokens are hashed at rest.
- Transactional email provider credentials are encrypted; API tokens are never
  logged and emails are delivered by worker jobs.
- Every admin/system action is appended to immutable `audit_logs`.

## 7. MVP boundaries / next steps

- Real node-agent (placeholder install script today; services are interface-
  ready for HTTPS/mTLS).
- Real object storage gateway/S3-compatible API for B2/R2/Hetzner behind the
  existing `StorageProvider` interface. Today local-dev file browser and signed
  URL APIs are real; remote provider clients remain interface-ready.
- Live billing (Stripe/Razorpay) — schema present, not wired.
- PgBouncer, PITR, dedicated nodes, HA — Phase 3/4.
