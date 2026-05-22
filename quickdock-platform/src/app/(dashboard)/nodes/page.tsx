import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  audit,
  encryptSecret,
  isLocalControlPlaneNode,
  localNodeService,
  NODE_ROLES,
  prisma,
} from "quickdock-shared";
import { Badge, bytes, StatCard, Modal, timeAgo } from "@/components/ui";
import { DataTable, RowMenu, type DTRow } from "@/components/client";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  required: "Node name, provider, and at least one role are required.",
  ssh: "Remote VPS nodes require an SSH host, user, and private key.",
  port: "SSH port must be between 1 and 65535.",
  duplicate: "A node with that name already exists.",
  delete_status: "Only disabled nodes can be deleted.",
  delete_workloads: "Move or delete workloads before deleting this node.",
  local_protected: "The local control-plane node cannot be disabled or deleted.",
};

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function rolesFrom(formData: FormData): string[] {
  return NODE_ROLES.filter((role) => formData.get(`role:${role}`) === "on");
}

function validPort(value: string): number | null {
  const port = Number(value || 22);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}

const GB = BigInt(1024) ** BigInt(3);

// §2 — node creation collects connection details ONLY. CPU/RAM/disk are
// auto-detected by discovery on the node detail page before activation.
async function createNode(formData: FormData) {
  "use server";
  const name = str(formData, "name");
  const connectionMode = str(formData, "connectionMode") === "local" ? "local" : "ssh";
  const sshHost = str(formData, "sshHost");
  const sshUser = str(formData, "sshUser");
  const sshPrivateKey = String(formData.get("sshPrivateKey") ?? "").trim();
  const sshPort = validPort(str(formData, "sshPort"));
  const roles = rolesFrom(formData);

  if (!name || roles.length === 0) redirect("/nodes?error=required#new-node");
  if (connectionMode === "ssh" && (!sshHost || !sshUser || !sshPrivateKey)) {
    redirect("/nodes?error=ssh#new-node");
  }
  if (connectionMode === "ssh" && !sshPort) redirect("/nodes?error=port#new-node");
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
      sshPrivateKeyEncrypted: connectionMode === "ssh" ? encryptSecret(sshPrivateKey) : null,
      lastConnectionStatus: "untested",
      region: str(formData, "region") || null,
      // Provisioning until connection + discovery succeed and the admin
      // confirms roles. Capacity placeholders are overwritten by discovery.
      status: "provisioning",
      discoveryStatus: "pending",
      roles,
      cpuCores: 1,
      ramBytes: GB,
      diskBytes: BigInt(10) * GB,
    },
  });
  await audit({ actorType: "admin", action: "node.created", targetType: "node", targetId: node.id });
  redirect(`/nodes/${node.id}`);
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
    if (error instanceof Error && error.name === "ProtectedLocalNodeError") {
      redirect("/nodes?error=local_protected");
    }
    throw error;
  }
  revalidatePath("/nodes");
}

async function enable(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  await prisma.node.update({ where: { id }, data: { status: "active" } });
  await audit({ actorType: "admin", action: "node.enable", targetType: "node", targetId: id });
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
  redirect("/nodes");
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
    },
  });

  const online = nodes.filter((n) => n.status === "active").length;
  const degraded = nodes.filter((n) => ["degraded", "draining"].includes(n.status)).length;
  const offline = nodes.filter((n) => ["offline", "disabled", "provisioning"].includes(n.status)).length;
  const totalCpu = nodes.reduce((s, n) => s + Number(n.cpuCores), 0);
  const totalRam = nodes.reduce((s, n) => s + n.ramBytes, BigInt(0));
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  const rows: DTRow[] = nodes.map((n) => {
    const m = n.metrics[0];
    const usage = m
      ? `${m.cpuUsagePercent ?? "—"}% · ${bytes(m.ramUsedBytes)}`
      : "no probe";
    return {
      id: n.id,
      href: `/nodes/${n.id}`,
      values: {
        name: n.name,
        provider: n.provider,
        status: n.status,
        discovery: n.discoveryStatus ?? "—",
        cpu: Number(n.cpuCores),
        workloads: n._count.apps + n._count.databases,
      },
      cells: [
        <div key="n">
          <Link href={`/nodes/${n.id}`}><strong>{n.name}</strong></Link>
          <div className="small">{n.provider}{n.region ? ` · ${n.region}` : ""}</div>
        </div>,
        <Badge key="s" status={n.status} />,
        <Badge key="d" status={n.discoveryStatus ?? "pending"} />,
        n.discoveryStatus === "succeeded" || isLocalControlPlaneNode(n)
          ? `${Number(n.cpuCores)} vCPU · ${bytes(n.ramBytes)} · ${bytes(n.diskBytes)}`
          : <span className="small">pending discovery</span>,
        usage,
        `${n._count.apps} apps · ${n._count.databases} dbs`,
        <span key="hb" className="small">{timeAgo(n.lastHeartbeatAt)}</span>,
        <RowMenu key="m">
          <Link href={`/nodes/${n.id}`}>Open node</Link>
          <Link href={`/nodes/${n.id}#monitoring`}>Live monitoring</Link>
          <div className="sep" />
          <form action={drain}><input type="hidden" name="id" value={n.id} /><button>Drain node</button></form>
          {n.status === "disabled" ? (
            <form action={enable}><input type="hidden" name="id" value={n.id} /><button>Enable node</button></form>
          ) : !isLocalControlPlaneNode(n) ? (
            <form action={disable}><input type="hidden" name="id" value={n.id} /><button className="danger">Disable node</button></form>
          ) : null}
          {n.status === "disabled" && !isLocalControlPlaneNode(n) && (
            <form action={deleteNode}><input type="hidden" name="id" value={n.id} /><button className="danger">Delete node</button></form>
          )}
        </RowMenu>,
      ],
    };
  });

  return (
    <>
      <div className="actionbar">
        <div>
          <h1 className="h1">Nodes</h1>
          <p className="sub">VPS nodes auto-detect their hardware on connection. No manual capacity entry.</p>
        </div>
        <a className="btn" href="#new-node">+ Add node</a>
      </div>

      {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="nodes" tone="violet" label="Nodes online" value={online} />
        <StatCard icon="alert" tone="amber" label="Degraded / draining" value={degraded} />
        <StatCard icon="power" tone="rose" label="Offline / disabled" value={offline} />
        <StatCard icon="cpu" tone="blue" label="Total vCPU" value={totalCpu} />
        <StatCard icon="infra" tone="green" label="Total RAM" value={bytes(totalRam)} />
      </div>

      <DataTable
        columns={[
          { key: "name", label: "Node", sortable: true },
          { key: "status", label: "Status", sortable: true },
          { key: "discovery", label: "Discovery", sortable: true },
          { key: "capacity", label: "Detected capacity" },
          { key: "usage", label: "Latest usage" },
          { key: "workloads", label: "Workloads", sortable: true },
          { key: "heartbeat", label: "Heartbeat" },
          { key: "actions", label: "" },
        ]}
        rows={rows}
        filters={[
          { key: "status", label: "Status", options: ["active", "degraded", "offline", "disabled", "provisioning"] },
          { key: "discovery", label: "Discovery", options: ["pending", "succeeded", "failed"] },
        ]}
        searchPlaceholder="Search nodes by name or provider…"
        emptyText="No nodes yet. Add your first VPS node to begin."
      />

      <Modal id="new-node" title="Add a node">
        <form action={createNode}>
          <p className="small" style={{ marginTop: 0 }}>
            Enter connection details only. After saving, Quickdock connects to the host,
            auto-detects CPU / RAM / disk / OS / Docker, and you confirm before it goes active.
          </p>
          <div className="form-grid">
            <div><label>Node name</label><input name="name" placeholder="hetzner-fsn1-01" required /></div>
            <div><label>Provider</label><input name="provider" placeholder="hetzner" defaultValue="custom" required /></div>
            <div><label>Connection mode</label>
              <select name="connectionMode" defaultValue="ssh">
                <option value="ssh">Remote VPS over SSH</option>
                <option value="local">Local machine (no SSH)</option>
              </select>
            </div>
            <div><label>Region</label><input name="region" placeholder="fsn1" /></div>
            <div><label>SSH host / public IP</label><input name="sshHost" placeholder="203.0.113.10" /></div>
            <div><label>SSH user</label><input name="sshUser" placeholder="root" defaultValue="root" /></div>
            <div><label>SSH port</label><input name="sshPort" defaultValue={22} /></div>
            <div><label>Private IP (optional)</label><input name="privateIp" /></div>
            <div><label>Public IP (optional)</label><input name="publicIp" /></div>
            <div><label>Provider instance ID (optional)</label><input name="providerInstanceId" /></div>
          </div>
          <label>SSH private key</label>
          <textarea
            name="sshPrivateKey"
            rows={6}
            placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"}
          />
          <label>Roles</label>
          <div className="check-grid">
            {NODE_ROLES.map((role) => (
              <label className="check" key={role}>
                <input type="checkbox" name={`role:${role}`} defaultChecked={role === "app" || role === "database"} />
                {role}
              </label>
            ))}
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" type="submit">Save & run discovery</button>
            <a href="#" className="btn secondary">Cancel</a>
          </div>
        </form>
      </Modal>
    </>
  );
}
