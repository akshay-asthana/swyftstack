# Quickdock — Infra Control Plane

Admin-first orchestration platform for a small PaaS/DBaaS. Manages VPS worker
nodes and allocates app hosting, PostgreSQL databases, object storage, usage
limits, backups, logs, and migrations to users/projects. Multi-node by design.

See `RESOURCES_FOR_REFERENCE/` for the architecture (`PLATFORM_OVERVIEW.md`) and
code map (`CODEBASE_OVERVIEW.md`).

## Architecture overview

```
quickdock-shared/   Prisma schema, services, job runtime, pure business logic
quickdock-platform/ Admin control plane (Next.js, :3000) + control API
quickdock-workers/  Long-running job worker + periodic scheduler
quickdock-userapp/  Customer-facing app (Next.js, :3001)
```

- **Control plane** (`quickdock-platform`) — admins manage nodes, users,
  organizations, projects, plans, infrastructure providers and monitoring.
  Server components read Prisma directly; mutations are server actions.
- **Customer app** (`quickdock-userapp`) — customers manage projects, apps,
  databases (create + import), object storage and view their own usage.
- **Worker** (`quickdock-workers`) — claims jobs from a Postgres-backed queue
  (race-safe `updateMany` lock, exponential-backoff retry) and runs every
  long task: deploys, backups, metric collection, rollups and DB imports.
- **Shared** (`quickdock-shared`) — one Prisma schema, one set of services,
  one job handler registry, imported by the platform, worker and user app.
- **Multi-node ready** — every app/database/bucket carries a `node_id` and is
  movable via `migrations`. Customer database clusters, object storage and
  backup targets are **DB-managed** (the `infrastructure_providers` family of
  tables) and configured from the control plane — never from env vars.

### How monitoring works

- The worker collects metrics on a schedule: node metrics every 30s, app
  metrics every 60s, database metrics every 120s, storage metrics every 300s.
- Raw samples land in `node_metrics`, `app_metrics`, `database_metrics`,
  `storage_metrics` (plus `build_metrics` per deployment).
- Node metrics carry CPU %, load average, RAM/disk totals + used, network
  counters, Docker container counts and DB/proxy health.
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
npm run db:push             # apply the schema   (or: npm run db:migrate)
npm run db:seed             # admin + plans + local node + providers + help docs
```

Admin credentials come from `.env` (`PLATFORM_ADMIN_EMAIL` /
`PLATFORM_ADMIN_PASSWORD`).

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
npm run db:push       # sync the schema to the DB (dev)
npm run db:migrate    # create + apply a named migration (prisma migrate dev)
npm run db:seed       # idempotent seed (safe to re-run)
```

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

To register a remote VPS, generate a key and add the public half to the box:

```bash
ssh-keygen -t ed25519 -C "quickdock-node" -f ~/.ssh/quickdock_node
ssh-copy-id -i ~/.ssh/quickdock_node.pub root@<VPS_IP>
# paste the PRIVATE key (~/.ssh/quickdock_node) into the Add-node form
```

### Add a database cluster

Admin → **Providers → Database Clusters → New**. Provide a name and the admin
connection string (`postgresql://admin:pw@host:5432/postgres`) plus host/port/
region. The connection string is AES-256-GCM encrypted at rest. New customer
databases are placed on the least-loaded active cluster.

### Add a storage provider

Admin → **Providers → Object Storage** (or **Backup Storage**) **→ New**. Pick
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
   `queued → testing_connection → dumping → restoring → verifying → completed`.
4. The Imports tab shows the live status; the source URL is encrypted, masked
   in every log line, and discarded on completion unless you keep it. With
   `pg_dump`/`pg_restore` installed the transfer is real; otherwise the steps
   are simulated and clearly logged.

## Configuration (.env) — control-plane only

`.env` holds **only** what the control plane needs to boot. Customer Postgres
clusters, object storage, backup targets and worker tuning are DB-managed and
edited from the admin **Providers** page.

| Key | Meaning |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Control-plane Postgres (the only DB URLs in env) |
| `SECRET_ENCRYPTION_KEY` | 32-byte base64 key for AES-256-GCM secrets |
| `AUTH_SECRET` | Session cookie signing |
| `INTERNAL_API_TOKEN` | Bearer token for worker → control-plane calls |
| `PLATFORM_ADMIN_EMAIL/PASSWORD` | Seeded bootstrap admin |
| `PLATFORM_BASE_URL` / `USERAPP_BASE_URL` | App URLs |
| `DEV_LOCAL_STORAGE_ROOT` / `DEV_LOCAL_BACKUP_ROOT` | Seed paths for `local_dev` providers |
| `DEFAULT_WORKER_*` | Fallback worker tuning if no `worker_configs` row exists |

## Implementation notes

- ORM: **Prisma**. Jobs: Postgres-backed queue, race-safe claim, backoff retry.
- Monitoring, usage collection, rollups, backups and DB imports run in the
  worker — never in a web request handler.
- Node execution uses local Docker / system SSH for the MVP; service interfaces
  are written as if a remote node-agent will fulfil them later.
- All secrets are encrypted before persistence; every state change writes an
  audit log.
