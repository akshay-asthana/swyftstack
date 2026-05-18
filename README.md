# Quickdock — Infra Control Plane

Admin-first orchestration platform for a small PaaS/DBaaS. Manages VPS worker
nodes and allocates app hosting, PostgreSQL databases, object storage, usage
limits, backups, logs, and migrations to users/projects. Single-node MVP,
multi-node by design.

See `RESOURCES_FOR_REFERENCE/` for the full architecture (`PLATFORM_OVERVIEW.md`),
code map (`CODEBASE_OVERVIEW.md`), and SQL schema (`DB_SCHEMA.sql`).

## Workspaces

| Package | Port | Purpose |
|---|---|---|
| `quickdock-shared` | — | Prisma schema, services, job runtime, business logic |
| `quickdock-platform` | 3000 | Admin dashboard + control API |
| `quickdock-workers` | — | Job worker + periodic scheduler |
| `quickdock-userapp` | 3001 | Customer-facing app |

## Prerequisites

- Node.js ≥ 20
- PostgreSQL 16 (use `docker compose up -d postgres`, or any local Postgres)
- Optional: Docker + `pg_dump` for real container/backup behaviour. Without
  them, app/db/backup operations run in **simulated** mode but the control
  plane still works end to end.

## Setup

```bash
cp .env.example .env          # a working .env is already generated for local dev
docker compose up -d postgres # start control-plane Postgres
npm install                   # install all workspaces

npm run db:generate           # generate Prisma client
npm run db:push               # create schema (or db:migrate for migrations)
npm run db:seed               # admin user + Starter/Pro plans + local node
```

Admin credentials come from `.env` (`PLATFORM_ADMIN_EMAIL` /
`PLATFORM_ADMIN_PASSWORD`).

## Run the platform, user app, and workers in dev

Each in its own terminal (npm; pnpm users can substitute `pnpm`):

```bash
npm run dev:admin    # http://localhost:3000  control-plane / admin
npm run dev:worker   # background worker + scheduler
npm run dev:user     # http://localhost:3001  customer app
```

Aliases `dev:platform` / `dev:workers` / `dev:userapp` still work.

### Exact commands from a fresh clone

```bash
cp .env.example .env          # fill SECRET_ENCRYPTION_KEY/AUTH_SECRET/admin pw
npm install                   # (or: pnpm install)
npm run docker:up             # docker compose up -d postgres
npm run db:migrate            # create schema  (npm run db:push also works)
npm run db:seed               # admin + plans + local_dev providers + worker cfg
npm run dev:admin             # terminal 1
npm run dev:worker            # terminal 2
npm run dev:user              # terminal 3 (user app)
```

One-command DB lifecycle: `npm run docker:up`, `npm run db:migrate`,
`npm run db:seed`. Frontend dev does not require Docker — only Postgres does.

## Test

```bash
npm test               # pure-logic vitest suite (no DB required)
```

Covers: effective limits, override precedence, DB permission SQL generation,
job retry backoff, backup state transitions, usage limit enforcement.

## Configuration (.env) — control-plane only

`.env` holds **only** what the control plane needs to boot. Customer Postgres
clusters, object storage, backup targets and worker tuning are **DB-managed**
and edited from the admin **Infrastructure** page — never env vars.

| Key | Meaning |
|---|---|
| `DATABASE_URL` | Control-plane Postgres (the only DB URL in env) |
| `SECRET_ENCRYPTION_KEY` | 32-byte base64 key for AES-256-GCM secrets |
| `AUTH_SECRET` | Session cookie signing |
| `INTERNAL_API_TOKEN` | Bearer token for worker → control-plane calls |
| `PLATFORM_ADMIN_EMAIL/PASSWORD` | Seeded bootstrap admin |
| `PLATFORM_BASE_URL` / `USERAPP_BASE_URL` | App URLs |
| `NODE_ENV` / `LOG_LEVEL` | Runtime |
| `DEV_LOCAL_STORAGE_ROOT` / `DEV_LOCAL_BACKUP_ROOT` | Seed paths for local_dev providers |
| `DEFAULT_WORKER_*` | Fallback worker tuning **only** if no `worker_configs` row exists |

### Managing infrastructure from the admin UI

- **Add a customer Postgres cluster**: Infrastructure → Database Clusters → fill
  name + admin connection string (+ host/port/region) → Create. The connection
  string is AES-256-GCM encrypted at rest. Use **Test** to verify, **Disable**
  to drain. New project DBs are placed by least-loaded active cluster.
- **Add an S3/B2/R2 storage provider**: Infrastructure → Object Storage
  Providers → choose provider, endpoint/region (or local path for `local_dev`)
  → Create (keys submitted via API are encrypted). Buckets bind to the chosen
  provider id.
- **Backup targets**: Infrastructure → Backup Storage Providers → create and
  optionally "Make default". Backups resolve the default provider, upload,
  verify checksum, and only then prune older verified backups.
- **Worker config**: Infrastructure → Worker Configs → set poll/concurrency/
  lock/queues per worker type. Workers reload DB config every ~30s (no
  restart). With no row, `DEFAULT_WORKER_*` env values apply.

## Implementation notes

- ORM: **Prisma** (chosen and used consistently).
- Jobs: Postgres-backed queue, race-safe claim, exponential backoff retry.
- Long deploys/backups run in the worker, never in request handlers.
- Node execution is local Docker/SSH-less for MVP; service interfaces are
  written as if a remote node-agent will fulfil them later.
- No Kubernetes / full node-agent in MVP — interfaces only, simplest version
  built first.

## Project status

MVP scaffold across Phases 1–2 of the architecture: schema, control plane,
worker, services (local-dev), admin dashboard, user app baseline, tests, docs.
Real node-agent, cloud object storage, and live billing are interface-ready but
intentionally stubbed.
