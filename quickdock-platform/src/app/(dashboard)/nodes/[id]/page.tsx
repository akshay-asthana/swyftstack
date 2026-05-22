import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, sshNodeService } from "quickdock-shared";
import { Badge, bytes, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function testConnection(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  await sshNodeService.testConnection(id);
  revalidatePath(`/nodes/${id}`);
  revalidatePath("/nodes");
}

async function collectMetrics(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  await sshNodeService.collectMetrics(id);
  revalidatePath(`/nodes/${id}`);
  revalidatePath("/nodes");
}

async function collectLogs(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  await sshNodeService.collectLogs(id);
  revalidatePath(`/nodes/${id}`);
}

async function listServices(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  await sshNodeService.listRunningServices(id);
  revalidatePath(`/nodes/${id}`);
}

async function runCommand(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const command = str(formData, "command");
  if (!command || command.length > 1000) return;
  await sshNodeService.runCommand(id, command);
  revalidatePath(`/nodes/${id}`);
}

export default async function NodeDetailsPage({ params }: { params: { id: string } }) {
  const node = await prisma.node.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { apps: true, databases: true } },
      metrics: { orderBy: { collectedAt: "desc" }, take: 20 },
      connectionLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      apps: { select: { id: true, name: true, status: true, type: true } },
      databases: { select: { id: true, name: true, status: true, engine: true } },
    },
  });
  if (!node) notFound();

  const metric = node.metrics[0];
  const latestLog = node.connectionLogs[0];
  const sshTarget =
    node.connectionMode === "local"
      ? "Local machine"
      : node.sshHost && node.sshUser
        ? `${node.sshUser}@${node.sshHost}:${node.sshPort}`
        : "Not configured";
  const cpuUsage = metric?.cpuUsagePercent == null ? "—" : `${Number(metric.cpuUsagePercent).toFixed(1)}%`;

  return (
    <>
      <div className="actionbar">
        <div>
          <h1 className="h1">{node.name}</h1>
          <p className="sub">SSH diagnostics, resource monitoring, workloads, and command history.</p>
        </div>
        <Link href="/nodes" className="btn secondary">Back to nodes</Link>
      </div>

      <div className="grid compact" style={{ marginBottom: 16 }}>
        <div className="card"><div className="k">Node status</div><div className="v"><Badge status={node.status} /></div></div>
        <div className="card"><div className="k">Connection</div><div className="v"><Badge status={node.lastConnectionStatus ?? "untested"} /></div></div>
        <div className="card"><div className="k">CPU</div><div className="v">{cpuUsage}</div></div>
        <div className="card"><div className="k">RAM used</div><div className="v">{metric ? bytes(metric.ramUsedBytes) : "—"}</div></div>
        <div className="card"><div className="k">Disk used</div><div className="v">{metric ? bytes(metric.diskUsedBytes) : "—"}</div></div>
      </div>

      <nav className="tabs">
        <a className="active" href="#overview">Overview</a>
        <a href="#monitoring">Monitoring</a>
        <a href="#logs">Logs</a>
        <a href="#ssh">SSH</a>
        <a href="#settings">Settings</a>
      </nav>

      <div className="split">
        <div>
          <div id="overview" className="panel section-anchor">
            <div className="panel-head">
              <div>
                <div className="panel-title">Overview</div>
                <div className="small">{sshTarget}</div>
              </div>
              <div className="row">
                <form action={testConnection}><input type="hidden" name="id" value={node.id} /><button className="btn secondary">Test SSH</button></form>
                <form action={collectMetrics}><input type="hidden" name="id" value={node.id} /><button className="btn">Probe metrics</button></form>
                <form action={listServices}><input type="hidden" name="id" value={node.id} /><button className="btn secondary">Running services</button></form>
                <form action={collectLogs}><input type="hidden" name="id" value={node.id} /><button className="btn secondary">System logs</button></form>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div className="grid compact">
                <div><div className="small">Provider</div><strong>{node.provider}</strong></div>
                <div><div className="small">Region</div><strong>{node.region ?? "—"}</strong></div>
                <div><div className="small">Public IP</div><strong>{node.publicIp ?? "—"}</strong></div>
                <div><div className="small">Private IP</div><strong>{node.privateIp ?? "—"}</strong></div>
                <div><div className="small">Capacity</div><strong>{Number(node.cpuCores)} vCPU / {bytes(node.ramBytes)} / {bytes(node.diskBytes)}</strong></div>
                <div><div className="small">Last heartbeat</div><strong>{node.lastHeartbeatAt ? node.lastHeartbeatAt.toISOString() : "—"}</strong></div>
              </div>
              {node.lastConnectionError && <div className="err" style={{ marginTop: 12 }}>{node.lastConnectionError}</div>}
            </div>
          </div>

          <div id="monitoring" className="panel section-anchor">
            <div className="panel-head"><div className="panel-title">Monitoring</div></div>
            <div style={{ padding: 16 }}>
              <Table
                columns={["Collected", "CPU", "RAM", "Disk"]}
                rows={node.metrics.map((m) => [
                  m.collectedAt.toISOString().slice(0, 19).replace("T", " "),
                  m.cpuUsagePercent == null ? "—" : `${Number(m.cpuUsagePercent).toFixed(1)}%`,
                  bytes(m.ramUsedBytes),
                  bytes(m.diskUsedBytes),
                ])}
              />
            </div>
          </div>

          <div id="ssh" className="panel section-anchor">
            <div className="panel-head"><div className="panel-title">SSH Command</div></div>
            <form action={runCommand} style={{ padding: 16 }}>
              <input type="hidden" name="id" value={node.id} />
              <label>Command</label>
              <input name="command" placeholder="df -h && docker ps --format 'table {{.Names}}\t{{.Status}}'" maxLength={1000} />
              <div style={{ marginTop: 12 }}><button className="btn">Run command</button></div>
              <p className="small">Remote nodes use the encrypted pasted private key. Local nodes run the command directly on this machine.</p>
            </form>
          </div>

          <div id="settings" className="panel section-anchor">
            <div className="panel-head"><div className="panel-title">Settings</div></div>
            <div style={{ padding: 16 }}>
              <Table
                columns={["Key", "Value"]}
                rows={[
                  ["Connection mode", node.connectionMode],
                  ["SSH target", sshTarget],
                  ["SSH key", node.sshPrivateKeyEncrypted ? "stored encrypted" : "not stored"],
                  ["Roles", node.roles.join(", ") || "—"],
                  ["Agent/version", node.agentVersion ?? "—"],
                ]}
              />
            </div>
          </div>

          <div className="section-anchor">
            <Table
              columns={["Workload", "Type", "Status"]}
              rows={[
                ...node.apps.map((app) => [app.name, app.type, <Badge key="s" status={app.status} />]),
                ...node.databases.map((db) => [db.name, db.engine, <Badge key="s" status={db.status} />]),
              ]}
            />
          </div>
        </div>

        <div>
          <div id="logs" className="panel section-anchor">
            <div className="panel-head"><div className="panel-title">Latest Output</div></div>
            <div style={{ padding: 16 }}>
              {latestLog ? (
                <>
                  <div className="status-line" style={{ marginBottom: 10 }}>
                    <Badge status={latestLog.status} />
                    <span className="small">{latestLog.action} · {latestLog.createdAt.toISOString()}</span>
                  </div>
                  <pre className="log">{latestLog.output || latestLog.error || "No output."}</pre>
                </>
              ) : (
                <p className="small">No SSH commands have been run for this node yet.</p>
              )}
            </div>
          </div>

          <Table
            columns={["Time", "Action", "Status", "Exit"]}
            rows={node.connectionLogs.map((log) => [
              log.createdAt.toISOString().slice(0, 19).replace("T", " "),
              log.action,
              <Badge key="s" status={log.status} />,
              log.exitCode ?? "—",
            ])}
          />
        </div>
      </div>
    </>
  );
}
