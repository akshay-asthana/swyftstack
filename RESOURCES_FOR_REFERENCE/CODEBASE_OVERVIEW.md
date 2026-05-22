# Quickdock — Codebase Overview

> Keep this file updated when files/modules are added or moved. It exists so the
> codebase can be understood without re-reading every file.

## Monorepo layout (npm workspaces)

```
Quickdock/
├── package.json              # workspace root + scripts (db:*, dev:*, test)
├── docker-compose.yml        # local Postgres (control + optional customer DB)
├── .env / .env.example       # configuration (secrets, DB, worker, storage)
├── quickdock-shared/         # shared library: schema, services, jobs, logic
├── quickdock-platform/       # admin control-plane (Next.js, port 3000)
├── quickdock-workers/        # long-running worker + scheduler
├── quickdock-userapp/        # customer-facing app (Next.js, port 3001)
└── RESOURCES_FOR_REFERENCE/  # DB_SCHEMA.sql, *_OVERVIEW.md, architecture
```

`quickdock-platform` and `quickdock-workers` both import `quickdock-shared`
(workspace dependency) so schema/services/business-logic live in exactly one place.

## quickdock-shared (the core)

`src/`
- `env.ts` — zod-validated `process.env` (safe defaults for dev).
- `db.ts` — Prisma client singleton + re-exports generated types. Requires
  `npm run db:generate` first (`prisma/schema.prisma`).
- `crypto.ts` — AES-256-GCM `encryptSecret/decryptSecret`, `hashPassword`
  (scrypt), `hashToken`, `randomSecret`.
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
- `services/` — `types.ts` (interfaces) + implementations:
  `node.ts`, `app.ts`, `database.ts`, `storage.ts`, `backup.ts`, `migration.ts`,
  plus the **DB-managed provider services** (customer infra is not env-config):
  - `database-cluster.ts` — `databaseClusterService` (list/select/test/usage,
    `clusterAdminUrl`, `pgConnect`). Replaces `CUSTOMER_PG_*`.
  - `object-storage-provider.ts` — `objectStorageProviderService`,
    `storageProviderFor(providerId)`. Replaces `STORAGE_*`.
  - `backup-provider.ts` — `backupProviderService` (select/upload/verify).
    Replaces `BACKUP_*`.
  - `worker-config.ts` — `workerConfigService` (DB config + env fallback,
    30s cache). Replaces global `WORKER_*` (now `DEFAULT_WORKER_*` fallback).
  - `ssh.ts` — `sshNodeService` uses local execution for `connection_mode=local`
    and the system `ssh` binary with encrypted pasted private keys for remote
    VPS connectivity tests, metric probes, running-service snapshots and logs,
    recording results in `node_connection_logs`.
  `database.ts`/`backup.ts`/`storage.ts` resolve their target from these
  services; `jobs/worker.ts` is driven by `workerConfigService`.
- `jobs/` — `index.ts` (enqueue/claim/complete/fail/retry/cancel),
  `backoff.ts` (pure), `handlers.ts` (per-type handlers), `worker.ts` (loop).
- `seed.ts` — admin user + Starter/Pro plans + one local all-in-one node.
- `__tests__/` — vitest specs (pure logic only; no DB needed).

Pure modules never import `db.ts`, so the test suite runs without Postgres or
`prisma generate`.

## quickdock-platform (admin, Next.js App Router)

- `src/lib/auth.ts` — signed-cookie admin session (`login/logout/currentAdmin/
  requireAdmin`); enforces `isPlatformAdmin`.
- `src/lib/api.ts` — `authorize()` (admin session OR internal bearer token) +
  BigInt-safe `json()`.
- `src/components/ui.tsx` — `Badge`, `Stat`, `Table`, `bytes()`.
- `src/app/login/page.tsx` — server-action login.
- `src/app/(dashboard)/layout.tsx` — auth gate + sidebar nav.
- `src/app/(dashboard)/*` — 15 pages: overview, nodes, users, organizations,
  projects, apps, databases, buckets, plans, usage, jobs, backups, audit-logs,
  migrations, settings. Server components query Prisma directly; mutations use
  server actions.
- `src/app/(dashboard)/nodes/[id]/page.tsx` — tabbed per-node overview,
  monitoring, logs, SSH command history/settings and workloads.
- `src/app/(dashboard)/infrastructure/page.tsx` — tabs: Database Clusters,
  Object Storage, Backup Storage, Worker Configs, Node Defaults
  (create/disable/test/make-default via server actions).
- `src/app/api/admin/*` — REST endpoints (overview, nodes[+drain+agent script,
  SSH test/probe/logs/services/command],
  plans, users, projects[+suspend/unsuspend/databases/apps], databases
  [+backup/restore], migrations, jobs[+retry], usage, audit-logs) and
  `infrastructure/{database-clusters,object-storage,backup-storage,worker-configs}`
  each with `[id]` (PATCH status / guarded DELETE) and `[id]/test`.

## quickdock-workers

- `src/index.ts` — starts scheduler + `runWorker()` (from shared).
- `src/scheduler.ts` — in-process interval scheduler enqueuing recurring jobs
  (metrics 30s, usage 60s, enforce 120s, storage 300s, control backup 6h).

## quickdock-userapp (customer baseline)

- `src/lib/auth.ts` — user session (email + optional password).
- `src/app/login` / `src/app/page.tsx` — sign-in + project list (membership).
- `src/app/pricing/page.tsx` — plan selection gate for free users.
- `src/app/projects/new/page.tsx` — project creation; redirects to pricing if
  the workspace has no active plan or has reached plan limits.
- `src/app/projects/[id]/page.tsx` — project detail gated by `project_members`,
  shows apps/databases/activity and the user's resolved permissions.

## Data flow

1. Admin/API creates a record (`apps`, `databases`, …) → enqueues a `job`.
2. `quickdock-workers` claims the job (race-safe `updateMany` lock), runs the
   matching handler in `quickdock-shared/jobs/handlers.ts`.
3. Handlers call the local-dev service implementations (Docker/pg if present,
   otherwise simulated) and write `audit_logs` / `project_activity_logs`.
4. Scheduler-driven jobs roll up usage and enforce limits (80/100/110).

## Conventions

- All secrets encrypted via `crypto.ts` before persistence.
- Every state-changing action writes an audit log.
- Backups: never delete an old backup before a newer one is `verified`.
- Resources always carry a `node_id` mapping and are movable via `migrations`.
