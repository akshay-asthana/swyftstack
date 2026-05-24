# Swyftstack — Codebase Overview

> Keep this file updated when files/modules are added or moved. It exists so the
> codebase can be understood without re-reading every file.

## Monorepo layout (npm workspaces)

```
Swyftstack/
├── package.json              # workspace root + scripts (db:*, dev:*, test)
├── docker-compose.yml        # local Postgres (control + optional customer DB)
├── .env / .env.example       # configuration (secrets, DB, worker, storage)
├── swyftstack-shared/         # shared library: schema, services, jobs, logic
├── swyftstack-platform/       # admin control-plane (Next.js, port 3000)
├── swyftstack-workers/        # long-running worker + scheduler
├── swyftstack-userapp/        # customer-facing app (Next.js, port 3001)
└── RESOURCES_FOR_REFERENCE/  # DB_SCHEMA.sql, *_OVERVIEW.md, architecture
```

`swyftstack-platform` and `swyftstack-workers` both import `swyftstack-shared`
(workspace dependency) so schema/services/business-logic live in exactly one place.

## swyftstack-shared (the core)

`src/`
- `env.ts` — zod-validated `process.env` (safe defaults for dev).
- `db.ts` — Prisma client singleton + re-exports generated types. Requires
  `npm run db:generate` first (`prisma/schema.prisma`).
- `crypto.ts` — AES-256-GCM `encryptSecret/decryptSecret`, `hashPassword`
  (scrypt), `hashToken`, `randomSecret`.
- `email.ts` — transactional email webhook + dev-log fallback.
- `auth-tokens.ts` — hashed email verification and password reset tokens.
- `constants.ts` — `FEATURE_KEYS`, `LIMIT_KEYS`, `USAGE_TYPES`, `NODE_ROLES`,
  `SCOPE_PRECEDENCE`, `PLAN_PRESETS` (Starter/Pro).
- `limits.ts` — **pure** effective-limit/feature resolution with override
  precedence `service > project > user > organization > plan`.
- `usage.ts` — **pure** 80/100/110 enforcement state machine.
- `permissions.ts` — **pure** role→permission matrix (`can`, `permissionsFor`).
- `dbsql.ts` — **pure** SQL generation for isolated customer DB provisioning.
- `backup-state.ts` — **pure** backup transition rules + safe-to-delete logic.
- `audit.ts` — `audit()` + `projectActivity()` writers (append-only).
- `usage-engine.ts` — DB-backed `rollUpUsage()` + `enforceLimits()`.
- `metrics-rollup.ts` — `rollUpMetrics()`: aggregates node gauges + usage
  events into `metric_rollups` (hourly/daily, 10 scopes) for fast dashboards.
- `node-discovery.ts` — **pure** SSH discovery probe + parser (CPU/RAM/disk/
  OS/Docker/interfaces/mounts). Backs §2 node auto-detection.
- `ssh-key.ts` — **pure** pasted private-key normalization/validation; fixes
  escaped-newline pastes and rejects public keys before encryption.
- `provider-help.ts` — **pure** storage/backup provider setup guides (B2, R2,
  Hetzner, OVH); seeded into `provider_help_docs`.
- `services/` — `types.ts` (interfaces) + implementations:
  `node.ts`, `app.ts`, `database.ts`, `storage.ts`, `backup.ts`, `migration.ts`,
  plus node-lifecycle + placement services:
  - `node-identity.ts` — `nodeDiscoveryService`: stable node identity. Derives
    a `nodeKey`, `upsertNodeByStableIdentity`, `registerLocalNode` (idempotent
    `local-dev`), `dedupeLocalNodes`, `backfillNodeKeys`. Prevents duplicate
    nodes (§1).
  - `node-deletion.ts` — `nodeDeletionService`: safe lifecycle —
    `listBlockingResources`, `canDeleteNode`, `archiveNode`, `deleteNode`,
    `forceDeleteNodeInDev` (§2).
  - `provisioning-policy.ts` — `provisioningPolicyService`: `getPolicy`,
    `resolveTargets`, `selectTarget`, `explainDecision` — picks where new
    resources are provisioned via `provisioning_policies/_targets` (§7).
  - `plan-resource.ts` — `planResourceService`: `getEffectivePlanResources`,
    `validateResourceAllowed`, `validateResourceLimit` (§9).
  - `platform-settings.ts` — DB-backed platform domains:
    `database_gateway_domain`, `storage_gateway_domain`, `app_domain`,
    `console_domain`.
  - `project-status.ts` — reconciles `provisioning` / `active` /
    `partially_failed` project state from child DB/import/bucket state.
  - `node.ts` also exports `markStaleNodes` (active/degraded/offline from
    `last_metric_at` freshness, §4).
  plus the **DB-managed provider services** (customer infra is not env-config):
  - `database-cluster.ts` — `databaseClusterService` (list/select/test/usage,
    `clusterAdminUrl`, `pgConnect`). Replaces `CUSTOMER_PG_*`.
  - `object-storage-provider.ts` — `objectStorageProviderService`,
    `storageProviderFor(providerId)`. Replaces `STORAGE_*`.
  - `backup-provider.ts` — `backupProviderService` (select/upload/verify).
    Replaces `BACKUP_*`.
  - `worker-config.ts` — `workerConfigService` (DB config + env fallback,
    30s cache). Replaces global `WORKER_*` (now `DEFAULT_WORKER_*` fallback).
  - `ssh.ts` — `sshNodeService` + `runNodeProbe` use local execution for
    `connection_mode=local` and the system `ssh` binary with encrypted pasted
    private keys for remote VPS probes/logs/streamed commands, logged to
    `node_connection_logs`.
  - `discovery.ts` — `discoveryService.discoverNode` runs hardware discovery
    (local or SSH), persists `nodes` fields + `node_hardware_snapshots` +
    interfaces + mounts; failure leaves the node out of `active`.
  - `metrics.ts` — `metricsService` collects app/database/storage metric rows
    and emits `usage_events` for billing + bandwidth.
  - `database-provision.ts` — `provisionDatabase`, `assertDatabaseLimit`,
    `databaseConnectionUrl` (shared cluster-select + connection-URL helpers;
    uses DB gateway domain when configured).
  - `database-import.ts` — `databaseImportService.runImport` (§11 external-URL
    PostgreSQL import: expanded status machine, masked logs, pg_dump/pg_restore).
  - `customer-storage.ts` — customer bucket provisioning, scoped credentials,
    local-dev file browser operations, signed storage URL HMAC helpers, storage
    limit enforcement.
  - `node-drain.ts` — `nodeDrainService`: `startDrain` flips a node to
    `draining` and auto-enqueues `migrate_*` jobs for every live app/db/
    static site (target picked via `provisioningPolicyService` with the
    source excluded). `drainStatus` / `cancelDrain` / `finalizeIfDrained`
    feed the admin Drain tab and the post-migration handler.
  - `database-browser.ts` — `databaseBrowserService` powering the user
    console DB GUI: `listTables`, `describeTable`, `browseTable` (paginated
    rows, parameterized WHERE built from validated filter operators), and
    `runQuery` (single-statement, blocks DDL/DML keywords, wraps every call
    in `BEGIN; SET LOCAL statement_timeout = 5000; SET TRANSACTION READ
    ONLY; …; COMMIT`; rows capped at 1000).
  - `cms.ts` — `cmsService`: CRUD + publish/unpublish/archive +
    `generatePreviewToken` / `verifyCmsPreviewToken` (HMAC). Backs the admin
    CMS pages and the public marketing routes.
  - `platform-bucket.ts` — `platformBucketService.ensurePlatformBucket()`,
    `uploadMarketingAsset()`, `platformAssetKey()`. Lazy-creates a system-
    owned `storage_buckets` row under the `__platform__` org so CMS assets
    never touch a customer bucket. Asset path is
    `/<prefix>/marketing_data/<yyyy>/<mm>/<uuid>-<file>`.
  `database.ts`/`backup.ts`/`storage.ts` resolve their target from these
  services; `jobs/worker.ts` is driven by `workerConfigService`.
- `jobs/` — `index.ts` (enqueue/claim/complete/fail/retry/cancel),
  `backoff.ts` (pure), `handlers.ts` (per-type handlers incl. discover/collect
  metrics, rollup_metrics, `create_storage_bucket`,
  `rotate_database_password`, `schedule_database_backups`,
  `import_database_from_url`), `worker.ts` (loop).
- `seed.ts` — idempotent: admin + Starter/Pro plans + the single `local-dev`
  node (dedupes/upserts by `node_key`, never duplicates) + local infrastructure
  providers + six default `provisioning_policies`.
- `__tests__/` — vitest specs (pure logic only; no DB needed).

Pure modules never import `db.ts`, so the test suite runs without Postgres or
`prisma generate`.

## swyftstack-platform (admin, Next.js App Router)

- `src/lib/auth.ts` — signed-cookie admin session (`login/logout/currentAdmin/
  requireAdmin`); enforces `isPlatformAdmin`.
- `src/lib/api.ts` — `authorize()` (admin session OR internal bearer token) +
  BigInt-safe `json()`.
- `src/lib/stats.ts` — shared usage/resource aggregation for detail pages.
- `src/lib/user-admin.ts` — workspace bootstrap + trial-aware plan assignment.
- `src/components/ui.tsx` — server kit: `Badge`, `StatCard`, `Panel`, `Table`,
  `Breadcrumbs`, `Modal`, `Drawer`, `KeyValue`, `ProgressBar`, `AreaChart`,
  `LineChart`, `BarChart`, `Donut`, `bytes()`.
- `src/components/client.tsx` — client kit: `DataTable` (search/sort/filter),
  `RowMenu`, `CopyButton`, `SecretField`, `Tabs`, `NodeTerminal`,
  `ConfirmButton`.
- `src/components/node-monitor.tsx` — client: live node metric charts that
  poll `/api/admin/nodes/[id]/metrics` (§4, stale warning + last-updated).
- `src/components/plan-resource-editor.tsx` — client: grouped plan resource
  toggles + limits; a resource's limit inputs disable when it is off (§9).
- `src/app/(dashboard)/*` — overview, users(+`[id]`), organizations(+`[id]`),
  projects(+`[id]`), apps, databases, buckets, plans, usage, jobs, backups,
  audit-logs, migrations, infrastructure, **cms**(+`new`/`[id]`), help,
  settings. Settings now also configures the platform bucket (provider,
  bucket name, prefix). `infra-overview` and `nodes` are redirects into the
  Infrastructure hub. List pages use `DataTable`. `RowMenu` (in
  `client.tsx`) renders its popover via `createPortal` so dropdowns escape
  table/card `overflow:hidden` parents.
- `infrastructure/` — the single Infrastructure hub (§5/§6). `page.tsx` is a
  query-param tab shell; `overview-section.tsx` (fleet capacity/health/top-N),
  `nodes-section.tsx` (node cards + table + add/lifecycle), `providers-section
  .tsx` (clusters/object/backup/workers), `provisioning-section.tsx` (§7
  provisioning policies + targets), `help-section.tsx`.
- `nodes/[id]` — onboarding (test → discover → confirm roles → activate) then
  tabbed overview/monitoring/workloads/**drain**/capacity/configuration/logs/
  events. The Drain tab lists `nodeDrainService.drainStatus(nodeId)`:
  migration jobs created, in-flight / completed / blocked counts, and
  retry / cancel actions. The monitoring tab is the polling `NodeMonitor`.
  Logs includes a streaming terminal backed by `node_connection_logs`.
- `users/[id]`, `organizations/[id]`, `projects/[id]` — comprehensive tabbed
  detail pages (usage, plan/trial, members, overrides, activity).
- `src/app/api/admin/*` — REST endpoints (overview, nodes[+drain+agent script,
  metrics (live monitoring poll), safe DELETE via NodeDeletionService,
  SSH test/probe/logs/services/command; command supports NDJSON streaming],
  plans, users, projects[+suspend/unsuspend/databases/apps], databases
  [+backup/restore], migrations, jobs[+retry], usage, audit-logs) and
  `infrastructure/{database-clusters,object-storage,backup-storage,worker-configs}`
  each with `[id]` (PATCH status / guarded DELETE) and `[id]/test`.

## swyftstack-workers

- `src/index.ts` — starts scheduler + `runWorker()` (from shared).
- `src/scheduler.ts` — in-process interval scheduler enqueuing recurring jobs
  (node metrics 30s, app metrics 60s, db metrics 120s, storage metrics 300s,
  usage 60s, rollup_metrics 120s, enforce 120s, database backup scheduler 1h,
  control backup 6h).

## swyftstack-userapp (public marketing + customer console)

`swyftstack-userapp` is now both the public website **and** the customer
console — in the same Next.js app, with distinct shells:

- Marketing routes (`/`, `/platform`, `/pricing`, `/blog`, `/blog/[slug]`,
  `/announcements`, `/announcements/[slug]`, `/comparisons/[slug]`) use
  `<MarketingShell>` (header + footer, public, SEO-driven). They read CMS
  rows from `cms_marketing_pages` filtered to `status=published`. Drafts can
  be previewed with a short-lived `?preview=<hmac>` token issued by the
  admin CMS editor.
- Console routes (`/console`, `/projects`, `/databases`, `/storage`,
  `/backups`, `/team`, `/billing`, `/usage`, `/settings`, …) use the
  existing `<UserShell>` and each calls `requireUser()`. The dashboard
  formerly served at `/` now lives at `/console`.

Files:

- `src/lib/auth.ts` — DB-backed user sessions, login events, legacy-cookie
  compatibility, logout revocation.
- `src/app/signup`, `login`, `forgot-password`, `reset-password`,
  `verify-email`, `invite/accept` — auth/onboarding, hashed token flows,
  email/dev-log delivery.
- `src/app/page.tsx` — public landing (marketing), pulls a published
  `landing_page` row from CMS if present, else static fallback.
- `src/app/console/page.tsx` — authenticated overview: plan/trial/usage,
  resource counts, quick create project, recent activity.
- `src/app/pricing/page.tsx` — public pricing list from `plans`; the choose-
  plan action still attaches a `Subscription` for signed-in users.
- `src/app/platform`, `blog`, `announcements`, `comparisons` — CMS-backed
  marketing routes (see above).
- `src/components/marketing-shell.tsx`, `src/components/cms-content.tsx` —
  marketing layout + TipTap-JSON renderer (no admin code imported).
- `src/components/db-browser.tsx` — client component for the database GUI
  (tables / browse / SQL runner / stats). Calls `/api/db-browse`.
- `src/app/api/db-browse/route.ts` — single POST endpoint with action
  dispatch: `list_tables / describe_table / browse / run_query / stats`.
  Validates project membership, then forwards to `databaseBrowserService`.
- `src/app/projects/new/page.tsx` — project creation (name + db/bucket
  options only — **no region field**; placement comes from provisioning
  defaults).
- `src/app/projects/[id]/page.tsx` — tabbed project detail gated by
  `project_members`: apps, databases, storage, imports, members, activity;
  create app, create database, create bucket, and import-database-from-URL
  flows.
- `src/app/projects/[id]/databases/[dbId]/page.tsx` — database connection
  detail: `DATABASE_URL`, masked credentials, SSL mode, size, backups; rotate
  password / create backup / safe restore actions, plus framework snippets.
- `src/app/projects/[id]/storage/[bucketId]/page.tsx` — bucket detail:
  endpoint/keys, upload/list/download/delete, public object flags, signed URLs,
  local-dev quickstart snippets.
- `src/app/databases`, `storage`, `backups`, `migrations`, `usage`, `team`,
  `billing`, `settings` — aggregate console sections.
- `src/app/api/storage/{object,public,signed}` — authenticated console object
  API, public object API, and HMAC signed URL API.
- `src/components/client.tsx` — `CopyButton`, `SecretField`, `Tabs`.

## Data flow

1. Admin/API/customer console creates a record (`apps`, `databases`,
   `storage_buckets`, …) → enqueues a `job`.
2. `swyftstack-workers` claims the job (race-safe `updateMany` lock), runs the
   matching handler in `swyftstack-shared/jobs/handlers.ts`.
3. Handlers call the local-dev service implementations (Docker/pg if present,
   otherwise simulated) and write `audit_logs` / `project_activity_logs`.
4. Scheduler-driven jobs roll up usage, enforce limits (80/100/110), schedule
   database backups, and sync storage usage.

## Conventions

- All secrets encrypted via `crypto.ts` before persistence.
- Every state-changing action writes an audit log.
- Backups: never delete an old backup before a newer one is `verified`.
- Resources always carry a `node_id` mapping and are movable via `migrations`.
