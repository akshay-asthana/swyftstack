import { revalidatePath } from "next/cache";
import { audit, env, localNodeService, NODE_ROLES, prisma } from "quickdock-shared";
import { Table, Badge, bytes } from "@/components/ui";

export const dynamic = "force-dynamic";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function gbToBytes(value: string, fallbackGb: number): bigint {
  const n = Number(value || fallbackGb);
  return BigInt(Math.round(n * 1024 ** 3));
}

async function createNode(formData: FormData) {
  "use server";
  const roles = NODE_ROLES.filter((role) => formData.get(`role:${role}`) === "on");
  const node = await prisma.node.create({
    data: {
      name: str(formData, "name"),
      provider: str(formData, "provider") || "custom",
      providerInstanceId: str(formData, "providerInstanceId") || null,
      publicIp: str(formData, "publicIp") || null,
      privateIp: str(formData, "privateIp") || null,
      region: str(formData, "region") || null,
      status: str(formData, "status") as "provisioning" | "active",
      roles,
      cpuCores: Number(formData.get("cpuCores") || 2),
      ramBytes: gbToBytes(str(formData, "ramGb"), 4),
      diskBytes: gbToBytes(str(formData, "diskGb"), 80),
      agentVersion: "manual",
      lastHeartbeatAt: null,
    },
  });
  await audit({ actorType: "admin", action: "node.created", targetType: "node", targetId: node.id });
  revalidatePath("/nodes");
}

async function drain(formData: FormData) {
  "use server";
  await localNodeService.drain(String(formData.get("id")));
  revalidatePath("/nodes");
}

async function disable(formData: FormData) {
  "use server";
  await localNodeService.disable(String(formData.get("id")));
  revalidatePath("/nodes");
}

async function activate(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.node.update({ where: { id }, data: { status: "active", lastHeartbeatAt: new Date() } });
  await audit({ actorType: "admin", action: "node.active", targetType: "node", targetId: id });
  revalidatePath("/nodes");
}

export default async function NodesPage() {
  const nodes = await prisma.node.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { apps: true, databases: true } },
      metrics: { orderBy: { collectedAt: "desc" }, take: 1 },
    },
  });

  const active = nodes.filter((n) => n.status === "active").length;
  const degraded = nodes.filter((n) => n.status === "degraded" || n.status === "offline").length;
  const totalCpu = nodes.reduce((sum, n) => sum + Number(n.cpuCores), 0);
  const totalRam = nodes.reduce((sum, n) => sum + n.ramBytes, BigInt(0));

  return (
    <>
      <h1 className="h1">Nodes</h1>
      <p className="sub">Register VPS capacity, track health, and drain nodes before maintenance.</p>

      <div className="grid compact" style={{ marginBottom: 16 }}>
        <div className="card"><div className="k">Active nodes</div><div className="v">{active}</div></div>
        <div className="card"><div className="k">Attention</div><div className="v">{degraded}</div></div>
        <div className="card"><div className="k">vCPU</div><div className="v">{totalCpu}</div></div>
        <div className="card"><div className="k">RAM</div><div className="v">{bytes(totalRam)}</div></div>
      </div>

      <div className="split">
        <Table
          columns={["Name", "Provider", "Region", "Roles", "Status", "Capacity", "Usage", "Workloads", "Heartbeat", "Actions"]}
          rows={nodes.map((n) => {
            const metric = n.metrics[0];
            const usage = metric
              ? `${metric.cpuUsagePercent ?? "—"}% CPU / ${bytes(metric.ramUsedBytes)} RAM`
              : "—";
            return [
              <strong key="n">{n.name}</strong>,
              n.provider,
              n.region ?? "—",
              n.roles.join(", ") || "—",
              <Badge key="s" status={n.status} />,
              `${Number(n.cpuCores)} vCPU / ${bytes(n.ramBytes)} / ${bytes(n.diskBytes)}`,
              usage,
              `${n._count.apps} apps / ${n._count.databases} dbs`,
              n.lastHeartbeatAt ? n.lastHeartbeatAt.toISOString().slice(0, 19).replace("T", " ") : "—",
              <div className="row" key="a">
                <form action={activate}><input type="hidden" name="id" value={n.id} /><button className="btn secondary">Activate</button></form>
                <form action={drain}><input type="hidden" name="id" value={n.id} /><button className="btn secondary">Drain</button></form>
                <form action={disable}><input type="hidden" name="id" value={n.id} /><button className="btn danger">Disable</button></form>
              </div>,
            ];
          })}
        />

        <form action={createNode} className="card">
          <div className="panel-title">Register VPS Node</div>
          <div className="form-grid">
            <div><label>Name</label><input name="name" placeholder="hetzner-fsn1-01" required /></div>
            <div><label>Provider</label><input name="provider" placeholder="hetzner" defaultValue="custom" /></div>
            <div><label>Instance ID</label><input name="providerInstanceId" /></div>
            <div><label>Region</label><input name="region" placeholder="fsn1" /></div>
            <div><label>Public IP</label><input name="publicIp" /></div>
            <div><label>Private IP</label><input name="privateIp" /></div>
            <div><label>CPU cores</label><input name="cpuCores" defaultValue="2" /></div>
            <div><label>RAM GB</label><input name="ramGb" defaultValue="4" /></div>
            <div><label>Disk GB</label><input name="diskGb" defaultValue="80" /></div>
            <div><label>Status</label>
              <select name="status" defaultValue="provisioning">
                <option value="provisioning">provisioning</option>
                <option value="active">active</option>
              </select>
            </div>
          </div>
          <label>Roles</label>
          <div className="check-grid">
            {NODE_ROLES.map((role) => (
              <label className="check" key={role}>
                <input type="checkbox" name={`role:${role}`} defaultChecked={role === "app" || role === "database"} />
                {role}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 14 }}><button className="btn">Register node</button></div>
          <p className="small" style={{ marginTop: 12 }}>
            Agent placeholder: <code>curl -fsSL {env.PLATFORM_BASE_URL}/api/admin/nodes/agent-install.sh | NODE_TOKEN=&lt;token&gt; sh</code>
          </p>
        </form>
      </div>
    </>
  );
}
