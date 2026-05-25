# Swyftstack — Infra Control Plane

Admin-first orchestration platform for a small PaaS/DBaaS. Manages VPS worker
nodes and allocates app hosting, PostgreSQL databases, object storage, usage
limits, backups, logs, and migrations to users/projects. Multi-node by design.

See `RESOURCES_FOR_REFERENCE/` for the architecture (`PLATFORM_OVERVIEW.md`) and
code map (`CODEBASE_OVERVIEW.md`).

## Architecture overview

```
swyftstack-shared/   Prisma schema, services, job runtime, pure business logic
swyftstack-platform/ Admin control plane (Next.js, :3000) + control API
swyftstack-workers/  Long-running job worker + periodic scheduler
swyftstack-userapp/  Customer-facing app (Next.js, :3001)
```

- **Control plane** (`swyftstack-platform`) — admins manage users,
  organizations, projects, plans and all infrastructure. Nodes, database
  clusters, storage/backup providers, worker configs and provisioning defaults
  live under one **Infrastructure** hub (Overview · Nodes · Database Clusters ·
  Object Storage · Backup Storage · Worker Configs · Provisioning Defaults ·
  Help). Server components read Prisma directly; mutations are server actions.
- **Customer app** (`swyftstack-userapp`) — customers manage projects, apps,
  databases (create + import), object storage and view their own usage.
- **Worker** (`swyftstack-workers`) — claims jobs from a Postgres-backed queue
  (race-safe `updateMany` lock, exponential-backoff retry) and runs every
  long task: deploys, backups, metric collection, rollups and DB imports.
- **Shared** (`swyftstack-shared`) — one Prisma schema, one set of services,
  one job handler registry, imported by the platform, worker and user app.
- **Multi-node ready** — every app/database/bucket carries a `node_id` and is
  movable via `migrations`. Customer database clusters, object storage and
  backup targets are **DB-managed** (the `infrastructure_providers` family of
  tables) and configured from the control plane — never from env vars.

### How monitoring works

- The worker collects metrics on a schedule: node metrics every 30s, app
  metrics every 60s, database metrics every 120s, storage metrics every 300s.
  **The worker (`npm run dev:worker`) must be running for charts to update** —
  without it no new samples are written.
- Raw samples land in `node_metrics`, `app_metrics`, `database_metrics`,
  `storage_metrics` (plus `build_metrics` per deployment). Samples are always
  **inserted** (time-series), never overwritten.
- Node metrics carry CPU %, load average, RAM/disk totals + used, network
  counters, Docker container counts and DB/proxy health.
- Each collection updates the node's `last_metric_at`. `markStaleNodes`
  re-derives node status from that timestamp: **active** when fresh,
  **degraded** when older than 60s (stale warning), **offline** beyond 180s.
  An offline node automatically recovers to active once metrics resume.
- The `rollup_metrics` job (every 120s) pre-aggregates raw samples and
  `usage_events` into `metric_rollups` — hourly and daily buckets across ten
  scopes (platform, node, organization, user, project, app, database, bucket,
  backup, build). Dashboards read these rollups, not the raw time-series.

### How usage metering works

- Collectors emit `usage_events` (vCPU-seconds, bandwidth in/out, storage,
  egress) attributed to org / user / project / app / database / bucket / node.
- `collect_usage` aggregates events into `usage_rollups` for the open
  `usage_period`; `enforce_limits` applies the 80/100/110 state machine against
  effective limits (plan defaults + `limit_overrides`, precedence
  `service > project > user > organization > plan`).
- Bandwidth (`*_network_in_bytes` / `*_network_out_bytes`) is tracked at node,
  app, storage and database level. Node-level bandwidth is accurate from the
  host counters; app/storage/database bandwidth uses runtime counters where
  available — see the `TODO(proxy-accounting)` note in `services/metrics.ts`.

### How node auto-discovery works

When a node is added, only connection details are stored. Discovery then:

1. Establishes the connection (SSH for a remote VPS, local exec for the
   control host).
2. Probes the host and detects CPU cores/model, RAM, disk + mount points, OS,
   kernel, architecture, Docker version, IPs, uptime and network interfaces.
3. Stores results on `nodes` + `node_hardware_snapshots`, replacing
   `node_network_interfaces` and `node_disk_mounts`.
4. Shows the detected hardware so the admin can confirm roles and activate.

If discovery fails the node stays out of `active` with a clear error. CPU/RAM/
disk are **never entered by hand** — capacity can be overridden later if needed.

Every node carries a stable `node_key`. The single local control-plane node is
always `local-dev` (also `is_local` + `is_protected`); remote nodes derive a
stable key from agent id / machine-id / provider instance id. Because identity
is stable, re-running the seed or discovery **upserts the same row** — it never
creates duplicate local nodes. A duplicate left over from an older build is
archived by the seed (if it has no workloads) so it can be deleted from the UI.

### How provisioning defaults work

New customer resources are not pinned to "the first active node/cluster". Each
resource type (`app`, `build`, `database`, `static`, `object_storage`,
`backup`) has a **provisioning policy** (`provisioning_policies`) with one or
more **targets** (`provisioning_targets`) — a node, database cluster or storage
provider, each with a priority, weight and optional max-usage cap.

When a customer creates a resource, `ProvisioningPolicyService.selectTarget()`
picks a healthy target using the policy's strategy (`least_used`,
`weighted_round_robin`, `capacity_available`, `random_healthy` or
`manual_priority`). If no policy or healthy target exists it falls back to the
previous least-loaded behaviour, so the platform always stays bootable.

## Prerequisites

- Node.js ≥ 20
- PostgreSQL 16 — `npm run docker:up`, or any local/remote Postgres
- Optional: Docker (real containers + container metrics) and the Postgres
  client tools `pg_dump` / `pg_restore` (real database imports). Without them,
  those operations run in **simulated** mode and the control plane still works.

## Setup

```bash
cp .env.example .env       # a working dev .env may already be present
npm install                # install all workspaces
npm run docker:up           # start control-plane Postgres (skip if you have one)
npm run db:generate         # generate the Prisma client
npm run db:repair           # apply additive app migrations safely (safe to rerun)
npm run db:push             # apply the schema   (or: npm run db:migrate)
npm run db:seed             # admin + plans + local node + providers + help docs
```

Admin credentials come from `.env` (`PLATFORM_ADMIN_EMAIL` /
`PLATFORM_ADMIN_PASSWORD`).

The Prisma workspace scripts load the repo-root `.env` themselves. You no
longer need to run `set -a; source .env; set +a` before `db:push`; shell-sourcing
can fail when a Postgres URL contains unquoted `&` query parameters. If you do
source `.env` manually, quote `DATABASE_URL` and `DIRECT_URL`.

## Run everything in dev

Each in its own terminal:

```bash
npm run dev:admin     # http://localhost:3000   admin control plane
npm run dev:user      # http://localhost:3001   customer app
npm run dev:worker    # background worker + scheduler (monitoring, jobs)
```

`dev:platform` / `dev:workers` / `dev:userapp` are aliases.

## Migrations & seeds

```bash
npm run db:generate   # regenerate the Prisma client after a schema change
npm run db:repair     # apply additive app migrations without a full Prisma diff
npm run db:push       # sync the schema to the DB (dev)
npm run db:migrate    # create + apply a named migration (prisma migrate dev)
npm run db:seed       # idempotent seed (safe to re-run)
```

If `db:push` warns about the existing `invitations.token_hash` unique index,
check for duplicates first:

```sql
select token_hash, count(*)
from invitations
group by token_hash
having count(*) > 1;
```

If no rows are returned, rerun with Prisma's explicit acknowledgement:
`npm -w swyftstack-shared run prisma:push -- --accept-data-loss`.

`db:seed` is fully idempotent. It upserts the admin, Starter/Pro plans, the
single `local-dev` node, local infrastructure providers and the six default
provisioning policies. Re-running it **never** creates a second local node — it
dedupes any local-looking rows onto the canonical `local-dev` node and archives
empty duplicates. If a duplicate still has workloads the seed prints a warning
and leaves it for you to migrate, then archive/delete from the Nodes page.

## Test

```bash
npm test              # pure-logic vitest suite (no DB required)
```

Covers effective-limit resolution, override precedence, DB-provisioning SQL,
job-retry backoff, backup-state transitions, usage enforcement and the node
hardware-discovery parser.

## Operations guide

### Add a node (dev)

1. Admin → **Nodes → Add node**. Enter name, provider, and either
   `local` mode (the control host) or SSH host/user/port + private key.
2. Open the node → **Test connection & detect hardware**.
3. Review the detected CPU/RAM/disk/OS/Docker summary.
4. Confirm roles → **Activate**. The node is now schedulable.

To register a remote VPS, generate a key and add the public half to the server:

```bash
ssh-keygen -t ed25519 -C "swyftstack-node" -f ~/.ssh/swyftstack_node
ssh-copy-id -i ~/.ssh/swyftstack_node.pub root@<VPS_IP>
# paste the PRIVATE key (~/.ssh/swyftstack_node) into the Add-node form
```

If SSH says `invalid format`, the saved value is not a usable private key. Use
the node **Configuration** tab to paste the full private key again; Swyftstack
accepts normal multiline keys and values containing escaped `\n` line breaks,
but it rejects `.pub` public keys.

### Node lifecycle (drain / disable / archive / delete)

The Nodes page row menu offers the full lifecycle:

- **Drain** — marks the node `draining` **and** auto-enqueues migrations for
  every live app, database and static site on it. Targets are chosen by the
  matching `ProvisioningPolicy` (`app` / `database` / `static`), with the
  source node excluded from candidates. The node's **Drain** tab shows the
  enqueued migrations, in-flight / completed counts, and any **blocked**
  workloads (no healthy alternative node). The drain can be retried (to pick
  up newly-arrived workloads) or cancelled while no migration is in flight.
  When every migration completes the node is moved to `disabled`
  (`finalizeIfDrained`), at which point you can archive it safely.
- **Disable** — reversible; safe on any node, including `local-dev`. Stops
  scheduling new resources without touching existing workloads.
- **Archive** — reversible; allowed once the node has no active workloads.
  Archived nodes are excluded from totals and the active table (capacity,
  health, totals all ignore them). Toggle **Show archived** on the Nodes
  page to surface a separate "Archived nodes" panel.
- **Delete** — permanent; allowed only when the node is **not protected** and
  has no active apps, databases, clusters, domains or in-flight migrations.
  If blocked, the UI says exactly which workloads to move first.
- **Force delete (dev)** — non-production escape hatch that removes even a
  protected or stuck node. Hidden in production.

The canonical `local-dev` node is `is_protected`, so it cannot be archived or
normal-deleted — but a leftover duplicate is **not** protected and can be
deleted normally. Admins are never trapped with an undeletable duplicate.

#### Drain workflow internals

- `nodeDrainService.startDrain(nodeId)` flips status, walks `apps` and
  `databases` whose `node_id = nodeId`, picks a target with
  `provisioningPolicyService.selectTarget(...)` and filters out the source.
- Each workload becomes one `migrations` row (`source_node_id = nodeId`) and
  one queued `migrate_app` / `migrate_database` job. The existing
  `migrationService.runMigration` re-points the resource's `node_id` once
  verification succeeds — no fake rsync work.
- The job handler calls `nodeDrainService.finalizeIfDrained(sourceNodeId)`
  after each successful migration so the node auto-transitions to `disabled`
  the moment the last workload moves.
- If no healthy target exists for a workload, the drain marks it **blocked**
  in `audit_logs.metadata.blockedDetail` so the admin sees an actionable
  reason ("no healthy target node — configure another node or relax
  provisioning targets") instead of a silent stall.

### Configure provisioning defaults

Provisioning policies decide where new customer resources land. The seed
creates one policy per resource type (`app`, `build`, `database`, `static`,
`object_storage`, `backup`), each pointing at the local node / cluster /
provider. Edit them in **Infrastructure → Provisioning Defaults**: pick a
strategy (least-used, weighted, capacity, random, manual priority), add/remove
targets, and set each target's priority, weight and max-usage cap — for example
a second `database` target with priority 2, weight 30 spreads new databases
across clusters. Each policy card shows a live **decision preview** ("would
pick …") and per-target health, so placement is verifiable at a glance.

### Add a database cluster

Admin → **Infrastructure → Database Clusters**. Provide a name and the admin
connection string (`postgresql://admin:pw@host:5432/postgres`) plus host/port/
region. The connection string is AES-256-GCM encrypted at rest. New customer
databases are placed via the `database` provisioning policy (see above).

### Add a storage provider

Admin → **Infrastructure → Object Storage** (or **Backup Storage**). Pick
the provider, endpoint, region and paste the keys (encrypted on submit).
**Help → Storage providers** has step-by-step guides for Backblaze B2,
Cloudflare R2, Hetzner Object Storage and OVHcloud, including endpoint formats,
path-style requirements and common errors.

### Test a local-dev backup

```bash
npm run dev:worker    # the worker must be running
```

Admin → a database → **Create backup** (or the scheduled control-plane backup
every 6h). Backups write to `DEV_LOCAL_BACKUP_ROOT` via the default
`local_dev` backup provider; an older backup is never pruned before a newer
one is `verified`.

### Test database creation

1. Customer app → a project → **New database**.
2. Plan limits are checked, a cluster is selected, credentials are generated
   and encrypted, and a `create_database` job is enqueued.
3. The database detail page shows host, port, username, a reveal/copy password
   field, the full `DATABASE_URL`, SSL mode, size and backup status.

### Test database import from URL

1. Customer app → a project → **Import database**.
2. Enter a source `postgresql://…` URL and a target name.
3. An `import_database_from_url` job runs in the worker:
   `queued → testing_connection → estimating_size → creating_target → dumping
   → uploading_dump_optional → restoring → verifying → switching → completed`.
4. The Imports tab shows the live status; the source URL is encrypted, masked
   in every log line, and discarded on completion unless you keep it. With
   `pg_dump`/`pg_restore` installed the transfer is real; otherwise the steps
   are simulated and clearly logged.

## Customer console MVP

### Auth and onboarding

Customers can sign up at `/signup`, sign in at `/login`, reset passwords via
`/forgot-password` → `/reset-password`, and open the console at `/console`.
Signup creates:

1. `users` row with scrypt password hash.
2. Personal `organizations` row.
3. Owner `organization_members` row.
4. Default subscription using `DEFAULT_CUSTOMER_PLAN_SLUG` (Starter by seed).
5. Email verification token stored as a hash in `email_verification_tokens`.

Verification/reset/invite tokens are never stored plaintext. In development,
email messages and links are printed to logs when `EMAIL_WEBHOOK_URL` is empty.
In production, `EMAIL_WEBHOOK_URL` is required.

### Project creation

`/projects/new` only asks for:

- project name
- database mode (create new / import existing / skip)
- optional database name + password (auto-generated if omitted)
- optional bucket name + public flag

**No region / location field.** Placement of the database, storage bucket and
future app workloads is decided entirely by the `ProvisioningPolicy` rows
configured in **Admin → Infrastructure → Provisioning Defaults**. The
`Project.region` column is left null on new projects — older projects keep
their region but it is informational only.

The project can remain `provisioning` while independent `create_database`,
`import_database_from_url`, and `create_storage_bucket` jobs run. If one
resource fails, the project becomes `partially_failed` instead of disappearing.

Plan checks enforce max projects, max databases, max storage buckets, database
capacity, object storage capacity, and disabled plan features.

### Database GUI (browse / SQL / stats)

Each customer database page now has a **Browse data** panel powered by three
new services in `swyftstack-shared`:

- `DatabaseIntrospectionService` (`listTables`, `describeTable`, `getStats`)
  — pulls schema info from `information_schema` + `pg_*` system catalogs.
- `DatabaseBrowseService.browseTable` — paginated row viewer with a no-code
  filter builder. Filters are validated against the introspected columns
  (unknown columns are rejected) and applied as parameterized SQL.
- `DatabaseQueryService.runQuery` — a read-only SQL runner. DDL/DML keywords
  (`DROP/DELETE/UPDATE/INSERT/ALTER/TRUNCATE/CREATE/GRANT/REVOKE/VACUUM/
  REFRESH/COPY`) are rejected before the statement leaves the userapp, and
  every query is wrapped in `BEGIN; SET LOCAL statement_timeout = 5000;
  SET TRANSACTION READ ONLY; …; COMMIT` so the database itself refuses any
  write that slips past the parser. Result rows are capped at 1000 with a
  `truncated` flag returned to the UI.

Everything goes through `/api/db-browse` (POST, JSON action envelope) so
membership and rate-limit checks happen on the server. Each successful query
is recorded in `project_activity_logs` for audit. Databases without an
assigned cluster (`databaseClusterId == null`) return an empty browser
instead of error — same simulated-mode pattern as the rest of the local-dev
stack.

### Database management

Database detail pages show masked/revealable host, port, DB name, username,
password, full `DATABASE_URL`, SSL mode, storage used, backup status, and
copyable framework snippets for `.env`, Prisma, Drizzle, Node `pg`, SQLAlchemy,
and `psql`.

Password rotation enqueues `rotate_database_password` and is performed by the
worker. The generated SQL creates non-superuser roles, revokes public DB/schema
access, grants only the tenant user, sets connection limits, and sets statement
and idle transaction timeouts.

If `database_gateway_domain` is set in Admin → Settings → Platform domains,
customers see that gateway host. If not, the UI warns that cluster host fallback
is being shown.

### Backups and restore

The scheduler enqueues `schedule_database_backups` hourly; eligible active
databases receive `backup_database` jobs based on plan backup settings. Backups
use `pg_dump -Fc` when available and otherwise write a clearly simulated dump.
Old verified backups are pruned only after a new backup verifies.

Restore requests enqueue `restore_database`; the worker creates a pre-restore
safety backup first, then performs the MVP restore path (currently simulated
unless provider-specific `pg_restore` is wired). Backup/restore completion or
failure queues transactional email through the notification delivery system.

### Object storage

Users can provision buckets, rotate scoped bucket credentials, upload/list/
download/delete files, toggle object public state, and copy signed download
URLs. The local-dev provider writes objects under `DEV_LOCAL_STORAGE_ROOT`;
provider master keys remain internal and are never shown to customers.

Customer-visible storage endpoints come from Admin → Settings →
`storage_gateway_domain` when configured. Without a storage gateway, the console
uses the user app API (`/api/storage/object`, `/api/storage/signed`,
`/api/storage/public`) and labels this as local-dev/API mode. Full
S3-compatible gateway support is intentionally not claimed yet.

### Notifications and transactional email

The customer console has an in-app notification bell and `/console/notifications`
inbox. Notifications are stored in `notifications`; delivery attempts are stored
in `notification_deliveries`; per-user choices live in
`notification_preferences`.

The worker job `check_usage_thresholds` runs every 15 minutes after rollups. It
checks effective plan limits for database storage, object storage and egress,
then creates only the highest newly crossed threshold in the current billing
period: 75%, 90% or 100%. Duplicate threshold notifications are blocked by a
deterministic `usage_threshold_events.idempotency_key`.

Transactional email is never sent directly from request handlers. Web requests
create notification/email delivery rows and enqueue `send_email`; workers render
templates and deliver them. Google OAuth first-time signup creates exactly one
welcome notification/email using the `welcome:google:<user_id>` idempotency key.

Email providers are configured from Admin → **Settings → Email providers**:

- `zeptomail` provider: encrypted API token, API URL, from email/name, test
  connection and queued test email.
- `local_dev` provider: logs email content in the worker for development.
- env fallback: `ZEPTOMAIL_API_URL`, `ZEPTOMAIL_API_KEY`,
  `ZEPTOMAIL_FROM_EMAIL`, `ZEPTOMAIL_FROM_NAME`.

ZeptoMail's API token is encrypted with `SECRET_ENCRYPTION_KEY` and is never
logged. Usage-limit email is skipped for unverified users unless the message is
explicitly essential, such as email verification or password reset.

### Teams

`/team` supports owner/admin invites by email, role selection
(`admin`, `developer`, `billing`, `viewer`), optional project scope, pending
invite list, resend, revoke, and `/invite/accept`. Invite tokens are hashed at
rest and expire after 7 days.

## Public marketing app + console split

`swyftstack-userapp` is now Swyftstack's public website **and** the customer
console, in one Next.js app:

- `/` → marketing landing (public)
- `/platform` → product page (public)
- `/pricing` → public pricing from active `plans` rows
- `/blog`, `/blog/[slug]` → CMS blog
- `/announcements`, `/announcements/[slug]` → CMS announcements / news / changelog
- `/comparisons/[slug]` → CMS comparisons
- `/console` → authenticated customer dashboard (was `/`)
- `/projects`, `/databases`, `/storage`, `/backups`, `/billing`, … →
  authenticated console resources (each still calls `requireUser()`)

Marketing pages render with `<MarketingShell>` (header / footer / SEO);
console routes keep the existing `<UserShell>` sidebar. The two layouts share
nothing — admin code never imports into marketing pages.

The app still ships as a normal Next.js app:

```bash
npm run dev:user       # alias of dev:userapp — Next dev on :3001
npm run build          # build all workspaces
```

### CMS — content for the marketing app

Admin → **CMS** (sidebar group "Marketing") manages every marketing page,
blog post, comparison and announcement. Single table: `cms_marketing_pages`.

- **Types:** `landing_page · page · blog · testimonial · comparison ·
  announcement · news · changelog · docs · faq`
- **Statuses:** `draft · published · archived` — only `published` is publicly
  visible. Slug uniqueness is enforced per `(type, slug)`.
- **Editor:** TipTap (`@tiptap/react` + `starter-kit`, `link`, `image`,
  `placeholder`). The doc is stored as `content_json`; rendered HTML is also
  cached in `content_html` for crawler-friendly SSR.
- **SEO fields:** `seo_title`, `seo_description`, `og_image_url`,
  `canonical_url`. Used by `generateMetadata` on every public route.
- **Preview:** the admin edit page exposes a **Preview** button that signs a
  short-lived `?preview=…` HMAC; the public route then renders the draft
  without exposing it via the normal URL.

Images and assets uploaded from the TipTap editor POST to
`/api/cms/upload` (admin-only), which writes via `platformBucketService` —
**never** a customer bucket — and returns a long-lived signed URL.

### Platform bucket

`platform_settings` keys configure where platform-owned assets live:

| Key | Meaning |
|---|---|
| `platform_bucket_provider_id` | uuid of an `object_storage_providers` row |
| `platform_bucket_name` | bucket name (default `platform`) |
| `platform_bucket_prefix` | path prefix (default `platform`) |
| `platform_bucket_id` | populated automatically after first use |

Admin → **Settings → Platform bucket** wires these. The first call to
`platformBucketService.ensurePlatformBucket()` creates a `storage_buckets`
row owned by a system org named `__platform__` (so customers are never
billed for it) and materialises the on-disk folder via the existing storage
provider. Asset paths are:

```
/<prefix>/marketing_data/<yyyy>/<mm>/<uuid>-<sanitised-filename>
```

The same helper can later host email assets at `/<prefix>/email_assets/...`.

## Commands

```bash
# Schema / migrations
npm run db:migrate     # prisma migrate dev
npm run db:repair      # additive safe repair/sync for existing dev DBs
npm run db:push        # prisma db push (remote schema sync)
npm run db:generate    # prisma generate
npm run db:seed        # seed plans, providers, policies, local-dev node

# Apps
npm run dev:admin      # admin control-plane (Next, :3000)
npm run dev:user       # public marketing + customer console (Next, :3001)
npm run dev:worker     # background job worker
npm run docker:up      # bring up local Postgres

# Tests / build
npm test               # vitest run on swyftstack-shared
npm run build          # tsc + next build across all workspaces
```

### Local test checklist

```bash
npm run db:migrate
npm run db:seed
npm run dev:user
npm run dev:worker
```

Then test:

1. Create a customer at `/signup`; copy the dev verification link from logs and
   open it.
2. Open `/console`; create a project with a new DB and bucket.
3. Watch worker jobs complete in the admin Jobs page or worker logs.
4. Open the DB detail page; copy masked snippets, reveal/copy password, rotate
   password, create a backup, and restore a verified backup.
5. Create another project/resource to confirm Starter limit errors.
6. Create a project with **Import existing PostgreSQL database** and watch the
   migration status/logs.
7. Open the bucket detail page; upload, list, download, make public/private,
   copy a signed URL, and delete a file.
8. Invite a teammate at `/team`, copy the dev invite link from logs, and accept.
9. Configure Admin → Settings → Email providers. Queue a test email, then watch
   the `send_email` job and recent delivery status.
10. To test thresholds, set a low plan limit or user/org limit override, create a
    usage rollup/event above 75%, then enqueue `check_usage_thresholds` from the
    Jobs table or let the worker scheduler run.

## Configuration (.env) — control-plane only

`.env` holds **only** what the control plane needs to boot. Customer Postgres
clusters, object storage, backup targets and worker tuning are DB-managed and
edited from the admin **Infrastructure** page.

| Key | Meaning |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Control-plane Postgres (the only DB URLs in env) |
| `SECRET_ENCRYPTION_KEY` | 32-byte base64 key for AES-256-GCM secrets |
| `AUTH_SECRET` | Session cookie signing |
| `INTERNAL_API_TOKEN` | Bearer token for worker → control-plane calls |
| `PLATFORM_ADMIN_EMAIL/PASSWORD` | Seeded bootstrap admin |
| `PLATFORM_BASE_URL` / `USERAPP_BASE_URL` | App URLs |
| `DEFAULT_CUSTOMER_PLAN_SLUG` | Plan assigned to new customer workspaces (default `starter`) |
| `EMAIL_FROM` / `EMAIL_WEBHOOK_URL` | Legacy queued webhook fallback for transactional email |
| `ZEPTOMAIL_API_URL` / `ZEPTOMAIL_API_KEY` | Optional env fallback; production should use Admin → Settings email providers |
| `ZEPTOMAIL_FROM_EMAIL` / `ZEPTOMAIL_FROM_NAME` | Optional ZeptoMail env fallback sender |
| `DEV_LOCAL_STORAGE_ROOT` / `DEV_LOCAL_BACKUP_ROOT` | Seed paths for `local_dev` providers |
| `DEFAULT_WORKER_*` | Fallback worker tuning if no `worker_configs` row exists |

## Implementation notes

- ORM: **Prisma**. Jobs: Postgres-backed queue, race-safe claim, backoff retry.
- Monitoring, usage collection, rollups, backups and DB imports run in the
  worker — never in a web request handler.
- Transactional email delivery also runs in the worker through `send_email`;
  request handlers only queue delivery rows/jobs.
- Node execution uses local Docker / system SSH for the MVP; service interfaces
  are written as if a remote node-agent will fulfil them later.
- All secrets are encrypted before persistence; every state change writes an
  audit log.
