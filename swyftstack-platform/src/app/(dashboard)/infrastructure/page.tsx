import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  prisma,
  databaseClusterService,
  objectStorageProviderService,
  backupProviderService,
  workerConfigService,
  audit,
} from "swyftstack-shared";
import { Table, Badge, bytes } from "@/components/ui";

export const dynamic = "force-dynamic";

const TABS: [string, string][] = [
  ["clusters", "Database Clusters"],
  ["object-storage", "Object Storage Providers"],
  ["backup-storage", "Backup Storage Providers"],
  ["workers", "Worker Configs"],
  ["nodes", "Node Defaults"],
];

// ---- server actions -------------------------------------------------------

async function createCluster(fd: FormData) {
  "use server";
  await databaseClusterService.createCluster({
    name: String(fd.get("name")),
    adminConnectionString: String(fd.get("adminConnectionString")),
    host: String(fd.get("host")),
    port: Number(fd.get("port") || 5432),
    region: String(fd.get("region") || "") || undefined,
    maxDatabases: fd.get("maxDatabases") ? Number(fd.get("maxDatabases")) : null,
  });
  revalidatePath("/infrastructure");
}
async function setClusterStatus(fd: FormData) {
  "use server";
  await prisma.databaseCluster.update({
    where: { id: String(fd.get("id")) },
    data: { status: String(fd.get("status")) },
  });
  await audit({ actorType: "admin", action: `database_cluster.${fd.get("status")}`, targetType: "database_cluster", targetId: String(fd.get("id")) });
  revalidatePath("/infrastructure");
}
async function testCluster(fd: FormData) {
  "use server";
  await databaseClusterService.testConnection(String(fd.get("id")));
  revalidatePath("/infrastructure");
}

async function createObjectStorage(fd: FormData) {
  "use server";
  await prisma.objectStorageProvider.create({
    data: {
      name: String(fd.get("name")),
      provider: String(fd.get("provider")),
      localPath: String(fd.get("localPath") || "") || null,
      endpoint: String(fd.get("endpoint") || "") || null,
      region: String(fd.get("region") || "") || null,
      status: "active",
    },
  });
  revalidatePath("/infrastructure");
}
async function setObjectStorageStatus(fd: FormData) {
  "use server";
  await prisma.objectStorageProvider.update({
    where: { id: String(fd.get("id")) },
    data: { status: String(fd.get("status")) },
  });
  revalidatePath("/infrastructure");
}

async function createBackupProvider(fd: FormData) {
  "use server";
  const isDefault = fd.get("isDefault") === "on";
  if (isDefault) await prisma.backupStorageProvider.updateMany({ data: { isDefault: false } });
  await backupProviderService.createProvider({
    name: String(fd.get("name")),
    provider: String(fd.get("provider")),
    localPath: String(fd.get("localPath") || "") || undefined,
    isDefault,
  });
  revalidatePath("/infrastructure");
}
async function makeBackupDefault(fd: FormData) {
  "use server";
  await prisma.backupStorageProvider.updateMany({ data: { isDefault: false } });
  await prisma.backupStorageProvider.update({
    where: { id: String(fd.get("id")) },
    data: { isDefault: true, status: "active" },
  });
  revalidatePath("/infrastructure");
}

async function saveWorkerConfig(fd: FormData) {
  "use server";
  const workerType = String(fd.get("workerType"));
  const data = {
    name: String(fd.get("name") || `${workerType} worker`),
    workerType,
    enabled: fd.get("enabled") === "on",
    pollIntervalMs: Number(fd.get("pollIntervalMs") || 2000),
    concurrency: Number(fd.get("concurrency") || 2),
    lockTimeoutMs: Number(fd.get("lockTimeoutMs") || 300000),
    queues: String(fd.get("queues") || "").split(",").map((s) => s.trim()).filter(Boolean),
  };
  await prisma.workerConfig.upsert({ where: { workerType }, update: data, create: data });
  workerConfigService.invalidate();
  revalidatePath("/infrastructure");
}

// ---- page -----------------------------------------------------------------

export default async function InfrastructurePage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams.tab ?? "clusters";

  return (
    <>
      <h1 className="h1">Infrastructure</h1>
      <p className="sub">
        Customer DB clusters, object storage, backup targets and worker tuning —
        all DB-managed, credentials encrypted at rest. No customer infra lives in
        env vars.
      </p>
      <div className="toolbar">
        {TABS.map(([id, label]) => (
          <Link
            key={id}
            href={`/infrastructure?tab=${id}`}
            className={`btn ${tab === id ? "" : "secondary"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "clusters" && <Clusters />}
      {tab === "object-storage" && <ObjectStorage />}
      {tab === "backup-storage" && <BackupStorage />}
      {tab === "workers" && <Workers />}
      {tab === "nodes" && <NodeDefaults />}
    </>
  );
}

async function Clusters() {
  const clusters = await prisma.databaseCluster.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { databases: true } }, node: true },
  });
  return (
    <>
      <Table
        columns={["Name", "Host", "Region", "Status", "DBs", "Storage", "Actions"]}
        rows={clusters.map((c) => [
          <strong key="n">{c.name}</strong>,
          `${c.host}:${c.port}`,
          c.region ?? "—",
          <Badge key="s" status={c.status} />,
          `${c.currentDatabases}${c.maxDatabases ? `/${c.maxDatabases}` : ""}`,
          bytes(c.currentStorageBytes),
          <div className="row" key="a">
            <form action={testCluster}><input type="hidden" name="id" value={c.id} /><button className="btn secondary">Test</button></form>
            <form action={setClusterStatus}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="status" value={c.status === "disabled" ? "active" : "disabled"} />
              <button className="btn danger">{c.status === "disabled" ? "Enable" : "Disable"}</button>
            </form>
          </div>,
        ])}
      />
      <form action={createCluster} className="card" style={{ marginTop: 16 }}>
        <strong>Add a customer Postgres cluster</strong>
        <div className="grid" style={{ marginTop: 10 }}>
          <div><label>Name</label><input name="name" required /></div>
          <div><label>Admin connection string</label><input name="adminConnectionString" placeholder="postgresql://admin:pw@host:5432/postgres" required /></div>
          <div><label>Host</label><input name="host" required /></div>
          <div><label>Port</label><input name="port" defaultValue="5432" /></div>
          <div><label>Region</label><input name="region" placeholder="local" /></div>
          <div><label>Max databases (optional)</label><input name="maxDatabases" /></div>
        </div>
        <div style={{ marginTop: 12 }}><button className="btn">Create cluster</button></div>
        <p className="small">The connection string is encrypted (AES-256-GCM) before storage.</p>
      </form>
    </>
  );
}

async function ObjectStorage() {
  const providers = await prisma.objectStorageProvider.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { buckets: true } } },
  });
  return (
    <>
      <Table
        columns={["Name", "Provider", "Endpoint/Path", "Status", "Buckets", "Used", "Actions"]}
        rows={providers.map((p) => [
          <strong key="n">{p.name}</strong>,
          p.provider,
          p.provider === "local_dev" ? p.localPath ?? "—" : p.endpoint ?? "—",
          <Badge key="s" status={p.status} />,
          p._count.buckets,
          bytes(p.currentStorageBytes),
          <form key="a" action={setObjectStorageStatus}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="status" value={p.status === "disabled" ? "active" : "disabled"} />
            <button className="btn danger">{p.status === "disabled" ? "Enable" : "Disable"}</button>
          </form>,
        ])}
      />
      <form action={createObjectStorage} className="card" style={{ marginTop: 16 }}>
        <strong>Add an object storage provider</strong>
        <div className="grid" style={{ marginTop: 10 }}>
          <div><label>Name</label><input name="name" required /></div>
          <div><label>Provider</label>
            <select name="provider"><option>local_dev</option><option>b2</option><option>r2</option><option>hetzner</option><option>custom</option></select>
          </div>
          <div><label>Local path (local_dev)</label><input name="localPath" placeholder="./storage-local" /></div>
          <div><label>Endpoint (S3)</label><input name="endpoint" placeholder="https://s3..." /></div>
          <div><label>Region</label><input name="region" /></div>
        </div>
        <div style={{ marginTop: 12 }}><button className="btn">Create provider</button></div>
        <p className="small">Access/secret keys (when provided via API) are encrypted at rest.</p>
      </form>
    </>
  );
}

async function BackupStorage() {
  const providers = await prisma.backupStorageProvider.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { databaseBackups: true, controlPlaneBackups: true } } },
  });
  return (
    <>
      <Table
        columns={["Name", "Provider", "Path/Bucket", "Default", "Status", "Backups", "Actions"]}
        rows={providers.map((p) => [
          <strong key="n">{p.name}</strong>,
          p.provider,
          p.provider === "local_dev" ? p.localPath ?? "—" : `${p.bucket ?? ""}/${p.prefix ?? ""}`,
          p.isDefault ? <Badge key="d" status="active" /> : "—",
          <Badge key="s" status={p.status} />,
          p._count.databaseBackups + p._count.controlPlaneBackups,
          <div className="row" key="a">
            {!p.isDefault && (
              <form action={makeBackupDefault}><input type="hidden" name="id" value={p.id} /><button className="btn secondary">Make default</button></form>
            )}
          </div>,
        ])}
      />
      <form action={createBackupProvider} className="card" style={{ marginTop: 16 }}>
        <strong>Add a backup storage provider</strong>
        <div className="grid" style={{ marginTop: 10 }}>
          <div><label>Name</label><input name="name" required /></div>
          <div><label>Provider</label>
            <select name="provider"><option>local_dev</option><option>b2</option><option>r2</option><option>hetzner</option><option>custom</option></select>
          </div>
          <div><label>Local path (local_dev)</label><input name="localPath" placeholder="./backups-local" /></div>
        </div>
        <label style={{ display: "inline-flex", gap: 6, marginTop: 10 }}>
          <input type="checkbox" name="isDefault" style={{ width: "auto" }} /> Set as default backup target
        </label>
        <div style={{ marginTop: 12 }}><button className="btn">Create provider</button></div>
      </form>
    </>
  );
}

async function Workers() {
  const configs = await workerConfigService.listConfigs();
  const types = ["default", "deploy", "backup", "metrics", "migration", "usage"];
  return (
    <>
      <Table
        columns={["Type", "Enabled", "Poll (ms)", "Concurrency", "Lock (ms)", "Queues"]}
        rows={configs.map((c) => [
          <strong key="t">{c.workerType}</strong>,
          c.enabled ? "yes" : "no",
          c.pollIntervalMs,
          c.concurrency,
          c.lockTimeoutMs,
          c.queues.join(", ") || "(any)",
        ])}
      />
      <form action={saveWorkerConfig} className="card" style={{ marginTop: 16 }}>
        <strong>Create / update worker config</strong>
        <div className="grid" style={{ marginTop: 10 }}>
          <div><label>Worker type</label>
            <select name="workerType">{types.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
          <div><label>Name</label><input name="name" placeholder="Default worker" /></div>
          <div><label>Poll interval (ms)</label><input name="pollIntervalMs" defaultValue="2000" /></div>
          <div><label>Concurrency</label><input name="concurrency" defaultValue="2" /></div>
          <div><label>Lock timeout (ms)</label><input name="lockTimeoutMs" defaultValue="300000" /></div>
          <div><label>Queues (comma-separated, blank = any)</label><input name="queues" /></div>
        </div>
        <label style={{ display: "inline-flex", gap: 6, marginTop: 10 }}>
          <input type="checkbox" name="enabled" defaultChecked style={{ width: "auto" }} /> Enabled
        </label>
        <div style={{ marginTop: 12 }}><button className="btn">Save config</button></div>
        <p className="small">Workers refresh DB config every ~30s — no restart needed.</p>
      </form>
    </>
  );
}

async function NodeDefaults() {
  const nodes = await prisma.node.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <p className="small" style={{ marginBottom: 12 }}>
        Compute nodes remain managed on the <Link href="/nodes">Nodes</Link> page.
        Database clusters can be pinned to a node; object/backup storage are
        node-independent.
      </p>
      <Table
        columns={["Node", "Roles", "Status"]}
        rows={nodes.map((n) => [n.name, n.roles.join(", "), <Badge key="s" status={n.status} />])}
      />
    </>
  );
}
