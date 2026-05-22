import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, encryptSecret, isLocalControlPlaneNode, localNodeService, NODE_ROLES, prisma, sshNodeService } from "quickdock-shared";
import { Table, Badge, bytes } from "@/components/ui";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  required: "Name, CPU, RAM, disk, and at least one role are required.",
  ssh: "Remote VPS nodes require SSH host, SSH user, and a private key.",
  port: "SSH port must be between 1 and 65535.",
  capacity: "CPU, RAM, and disk values must be positive numbers.",
  duplicate: "A node with that name already exists.",
  delete_status: "Only disabled nodes can be deleted.",
  delete_workloads: "Move or delete workloads before deleting this node.",
  local_protected: "The local control-plane node cannot be disabled or deleted.",
};

type NodeStatusValue = "provisioning" | "active" | "draining" | "degraded" | "offline" | "disabled";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function positiveNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function gbToBytes(value: string): bigint | null {
  const n = positiveNumber(value);
  return n ? BigInt(Math.round(n * 1024 ** 3)) : null;
}

function rolesFrom(formData: FormData): string[] {
  return NODE_ROLES.filter((role) => formData.get(`role:${role}`) === "on");
}

function validPort(value: string): number | null {
  const port = Number(value || 22);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}

function statusFrom(formData: FormData): NodeStatusValue {
  const raw = str(formData, "status");
  return ["provisioning", "active", "draining", "degraded", "offline", "disabled"].includes(raw)
    ? (raw as NodeStatusValue)
    : "provisioning";
}

function isDisabledStatus(formData: FormData): boolean {
  return statusFrom(formData) === "disabled";
}

function connectionModeFrom(formData: FormData): "local" | "ssh" {
  return str(formData, "connectionMode") === "local" ? "local" : "ssh";
}

async function createNode(formData: FormData) {
  "use server";
  const name = str(formData, "name");
  const connectionMode = connectionModeFrom(formData);
  const sshHost = str(formData, "sshHost");
  const sshUser = str(formData, "sshUser");
  const sshPrivateKey = String(formData.get("sshPrivateKey") ?? "").trim();
  const sshPort = validPort(str(formData, "sshPort"));
  const roles = rolesFrom(formData);
  const cpuCores = positiveNumber(str(formData, "cpuCores"));
  const ramBytes = gbToBytes(str(formData, "ramGb"));
  const diskBytes = gbToBytes(str(formData, "diskGb"));

  if (!name || roles.length === 0) redirect("/nodes?error=required#new-node");
  if (connectionMode === "local" && isDisabledStatus(formData)) redirect("/nodes?error=local_protected#new-node");
  if (connectionMode === "ssh" && (!sshHost || !sshUser || !sshPrivateKey)) redirect("/nodes?error=ssh#new-node");
  if (connectionMode === "ssh" && !sshPort) redirect("/nodes?error=port#new-node");
  if (!cpuCores || !ramBytes || !diskBytes) redirect("/nodes?error=capacity#new-node");
  if (await prisma.node.findUnique({ where: { name }, select: { id: true } })) {
    redirect("/nodes?error=duplicate#new-node");
  }

  const node = await prisma.node.create({
    data: {
      name,
      provider: str(formData, "provider") || "custom",
      providerInstanceId: str(formData, "providerInstanceId") || null,
      publicIp: str(formData, "publicIp") || (connectionMode === "ssh" ? sshHost : null),
      privateIp: str(formData, "privateIp") || null,
      connectionMode,
      sshHost: connectionMode === "ssh" ? sshHost : null,
      sshPort: connectionMode === "ssh" ? sshPort ?? 22 : 22,
      sshUser: connectionMode === "ssh" ? sshUser : null,
      sshKeyPath: null,
      sshPrivateKeyEncrypted: connectionMode === "ssh" ? encryptSecret(sshPrivateKey) : null,
      lastConnectionStatus: "untested",
      region: str(formData, "region") || null,
      status: statusFrom(formData),
      roles,
      cpuCores,
      ramBytes,
      diskBytes,
      agentVersion: null,
      lastHeartbeatAt: null,
    },
  });
  await audit({ actorType: "admin", action: "node.created", targetType: "node", targetId: node.id });
  redirect(`/nodes/${node.id}`);
}

async function updateNode(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const name = str(formData, "name");
  const connectionMode = connectionModeFrom(formData);
  const sshHost = str(formData, "sshHost");
  const sshUser = str(formData, "sshUser");
  const sshPrivateKey = String(formData.get("sshPrivateKey") ?? "").trim();
  const sshPort = validPort(str(formData, "sshPort"));
  const roles = rolesFrom(formData);
  const cpuCores = positiveNumber(str(formData, "cpuCores"));
  const ramBytes = gbToBytes(str(formData, "ramGb"));
  const diskBytes = gbToBytes(str(formData, "diskGb"));

  if (!id || !name || roles.length === 0) redirect(`/nodes?error=required#edit-${id}`);
  const existing = await prisma.node.findUnique({
    where: { id },
    select: { id: true, connectionMode: true, provider: true, sshPrivateKeyEncrypted: true },
  });
  if (existing && isLocalControlPlaneNode(existing) && isDisabledStatus(formData)) {
    redirect(`/nodes?error=local_protected#edit-${id}`);
  }
  if (connectionMode === "local" && isDisabledStatus(formData)) redirect(`/nodes?error=local_protected#edit-${id}`);
  const duplicate = await prisma.node.findUnique({ where: { name }, select: { id: true } });
  if (duplicate && duplicate.id !== id) redirect(`/nodes?error=duplicate#edit-${id}`);
  if (connectionMode === "ssh" && (!sshHost || !sshUser || (!sshPrivateKey && !existing?.sshPrivateKeyEncrypted))) {
    redirect(`/nodes?error=ssh#edit-${id}`);
  }
  if (connectionMode === "ssh" && !sshPort) redirect(`/nodes?error=port#edit-${id}`);
  if (!cpuCores || !ramBytes || !diskBytes) redirect(`/nodes?error=capacity#edit-${id}`);

  await prisma.node.update({
    where: { id },
    data: {
      name,
      provider: str(formData, "provider") || "custom",
      providerInstanceId: str(formData, "providerInstanceId") || null,
      publicIp: str(formData, "publicIp") || (connectionMode === "ssh" ? sshHost : null),
      privateIp: str(formData, "privateIp") || null,
      connectionMode,
      sshHost: connectionMode === "ssh" ? sshHost : null,
      sshPort: connectionMode === "ssh" ? sshPort ?? 22 : 22,
      sshUser: connectionMode === "ssh" ? sshUser : null,
      sshKeyPath: null,
      sshPrivateKeyEncrypted:
        connectionMode === "local"
          ? null
          : sshPrivateKey
            ? encryptSecret(sshPrivateKey)
            : undefined,
      region: str(formData, "region") || null,
      status: statusFrom(formData),
      roles,
      cpuCores,
      ramBytes,
      diskBytes,
    },
  });
  await audit({ actorType: "admin", action: "node.edited", targetType: "node", targetId: id });
  revalidatePath("/nodes");
}

async function testConnection(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  await sshNodeService.testConnection(id);
  revalidatePath("/nodes");
  revalidatePath(`/nodes/${id}`);
  redirect(`/nodes/${id}`);
}

async function collectMetrics(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  await sshNodeService.collectMetrics(id);
  revalidatePath("/nodes");
  revalidatePath(`/nodes/${id}`);
  redirect(`/nodes/${id}`);
}

async function drain(formData: FormData) {
  "use server";
  await localNodeService.drain(str(formData, "id"));
  revalidatePath("/nodes");
}

async function disable(formData: FormData) {
  "use server";
  try {
    await localNodeService.disable(str(formData, "id"));
  } catch (error) {
    if (error instanceof Error && error.name === "ProtectedLocalNodeError") redirect("/nodes?error=local_protected");
    throw error;
  }
  revalidatePath("/nodes");
}

async function deleteNode(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const node = await prisma.node.findUniqueOrThrow({
    where: { id },
    include: { _count: { select: { apps: true, databases: true } } },
  });
  if (isLocalControlPlaneNode(node)) redirect("/nodes?error=local_protected");
  if (node.status !== "disabled") redirect("/nodes?error=delete_status");
  if (node._count.apps > 0 || node._count.databases > 0) redirect("/nodes?error=delete_workloads");

  await prisma.node.delete({ where: { id } });
  await audit({ actorType: "admin", action: "node.deleted", targetType: "node", targetId: id });
  revalidatePath("/nodes");
  redirect("/nodes");
}

function NodeForm({
  action,
  node,
  title,
}: {
  action: (formData: FormData) => Promise<void>;
  title: string;
  node?: {
    id: string;
    name: string;
    provider: string;
    providerInstanceId: string | null;
    publicIp: string | null;
    privateIp: string | null;
    connectionMode: string;
    sshHost: string | null;
    sshPort: number;
    sshUser: string | null;
    sshKeyPath: string | null;
    sshPrivateKeyEncrypted: string | null;
    region: string | null;
    status: string;
    roles: string[];
    cpuCores: unknown;
    ramBytes: bigint;
    diskBytes: bigint;
  };
}) {
  return (
    <form action={action}>
      {node && <input type="hidden" name="id" value={node.id} />}
      <div className="panel-title">{title}</div>
      <div className="form-grid">
        <div><label>Node name</label><input name="name" defaultValue={node?.name ?? ""} placeholder="hetzner-fsn1-01" required /></div>
        <div><label>Provider</label><input name="provider" defaultValue={node?.provider ?? "custom"} placeholder="hetzner" required /></div>
        <div><label>Connection mode</label>
          <select name="connectionMode" defaultValue={node?.connectionMode ?? "ssh"}>
            <option value="ssh">Remote VPS over SSH</option>
            <option value="local">Local machine, no SSH</option>
          </select>
        </div>
        <div><label>SSH host / public IP</label><input name="sshHost" defaultValue={node?.sshHost ?? node?.publicIp ?? ""} placeholder="203.0.113.10" /></div>
        <div><label>SSH user</label><input name="sshUser" defaultValue={node?.sshUser ?? "root"} placeholder="root" /></div>
        <div><label>SSH port</label><input name="sshPort" defaultValue={node?.sshPort ?? 22} /></div>
        <div><label>Public IP</label><input name="publicIp" defaultValue={node?.publicIp ?? ""} /></div>
        <div><label>Private IP</label><input name="privateIp" defaultValue={node?.privateIp ?? ""} /></div>
        <div><label>Instance ID</label><input name="providerInstanceId" defaultValue={node?.providerInstanceId ?? ""} /></div>
        <div><label>Region</label><input name="region" defaultValue={node?.region ?? ""} placeholder="fsn1" /></div>
        <div><label>CPU cores</label><input name="cpuCores" defaultValue={node ? String(node.cpuCores) : "2"} required /></div>
        <div><label>RAM GB</label><input name="ramGb" defaultValue={node ? Math.round(Number(node.ramBytes) / 1024 ** 3) : "4"} required /></div>
        <div><label>Disk GB</label><input name="diskGb" defaultValue={node ? Math.round(Number(node.diskBytes) / 1024 ** 3) : "80"} required /></div>
        <div><label>Status</label>
          <select name="status" defaultValue={node?.status ?? "provisioning"}>
            <option value="provisioning">provisioning</option>
            <option value="active">active</option>
            <option value="draining">draining</option>
            <option value="degraded">degraded</option>
            <option value="offline">offline</option>
            {!node || !isLocalControlPlaneNode(node) ? <option value="disabled">disabled</option> : null}
          </select>
        </div>
      </div>
      <label>SSH private key {node?.sshPrivateKeyEncrypted ? <span className="muted">(leave blank to keep existing)</span> : null}</label>
      <textarea
        name="sshPrivateKey"
        rows={7}
        placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"}
      />
      <label>Roles</label>
      <div className="check-grid">
        {NODE_ROLES.map((role) => (
          <label className="check" key={role}>
            <input type="checkbox" name={`role:${role}`} defaultChecked={node ? node.roles.includes(role) : role === "app" || role === "database"} />
            {role}
          </label>
        ))}
      </div>
      <p className="small" style={{ marginTop: 12 }}>
        Remote VPS nodes use the pasted private key encrypted at rest. Local nodes run probes on this machine and ignore SSH fields.
      </p>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" type="submit">{node ? "Save node" : "Create and open node"}</button>
        <a href="#" className="btn secondary">Cancel</a>
      </div>
    </form>
  );
}

export default async function NodesPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const nodes = await prisma.node.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { apps: true, databases: true } },
      metrics: { orderBy: { collectedAt: "desc" }, take: 1 },
      connectionLogs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const active = nodes.filter((n) => n.status === "active").length;
  const attention = nodes.filter((n) => ["degraded", "offline", "provisioning"].includes(n.status)).length;
  const totalCpu = nodes.reduce((sum, n) => sum + Number(n.cpuCores), 0);
  const totalRam = nodes.reduce((sum, n) => sum + n.ramBytes, BigInt(0));
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  return (
    <>
      <div className="actionbar">
        <div>
          <h1 className="h1">Nodes</h1>
          <p className="sub">VPS nodes with explicit SSH connectivity, health probes, and command logs.</p>
        </div>
        <a className="btn" href="#new-node">New node</a>
      </div>

      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="grid compact" style={{ marginBottom: 16 }}>
        <div className="card"><div className="k">Active nodes</div><div className="v">{active}</div></div>
        <div className="card"><div className="k">Need attention</div><div className="v">{attention}</div></div>
        <div className="card"><div className="k">vCPU</div><div className="v">{totalCpu}</div></div>
        <div className="card"><div className="k">RAM</div><div className="v">{bytes(totalRam)}</div></div>
      </div>

      <Table
        columns={["Node", "SSH target", "Status", "Connection", "Capacity", "Latest usage", "Workloads", "Actions"]}
        rows={nodes.map((n) => {
          const metric = n.metrics[0];
          const latestLog = n.connectionLogs[0];
          const usage = metric
            ? `${metric.cpuUsagePercent ?? "—"}% CPU / ${bytes(metric.ramUsedBytes)} RAM / ${bytes(metric.diskUsedBytes)} disk`
            : "No probe yet";
          return [
            <div key="node">
              <Link href={`/nodes/${n.id}`}><strong>{n.name}</strong></Link>
              <div className="small">{n.provider}{n.region ? ` / ${n.region}` : ""}</div>
            </div>,
            n.connectionMode === "local"
              ? <span className="badge muted">local</span>
              : n.sshHost && n.sshUser
                ? `${n.sshUser}@${n.sshHost}:${n.sshPort}`
                : <span className="err">Missing SSH config</span>,
            <Badge key="status" status={n.status} />,
            <div key="conn">
              <Badge status={n.lastConnectionStatus ?? "untested"} />
              <div className="small">{latestLog ? `${latestLog.action} ${latestLog.status}` : "No connection log"}</div>
            </div>,
            `${Number(n.cpuCores)} vCPU / ${bytes(n.ramBytes)} / ${bytes(n.diskBytes)}`,
            usage,
            `${n._count.apps} apps / ${n._count.databases} dbs`,
            <div className="row row-tight" key="actions">
              <Link className="btn sm secondary" href={`/nodes/${n.id}`}>Open</Link>
              <a className="btn sm secondary" href={`#edit-${n.id}`}>Edit</a>
              <form action={testConnection}><input type="hidden" name="id" value={n.id} /><button className="btn sm secondary">Test</button></form>
              <form action={collectMetrics}><input type="hidden" name="id" value={n.id} /><button className="btn sm secondary">Probe</button></form>
              <form action={drain}><input type="hidden" name="id" value={n.id} /><button className="btn sm secondary">Drain</button></form>
              {isLocalControlPlaneNode(n) ? (
                <span className="badge muted">Protected</span>
              ) : (
                <form action={disable}><input type="hidden" name="id" value={n.id} /><button className="btn sm danger">Disable</button></form>
              )}
              {n.status === "disabled" && !isLocalControlPlaneNode(n) && (
                <form action={deleteNode}><input type="hidden" name="id" value={n.id} /><button className="btn sm danger">Delete</button></form>
              )}
            </div>,
          ];
        })}
      />

      <div id="new-node" className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-head"><strong>New VPS node</strong><a href="#" className="modal-close">x</a></div>
          <div className="modal-body"><NodeForm title="Connect a VPS" action={createNode} /></div>
        </div>
      </div>

      {nodes.map((node) => (
        <div id={`edit-${node.id}`} className="modal-backdrop" key={node.id}>
          <div className="modal-card">
            <div className="modal-head"><strong>Edit {node.name}</strong><a href="#" className="modal-close">x</a></div>
            <div className="modal-body"><NodeForm title="Edit VPS connection" action={updateNode} node={node} /></div>
          </div>
        </div>
      ))}
    </>
  );
}
