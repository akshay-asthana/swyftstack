// Infrastructure → Nodes. Fleet capacity + usage + reservations cards (§3) and
// the node table with the full lifecycle menu (drain/disable/archive/delete).
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  audit,
  encryptSecret,
  env,
  isProductionEnv,
  isLocalControlPlaneNode,
  localNodeService,
  nodeDeletionService,
  nodeDrainService,
  NodeProtectedError,
  NodeHasWorkloadsError,
  NODE_ROLES,
  BANDWIDTH_IN_TYPES,
  BANDWIDTH_OUT_TYPES,
  normalizeSshPrivateKey,
  prisma,
} from "swyftstack-shared";
import { Badge, bytes, StatCard, Modal, timeAgo } from "@/components/ui";
import { DataTable, RowMenu, type DTRow } from "@/components/client";

const DEV_MODE = !isProductionEnv();
const NODES_TAB = "/infrastructure?tab=nodes";

export const NODE_ERRORS: Record<string, string> = {
  required: "Node name, provider, and at least one role are required.",
  ssh: "Remote VPS nodes require an SSH host, user, and private key.",
  ssh_key: "Paste a valid multiline SSH private key, not the .pub public key.",
  port: "SSH port must be between 1 and 65535.",
  duplicate: "A node with that name already exists.",
  local_exists: "A local node already exists. The platform allows only one local node.",
  node_protected: "This node is protected. Force-delete it in dev mode if you are sure.",
  node_workloads: "Move or delete this node's workloads before archiving or deleting it.",
  force_disabled: "Force delete is only available in development mode.",
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

// ---- server actions -------------------------------------------------------

async function createNode(formData: FormData) {
  "use server";
  const name = str(formData, "name");
  const connectionMode = str(formData, "connectionMode") === "local" ? "local" : "ssh";
  const sshHost = str(formData, "sshHost");
  const sshUser = str(formData, "sshUser");
  const sshPrivateKey = String(formData.get("sshPrivateKey") ?? "").trim();
  const sshPort = validPort(str(formData, "sshPort"));
  const roles = rolesFrom(formData);

  if (!name || roles.length === 0) redirect(`${NODES_TAB}&error=required#new-node`);
  if (connectionMode === "ssh" && (!sshHost || !sshUser || !sshPrivateKey)) {
    redirect(`${NODES_TAB}&error=ssh#new-node`);
  }
  let normalizedPrivateKey: string | null = null;
  if (connectionMode === "ssh") {
    try {
      normalizedPrivateKey = normalizeSshPrivateKey(sshPrivateKey);
    } catch {
      redirect(`${NODES_TAB}&error=ssh_key#new-node`);
    }
  }
  if (connectionMode === "ssh" && !sshPort) redirect(`${NODES_TAB}&error=port#new-node`);
  if (await prisma.node.findUnique({ where: { name }, select: { id: true } })) {
    redirect(`${NODES_TAB}&error=duplicate#new-node`);
  }
  if (connectionMode === "local") {
    const existingLocal = await prisma.node.findFirst({
      where: { OR: [{ isLocal: true }, { nodeKey: "local-dev" }, { connectionMode: "local" }] },
      select: { id: true },
    });
    if (existingLocal) redirect(`${NODES_TAB}&error=local_exists#new-node`);
  }

  const node = await prisma.node.create({
    data: {
      name,
      provider: str(formData, "provider") || "custom",
      providerInstanceId: str(formData, "providerInstanceId") || null,
      publicIp: str(formData, "publicIp") || (connectionMode === "ssh" ? sshHost : null),
      privateIp: str(formData, "privateIp") || null,
      connectionMode,
      isLocal: connectionMode === "local",
      isProtected: connectionMode === "local",
      nodeKey: connectionMode === "local" ? "local-dev" : undefined,
      sshHost: connectionMode === "ssh" ? sshHost : null,
      sshPort: connectionMode === "ssh" ? sshPort ?? 22 : 22,
      sshUser: connectionMode === "ssh" ? sshUser : null,
      sshPrivateKeyEncrypted: connectionMode === "ssh" && normalizedPrivateKey ? encryptSecret(normalizedPrivateKey) : null,
      lastConnectionStatus: "untested",
      region: str(formData, "region") || null,
      status: "provisioning",
      discoveryStatus: "pending",
      roles,
      cpuCores: 1,
      ramBytes: GB,
      diskBytes: BigInt(10) * GB,
    },
  });
  if (connectionMode === "ssh") {
    await prisma.node.update({ where: { id: node.id }, data: { nodeKey: `node:${node.id}` } });
  }
  await audit({ actorType: "admin", action: "node.created", targetType: "node", targetId: node.id });
  redirect(`/nodes/${node.id}`);
}

async function drain(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  // Mark draining + auto-enqueue migration jobs for every live workload on
  // the node. Blocked workloads (no healthy target) surface on the node
  // detail "Drain" tab as actionable errors.
  await nodeDrainService.startDrain(id);
  revalidatePath("/infrastructure");
  revalidatePath(`/nodes/${id}`);
}

async function disable(formData: FormData) {
  "use server";
  await localNodeService.disable(str(formData, "id"));
  revalidatePath("/infrastructure");
}

async function enable(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  await prisma.node.update({ where: { id }, data: { status: "active" } });
  await audit({ actorType: "admin", action: "node.enable", targetType: "node", targetId: id });
  revalidatePath("/infrastructure");
}

async function archiveNode(formData: FormData) {
  "use server";
  let err: string | null = null;
  try {
    await nodeDeletionService.archiveNode(str(formData, "id"));
  } catch (e) {
    if (e instanceof NodeProtectedError) err = "node_protected";
    else if (e instanceof NodeHasWorkloadsError) err = "node_workloads";
    else throw e;
  }
  if (err) redirect(`${NODES_TAB}&error=${err}`);
  revalidatePath("/infrastructure");
}

async function deleteNode(formData: FormData) {
  "use server";
  let err: string | null = null;
  try {
    await nodeDeletionService.deleteNode(str(formData, "id"));
  } catch (e) {
    if (e instanceof NodeProtectedError) err = "node_protected";
    else if (e instanceof NodeHasWorkloadsError) err = "node_workloads";
    else throw e;
  }
  redirect(err ? `${NODES_TAB}&error=${err}` : NODES_TAB);
}

async function forceDeleteNode(formData: FormData) {
  "use server";
  if (!DEV_MODE) redirect(`${NODES_TAB}&error=force_disabled`);
  await nodeDeletionService.forceDeleteNodeInDev(str(formData, "id"), { confirm: true });
  redirect(NODES_TAB);
}

// ---- section --------------------------------------------------------------

export async function NodesSection({
  searchParams,
}: {
  searchParams: { error?: string; archived?: string };
}) {
  const showArchived = searchParams.archived === "1";
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [nodes, runningApps, activeDbs, failedJobs, bwAgg] = await Promise.all([
    prisma.node.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { apps: true, databases: true } },
        metrics: { orderBy: { collectedAt: "desc" }, take: 1 },
      },
    }),
    prisma.app.count({ where: { status: "running" } }),
    prisma.database.count({ where: { status: "active" } }),
    prisma.job.count({ where: { status: "failed" } }),
    prisma.usageEvent.groupBy({
      by: ["usageType"],
      where: {
        recordedAt: { gte: todayStart },
        usageType: { in: ["node_network_in_bytes", "node_network_out_bytes"] },
      },
      _sum: { quantity: true },
    }),
  ]);

  const live = nodes.filter((n) => n.status !== "archived");
  const online = live.filter((n) => n.status === "active").length;
  const warning = live.filter((n) => ["degraded", "draining"].includes(n.status)).length;
  const offline = live.filter((n) => ["offline", "disabled", "provisioning"].includes(n.status)).length;

  const totalCpu = live.reduce((s, n) => s + Number(n.cpuCores), 0);
  const totalRam = live.reduce((s, n) => s + Number(n.ramBytes), 0);
  const totalDisk = live.reduce((s, n) => s + Number(n.diskBytes), 0);
  const reservedCpu = live.reduce((s, n) => s + Number(n.reservedCpu), 0);
  const reservedRam = live.reduce((s, n) => s + Number(n.reservedRamBytes), 0);
  const reservedDisk = live.reduce((s, n) => s + Number(n.reservedDiskBytes), 0);
  const usedRam = live.reduce((s, n) => s + Number(n.metrics[0]?.ramUsedBytes ?? 0), 0);
  const usedDisk = live.reduce((s, n) => s + Number(n.metrics[0]?.diskUsedBytes ?? 0), 0);
  const withCpu = live.filter((n) => n.metrics[0]?.cpuUsagePercent != null);
  const avgCpu =
    withCpu.length > 0
      ? withCpu.reduce((s, n) => s + Number(n.metrics[0]!.cpuUsagePercent ?? 0), 0) / withCpu.length
      : null;

  const netIn = Number(
    bwAgg.find((r) => r.usageType === "node_network_in_bytes")?._sum.quantity ?? 0,
  );
  const netOut = Number(
    bwAgg.find((r) => r.usageType === "node_network_out_bytes")?._sum.quantity ?? 0,
  );

  const error = searchParams.error ? NODE_ERRORS[searchParams.error] : null;

  const archivedNodes = nodes.filter((n) => n.status === "archived");
  const activeTableNodes = live;

  const renderRow = (n: typeof nodes[number]): DTRow => {
    const m = n.metrics[0];
    const stale = n.lastMetricAt && Date.now() - n.lastMetricAt.getTime() > 60_000;
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
          <div className="small">
            {n.provider}{n.region ? ` · ${n.region}` : ""}
            {n.isProtected ? " · protected" : ""}
          </div>
        </div>,
        <Badge key="s" status={n.status} />,
        <Badge key="d" status={n.discoveryStatus ?? "pending"} />,
        n.discoveryStatus === "succeeded" || isLocalControlPlaneNode(n)
          ? `${Number(n.cpuCores)} vCPU · ${bytes(n.ramBytes)} · ${bytes(n.diskBytes)}`
          : <span key="c" className="small">pending discovery</span>,
        usage,
        `${n._count.apps} apps · ${n._count.databases} dbs`,
        <span key="hb" className="small">
          {timeAgo(n.lastMetricAt ?? n.lastHeartbeatAt)}
          {stale && n.status !== "archived" ? <span className="tag" style={{ marginLeft: 6 }}>stale</span> : null}
        </span>,
        <RowMenu key="m">
          <Link href={`/nodes/${n.id}`}>View node</Link>
          {n.status !== "archived" && (
            <Link href={`/nodes/${n.id}#monitoring`}>Live monitoring</Link>
          )}
          <Link href={`/nodes/${n.id}#configuration`}>Configure node</Link>
          {n.status !== "archived" && <div className="sep" />}
          {n.status !== "draining" && n.status !== "archived" && (
            <form action={drain}><input type="hidden" name="id" value={n.id} /><button>Drain node</button></form>
          )}
          {n.status === "disabled" || n.status === "archived" ? (
            <form action={enable}><input type="hidden" name="id" value={n.id} /><button>Restore node</button></form>
          ) : (
            <form action={disable}><input type="hidden" name="id" value={n.id} /><button>Disable node</button></form>
          )}
          {!n.isProtected && n.status !== "archived" && (
            <form action={archiveNode}><input type="hidden" name="id" value={n.id} /><button>Archive node</button></form>
          )}
          {!n.isProtected && (
            <form action={deleteNode}><input type="hidden" name="id" value={n.id} /><button className="danger">Delete node</button></form>
          )}
          {n.isProtected && (
            <span className="small" style={{ padding: "4px 10px", display: "block" }}>
              Protected — force-delete in dev only
            </span>
          )}
          {DEV_MODE && (
            <form action={forceDeleteNode}><input type="hidden" name="id" value={n.id} /><button className="danger">Force delete (dev)</button></form>
          )}
        </RowMenu>,
      ],
    };
  };

  const activeRows = activeTableNodes.map(renderRow);
  const archivedRows = archivedNodes.map(renderRow);

  return (
    <>
      <div className="actionbar" style={{ marginBottom: 14 }}>
        <p className="sub" style={{ margin: 0 }}>
          VPS nodes auto-detect their hardware on connection. No manual capacity entry.
          {archivedNodes.length > 0 && (
            <> · <span className="muted">{archivedNodes.length} archived</span></>
          )}
        </p>
        <div className="row">
          {archivedNodes.length > 0 && (
            <a
              className="btn secondary"
              href={showArchived ? "/infrastructure?tab=nodes" : "/infrastructure?tab=nodes&archived=1"}
            >
              {showArchived ? "Hide archived" : `Show archived (${archivedNodes.length})`}
            </a>
          )}
          <a className="btn" href="#new-node">+ Add node</a>
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="grid compact" style={{ marginBottom: 14 }}>
        <StatCard icon="nodes" tone="violet" label="Nodes" value={live.length}
          deltaNote={`${online} online · ${warning} warning · ${offline} offline`} />
        <StatCard icon="cpu" tone="blue" label="vCPU reserved / total"
          value={`${reservedCpu.toFixed(0)} / ${totalCpu}`}
          deltaNote={avgCpu === null ? "usage not reported" : `${avgCpu.toFixed(0)}% actual usage`} />
        <StatCard icon="infra" tone="green" label="RAM used / total"
          value={`${bytes(usedRam)} / ${bytes(totalRam)}`}
          deltaNote={`${bytes(reservedRam)} reserved`} />
        <StatCard icon="storage" tone="amber" label="Disk used / total"
          value={`${bytes(usedDisk)} / ${bytes(totalDisk)}`}
          deltaNote={`${bytes(reservedDisk)} reserved`} />
      </div>
      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="arrowDown" tone="green" label="Network in (today)"
          value={netIn > 0 ? bytes(netIn) : "not reported"} />
        <StatCard icon="arrowUp" tone="violet" label="Network out (today)"
          value={netOut > 0 ? bytes(netOut) : "not reported"} />
        <StatCard icon="apps" tone="blue" label="Running apps" value={runningApps} />
        <StatCard icon="database" tone="violet" label="Active databases" value={activeDbs} />
        <StatCard icon="alert" tone="rose" label="Failed jobs" value={failedJobs} />
      </div>

      <DataTable
        columns={[
          { key: "name", label: "Node", sortable: true },
          { key: "status", label: "Status", sortable: true },
          { key: "discovery", label: "Discovery", sortable: true },
          { key: "capacity", label: "Detected capacity" },
          { key: "usage", label: "Latest usage" },
          { key: "workloads", label: "Workloads", sortable: true },
          { key: "heartbeat", label: "Last metric" },
          { key: "actions", label: "" },
        ]}
        rows={activeRows}
        filters={[
          { key: "status", label: "Status", options: ["active", "degraded", "offline", "disabled", "provisioning", "draining"] },
          { key: "discovery", label: "Discovery", options: ["pending", "succeeded", "failed"] },
        ]}
        searchPlaceholder="Search nodes by name or provider…"
        emptyText="No nodes yet. Add your first VPS node to begin."
      />

      {showArchived && archivedNodes.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div className="actionbar" style={{ marginBottom: 10 }}>
            <h2 className="h2" style={{ margin: 0 }}>Archived nodes</h2>
            <p className="sub" style={{ margin: 0 }}>
              Historical nodes — excluded from capacity totals and from scheduling. Restore to reactivate.
            </p>
          </div>
          <DataTable
            columns={[
              { key: "name", label: "Node", sortable: true },
              { key: "status", label: "Status" },
              { key: "discovery", label: "Discovery" },
              { key: "capacity", label: "Last detected capacity" },
              { key: "usage", label: "Last usage" },
              { key: "workloads", label: "Workloads" },
              { key: "heartbeat", label: "Last metric" },
              { key: "actions", label: "" },
            ]}
            rows={archivedRows}
            searchPlaceholder="Search archived nodes…"
            emptyText="No archived nodes."
          />
        </section>
      )}

      <Modal id="new-node" title="Add a node">
        <form action={createNode}>
          <p className="small" style={{ marginTop: 0 }}>
            Enter connection details only. After saving, Swyftstack connects to the host,
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
