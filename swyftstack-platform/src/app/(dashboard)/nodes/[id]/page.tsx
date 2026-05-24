import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  audit,
  discoveryService,
  encryptSecret,
  isLocalControlPlaneNode,
  localNodeService,
  nodeDrainService,
  NODE_ROLES,
  normalizeSshPrivateKey,
  prisma,
  sshNodeService,
} from "swyftstack-shared";
import {
  Badge, bytes, Panel, KeyValue, Table,
  Breadcrumbs, ProgressBar, timeAgo,
} from "@/components/ui";
import { Tabs, ConfirmButton, NodeTerminal } from "@/components/client";
import { NodeMetricCards, NodeMonitor, type MonitorData } from "@/components/node-monitor";

export const dynamic = "force-dynamic";

const DETAIL_ERRORS: Record<string, string> = {
  required: "Node name is required.",
  duplicate: "A node with that name already exists.",
  ssh: "Remote VPS nodes require an SSH host, user, and valid SSH port.",
  ssh_key: "Paste a valid multiline SSH private key, not the .pub public key.",
};

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function validPort(value: string): number | null {
  const port = Number(value || 22);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}

// ---- server actions ----------------------------------------------------
async function runDiscovery(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  // discoverNode runs the connection test + probe and records its own errors.
  await discoveryService.discoverNode(id).catch(() => undefined);
  revalidatePath(`/nodes/${id}`);
}

async function activateNode(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const roles = NODE_ROLES.filter((r) => formData.get(`role:${r}`) === "on");
  const node = await prisma.node.findUniqueOrThrow({ where: { id } });
  if (node.discoveryStatus !== "succeeded") {
    revalidatePath(`/nodes/${id}`);
    return;
  }
  await prisma.node.update({
    where: { id },
    data: { status: "active", roles: roles.length ? roles : node.roles, lastHeartbeatAt: new Date() },
  });
  await audit({ actorType: "admin", action: "node.activated", targetType: "node", targetId: id });
  revalidatePath(`/nodes/${id}`);
}

async function refreshMetrics(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const node = await prisma.node.findUniqueOrThrow({ where: { id } });
  if (isLocalControlPlaneNode(node)) await localNodeService.collectMetrics(id);
  else await sshNodeService.collectMetrics(id);
  revalidatePath(`/nodes/${id}`);
}

async function healthCheck(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const node = await prisma.node.findUniqueOrThrow({ where: { id } });
  if (isLocalControlPlaneNode(node)) {
    await localNodeService.collectMetrics(id);
    await localNodeService.reconcileHealth();
  } else {
    await sshNodeService.testConnection(id);
  }
  revalidatePath(`/nodes/${id}`);
}

async function setStatus(formData: FormData, status: "disabled" | "active") {
  const id = str(formData, "id");
  if (status === "disabled") {
    await localNodeService.disable(id).catch(() => undefined);
  } else {
    await prisma.node.update({ where: { id }, data: { status } });
    await audit({ actorType: "admin", action: `node.${status}`, targetType: "node", targetId: id });
  }
  revalidatePath(`/nodes/${id}`);
}
async function drainNode(fd: FormData) {
  "use server";
  const id = str(fd, "id");
  await nodeDrainService.startDrain(id);
  revalidatePath(`/nodes/${id}`);
}
async function retryDrain(fd: FormData) {
  "use server";
  const id = str(fd, "id");
  await nodeDrainService.startDrain(id);
  revalidatePath(`/nodes/${id}`);
}
async function cancelDrain(fd: FormData) {
  "use server";
  const id = str(fd, "id");
  await nodeDrainService.cancelDrain(id);
  revalidatePath(`/nodes/${id}`);
}
async function disableNode(fd: FormData) { "use server"; await setStatus(fd, "disabled"); }
async function enableNode(fd: FormData) { "use server"; await setStatus(fd, "active"); }

async function saveCapacity(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const num = (k: string) => Number(str(formData, k)) || 0;
  await prisma.node.update({
    where: { id },
    data: {
      reservedCpu: num("reservedCpu"),
      reservedRamBytes: BigInt(Math.round(num("reservedRamGb") * 1024 ** 3)),
      reservedDiskBytes: BigInt(Math.round(num("reservedDiskGb") * 1024 ** 3)),
    },
  });
  await audit({ actorType: "admin", action: "node.capacity_updated", targetType: "node", targetId: id });
  revalidatePath(`/nodes/${id}`);
}

async function saveRoles(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const roles = NODE_ROLES.filter((r) => formData.get(`role:${r}`) === "on");
  await prisma.node.update({ where: { id }, data: { roles } });
  await audit({ actorType: "admin", action: "node.roles_updated", targetType: "node", targetId: id });
  revalidatePath(`/nodes/${id}`);
}

async function saveNodeConfig(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const node = await prisma.node.findUniqueOrThrow({ where: { id } });
  const protectedLocal = isLocalControlPlaneNode(node);
  const connectionMode = protectedLocal || str(formData, "connectionMode") === "local" ? "local" : "ssh";
  const sshHost = str(formData, "sshHost");
  const sshUser = str(formData, "sshUser");
  const sshPort = validPort(str(formData, "sshPort"));
  const keyInput = String(formData.get("sshPrivateKey") ?? "").trim();
  const name = str(formData, "name");

  if (!name) redirect(`/nodes/${id}?error=required#configuration`);
  if (await prisma.node.findFirst({ where: { name, NOT: { id } }, select: { id: true } })) {
    redirect(`/nodes/${id}?error=duplicate#configuration`);
  }
  if (connectionMode === "ssh" && (!sshHost || !sshUser || !sshPort)) {
    redirect(`/nodes/${id}?error=ssh#configuration`);
  }

  let normalizedPrivateKey: string | null = null;
  if (keyInput) {
    try {
      normalizedPrivateKey = normalizeSshPrivateKey(keyInput);
    } catch {
      redirect(`/nodes/${id}?error=ssh_key#configuration`);
    }
  }

  const connectionChanged =
    connectionMode !== node.connectionMode ||
    sshHost !== (node.sshHost ?? "") ||
    sshUser !== (node.sshUser ?? "") ||
    (sshPort ?? 22) !== Number(node.sshPort || 22) ||
    Boolean(normalizedPrivateKey);

  await prisma.node.update({
    where: { id },
    data: {
      name,
      provider: str(formData, "provider") || "custom",
      providerInstanceId: str(formData, "providerInstanceId") || null,
      publicIp: str(formData, "publicIp") || (connectionMode === "ssh" ? sshHost : null),
      privateIp: str(formData, "privateIp") || null,
      region: str(formData, "region") || null,
      connectionMode,
      sshHost: connectionMode === "ssh" ? sshHost : null,
      sshPort: connectionMode === "ssh" ? sshPort ?? 22 : 22,
      sshUser: connectionMode === "ssh" ? sshUser : null,
      ...(normalizedPrivateKey ? { sshPrivateKeyEncrypted: encryptSecret(normalizedPrivateKey) } : {}),
      ...(connectionChanged
        ? {
            lastConnectionStatus: "untested",
            lastConnectionError: null,
            discoveryStatus: "pending",
            discoveryError: null,
            status: node.status === "active" ? "provisioning" : node.status,
          }
        : {}),
    },
  });
  await audit({
    actorType: "admin",
    action: "node.config_updated",
    targetType: "node",
    targetId: id,
    metadata: { connectionMode, connectionChanged, keyRotated: Boolean(normalizedPrivateKey) },
  });
  revalidatePath(`/nodes/${id}`);
  redirect(`/nodes/${id}#configuration`);
}

// ---- page --------------------------------------------------------------
export default async function NodeDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  const node = await prisma.node.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { apps: true, databases: true } },
      metrics: { orderBy: { collectedAt: "desc" }, take: 60 },
      connectionLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      networkInterfaces: true,
      diskMounts: true,
      hardwareSnapshots: { orderBy: { collectedAt: "desc" }, take: 5 },
      apps: { select: { id: true, name: true, status: true, type: true } },
      databases: { select: { id: true, name: true, status: true, engine: true, currentSizeBytes: true } },
    },
  });
  if (!node) notFound();

  const [events, buildDeployments, drainStatus] = await Promise.all([
    prisma.auditLog.findMany({
      where: { targetType: "node", targetId: node.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.deployment.findMany({
      where: { buildNodeId: node.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { app: { select: { name: true } } },
    }),
    nodeDrainService.drainStatus(node.id),
  ]);
  const drainBlocked = events
    .filter((e) => e.action === "node.drain_enqueued")
    .flatMap((e) => {
      const meta = e.metadata as { blockedDetail?: { kind: string; name: string; reason: string }[] };
      return meta?.blockedDetail ?? [];
    })
    .slice(0, 20);

  const metrics = [...node.metrics].reverse();
  const latest = node.metrics[0];
  const onboarding = node.status === "provisioning" || node.discoveryStatus !== "succeeded";
  const isLocal = isLocalControlPlaneNode(node);
  const error = searchParams?.error ? DETAIL_ERRORS[searchParams.error] : null;
  const initialMonitorData: MonitorData = {
    status: node.status,
    lastMetricAt: (node.lastMetricAt ?? node.lastHeartbeatAt)?.toISOString() ?? null,
    metrics: metrics.map((m) => ({
      collectedAt: m.collectedAt.toISOString(),
      cpuUsagePercent: m.cpuUsagePercent === null ? null : Number(m.cpuUsagePercent),
      cpuLoad1: m.cpuLoad1 === null ? null : Number(m.cpuLoad1),
      ramUsedBytes: Number(m.ramUsedBytes ?? 0),
      ramTotalBytes: Number(m.ramTotalBytes ?? 0),
      diskUsedBytes: Number(m.diskUsedBytes ?? 0),
      networkRxBytes: Number(m.networkRxBytes ?? 0),
      networkTxBytes: Number(m.networkTxBytes ?? 0),
      containersRunning: m.containersRunning ?? 0,
      containersFailed: m.containersFailed ?? 0,
    })),
  };

  // capacity math
  const cpuCap = Number(node.cpuCores);
  const ramCap = Number(node.ramBytes);
  const diskCap = Number(node.diskBytes);
  const ramUsed = latest ? Number(latest.ramUsedBytes ?? 0) : 0;
  const diskUsed = latest ? Number(latest.diskUsedBytes ?? 0) : 0;
  const reservedCpu = Number(node.reservedCpu);
  const oversub = cpuCap > 0 ? (reservedCpu / cpuCap).toFixed(2) : "0.00";

  // --- Onboarding panel -------------------------------------------------
  const onboardingPanel = onboarding && (
    <Panel title="Node onboarding">
      <ol className="guide" style={{ margin: 0, boxShadow: "none", border: "none", padding: 0 }}>
        <li>Connection details saved.</li>
        <li>Test the connection and auto-detect hardware.</li>
        <li>Review the detected CPU / RAM / disk / OS.</li>
        <li>Confirm roles and activate.</li>
      </ol>
      {node.discoveryStatus === "failed" && (
        <div className="err" style={{ margin: "12px 0" }}>
          Discovery failed: {node.discoveryError ?? "unknown error"}
        </div>
      )}
      {node.discoveryStatus === "running" && (
        <div className="small" style={{ margin: "12px 0" }}>Discovery in progress…</div>
      )}
      {node.discoveryStatus === "succeeded" ? (
        <>
          <div className="section-title">Detected hardware</div>
          <KeyValue
            rows={[
              ["CPU", `${Number(node.cpuCores)} vCPU${node.cpuModel ? ` — ${node.cpuModel}` : ""}`],
              ["RAM", bytes(node.ramBytes)],
              ["Disk", bytes(node.diskBytes)],
              ["OS", `${node.osName ?? "?"} ${node.osVersion ?? ""}`],
              ["Docker", node.dockerInstalled ? node.dockerVersion ?? "installed" : "not installed"],
              ["Architecture", node.architecture ?? "—"],
            ]}
          />
          <form action={activateNode} style={{ marginTop: 14 }}>
            <input type="hidden" name="id" value={node.id} />
            <label>Confirm roles</label>
            <div className="check-grid">
              {NODE_ROLES.map((r) => (
                <label className="check" key={r}>
                  <input type="checkbox" name={`role:${r}`} defaultChecked={node.roles.includes(r)} />
                  {r}
                </label>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <button className="btn" type="submit">Confirm & activate node</button>
            </div>
          </form>
          <form action={runDiscovery} style={{ marginTop: 10 }}>
            <input type="hidden" name="id" value={node.id} />
            <button className="btn secondary" type="submit">Re-run discovery</button>
          </form>
        </>
      ) : (
        <form action={runDiscovery} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={node.id} />
          <button className="btn" type="submit">Test connection & detect hardware</button>
        </form>
      )}
    </Panel>
  );

  // --- Tab content ------------------------------------------------------
  const overviewTab = (
    <div className="split-even">
      <Panel title="Identity">
        <KeyValue
          rows={[
            ["Provider", node.provider],
            ["Region", node.region ?? "—"],
            ["Public IP", node.publicIp ?? "—"],
            ["Private IP", node.privateIp ?? "—"],
            ["Connection", node.connectionMode],
            ["Roles", node.roles.join(", ") || "—"],
            ["Created", node.createdAt.toISOString().slice(0, 16).replace("T", " ")],
            ["Last heartbeat", timeAgo(node.lastHeartbeatAt)],
          ]}
        />
      </Panel>
      <Panel title="Hardware">
        <KeyValue
          rows={[
            ["CPU model", node.cpuModel ?? "—"],
            ["vCPU / threads", `${Number(node.cpuCores)} / ${node.cpuThreads ?? "—"}`],
            ["RAM", bytes(node.ramBytes)],
            ["Disk", bytes(node.diskBytes)],
            ["OS", `${node.osName ?? "—"} ${node.osVersion ?? ""}`],
            ["Kernel", node.kernelVersion ?? "—"],
            ["Docker", node.dockerInstalled ? node.dockerVersion ?? "yes" : "not installed"],
            ["Uptime", node.uptimeSeconds ? `${Math.floor(Number(node.uptimeSeconds) / 3600)}h` : "—"],
            ["Detected", timeAgo(node.hardwareDetectedAt)],
          ]}
        />
      </Panel>
      <Panel title={`Network interfaces (${node.networkInterfaces.length})`} flush>
        <Table
          columns={["Interface", "MAC", "IPv4", "IPv6", "Primary"]}
          rows={node.networkInterfaces.map((i) => [
            i.name, i.macAddress ?? "—", i.ipv4 ?? "—", i.ipv6 ?? "—",
            i.isPrimary ? <Badge key="p" status="active" /> : "—",
          ])}
        />
      </Panel>
      <Panel title={`Disk mounts (${node.diskMounts.length})`} flush>
        <Table
          columns={["Mount", "Device", "FS", "Total", "Used"]}
          rows={node.diskMounts.map((d) => [
            d.mountPoint, d.device ?? "—", d.fsType ?? "—", bytes(d.totalBytes), bytes(d.usedBytes),
          ])}
        />
      </Panel>
    </div>
  );

  // Live monitoring (§4): the client component polls /metrics every ~8s and
  // shows a stale warning if collection stops. SSR data renders immediately.
  const monitoringTab = (
    <NodeMonitor nodeId={node.id} initial={initialMonitorData} />
  );

  const drainInFlight = drainStatus.migrations.filter((m) =>
    ["pending", "running", "verifying"].includes(m.status),
  );
  const drainCompleted = drainStatus.migrations.filter((m) => m.status === "completed");
  const drainFailed = drainStatus.migrations.filter((m) => ["failed", "rolled_back"].includes(m.status));

  const drainTab = (
    <>
      <Panel title="Drain status">
        <KeyValue
          rows={[
            ["Node status", <Badge key="ns" status={drainStatus.nodeStatus} />],
            ["Workloads remaining on this node", String(drainStatus.remainingWorkloads)],
            ["Migrations in flight", String(drainInFlight.length)],
            ["Migrations completed", String(drainCompleted.length)],
            ["Migrations failed", String(drainFailed.length)],
            ["Blocked workloads (no target)", String(drainBlocked.length)],
          ]}
        />
        <div className="row" style={{ marginTop: 12, gap: 8 }}>
          {node.status === "draining" ? (
            <>
              <form action={retryDrain}>
                <input type="hidden" name="id" value={node.id} />
                <button className="btn secondary">Retry drain (enqueue missing migrations)</button>
              </form>
              {drainInFlight.length === 0 && (
                <form action={cancelDrain}>
                  <input type="hidden" name="id" value={node.id} />
                  <ConfirmButton message="Cancel drain and restore node to active?" className="btn danger">
                    Cancel drain
                  </ConfirmButton>
                </form>
              )}
            </>
          ) : (
            <form action={drainNode}>
              <input type="hidden" name="id" value={node.id} />
              <button className="btn">Start drain</button>
            </form>
          )}
        </div>
        {drainBlocked.length > 0 && (
          <div className="err" style={{ marginTop: 12 }}>
            <strong>Blocked workloads:</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {drainBlocked.map((b, i) => (
                <li key={i}>
                  {b.kind} <code>{b.name}</code> — {b.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>
      <Panel title="Migration jobs" flush>
        <Table
          columns={["Resource", "Target node", "Status", "Created", "Error"]}
          rows={drainStatus.migrations.map((m) => [
            `${m.resourceType} ${m.resourceId?.slice(0, 8) ?? "—"}`,
            m.targetNodeId ? m.targetNodeId.slice(0, 8) : "—",
            <Badge key="s" status={m.status} />,
            timeAgo(m.createdAt),
            <span key="e" className="small">{m.errorMessage ?? "—"}</span>,
          ])}
        />
      </Panel>
    </>
  );

  const workloadsTab = (
    <>
      <Panel title={`Apps on this node (${node.apps.length})`} flush>
        <Table
          columns={["App", "Type", "Status"]}
          rows={node.apps.map((a) => [
            <Link key="l" href={`/apps`}>{a.name}</Link>, a.type, <Badge key="s" status={a.status} />,
          ])}
        />
      </Panel>
      <Panel title={`Databases on this node (${node.databases.length})`} flush>
        <Table
          columns={["Database", "Engine", "Size", "Status"]}
          rows={node.databases.map((d) => [
            d.name, d.engine, bytes(d.currentSizeBytes), <Badge key="s" status={d.status} />,
          ])}
        />
      </Panel>
      <Panel title={`Build jobs on this node (${buildDeployments.length})`} flush>
        <Table
          columns={["App", "Status", "Source", "When"]}
          rows={buildDeployments.map((d) => [
            d.app.name, <Badge key="s" status={d.status} />, d.sourceType, timeAgo(d.createdAt),
          ])}
        />
      </Panel>
    </>
  );

  const capacityTab = (
    <div className="split-even">
      <Panel title="Capacity & reservations">
        <ProgressBar used={reservedCpu} limit={cpuCap} label="Reserved vCPU" format={(n) => n.toFixed(1)} />
        <ProgressBar used={Number(node.reservedRamBytes)} limit={ramCap} label="Reserved RAM" format={bytes} />
        <ProgressBar used={Number(node.reservedDiskBytes)} limit={diskCap} label="Reserved disk" format={bytes} />
        <div style={{ height: 10 }} />
        <ProgressBar used={ramUsed} limit={ramCap} label="Actual RAM in use" format={bytes} />
        <ProgressBar used={diskUsed} limit={diskCap} label="Actual disk in use" format={bytes} />
        <KeyValue
          rows={[
            ["Oversubscription ratio", `${oversub}×`],
            ["Available vCPU", (cpuCap - reservedCpu).toFixed(1)],
            ["Available RAM", bytes(ramCap - Number(node.reservedRamBytes))],
            ["Available disk", bytes(diskCap - Number(node.reservedDiskBytes))],
          ]}
        />
      </Panel>
      <Panel title="Edit reservations">
        <form action={saveCapacity}>
          <input type="hidden" name="id" value={node.id} />
          <div className="form-grid">
            <div><label>Reserved vCPU</label><input name="reservedCpu" defaultValue={reservedCpu} /></div>
            <div><label>Reserved RAM (GB)</label><input name="reservedRamGb" defaultValue={(Number(node.reservedRamBytes) / 1024 ** 3).toFixed(1)} /></div>
            <div><label>Reserved disk (GB)</label><input name="reservedDiskGb" defaultValue={(Number(node.reservedDiskBytes) / 1024 ** 3).toFixed(1)} /></div>
          </div>
          <div style={{ marginTop: 12 }}><button className="btn" type="submit">Save reservations</button></div>
        </form>
        <form action={saveRoles} style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <input type="hidden" name="id" value={node.id} />
          <label>Roles</label>
          <div className="check-grid">
            {NODE_ROLES.map((r) => (
              <label className="check" key={r}>
                <input type="checkbox" name={`role:${r}`} defaultChecked={node.roles.includes(r)} />
                {r}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 12 }}><button className="btn secondary" type="submit">Save roles</button></div>
        </form>
      </Panel>
    </div>
  );

  const logsTab = (
    <>
      <Panel title="Terminal">
        <NodeTerminal nodeId={node.id} defaultCommand="docker ps --format '{{.Names}}: {{.Status}}'" />
      </Panel>
      <Panel title="Connection log" flush>
        <Table
          columns={["Time", "Action", "Status", "Exit", "Duration", "Command", "Output"]}
          rows={node.connectionLogs.map((l) => [
            l.createdAt.toISOString().slice(0, 19).replace("T", " "),
            l.action, <Badge key="s" status={l.status} />, l.exitCode ?? "—", `${l.durationMs}ms`,
            <span key="c" className="small">{l.command ? l.command.slice(0, 96) : "—"}</span>,
            <span key="o" className="small">{(l.output || l.error || "—").slice(0, 120)}</span>,
          ])}
        />
      </Panel>
    </>
  );

  const eventsTab = (
    <Panel title="Node events" flush>
      <Table
        columns={["Time", "Event", "Actor", "Detail"]}
        rows={events.map((e) => [
          e.createdAt.toISOString().slice(0, 19).replace("T", " "),
          e.action, e.actorType,
          <span key="d" className="small">{JSON.stringify(e.metadata)}</span>,
        ])}
      />
    </Panel>
  );

  const configTab = (
    <Panel title="VPS configuration">
      <form action={saveNodeConfig}>
        <input type="hidden" name="id" value={node.id} />
        {isLocal && <input type="hidden" name="connectionMode" value="local" />}
        <div className="form-grid">
          <div><label>Node name</label><input name="name" defaultValue={node.name} required /></div>
          <div><label>Provider</label><input name="provider" defaultValue={node.provider} required /></div>
          <div><label>Connection mode</label>
            <select name="connectionMode" defaultValue={node.connectionMode} disabled={isLocal}>
              <option value="ssh">Remote VPS over SSH</option>
              <option value="local">Local machine (no SSH)</option>
            </select>
          </div>
          <div><label>Region</label><input name="region" defaultValue={node.region ?? ""} /></div>
          <div><label>SSH host / public IP</label><input name="sshHost" defaultValue={node.sshHost ?? node.publicIp ?? ""} disabled={isLocal} /></div>
          <div><label>SSH user</label><input name="sshUser" defaultValue={node.sshUser ?? "root"} disabled={isLocal} /></div>
          <div><label>SSH port</label><input name="sshPort" defaultValue={node.sshPort} disabled={isLocal} /></div>
          <div><label>Private IP</label><input name="privateIp" defaultValue={node.privateIp ?? ""} /></div>
          <div><label>Public IP</label><input name="publicIp" defaultValue={node.publicIp ?? ""} /></div>
          <div><label>Provider instance ID</label><input name="providerInstanceId" defaultValue={node.providerInstanceId ?? ""} /></div>
        </div>
        {!isLocal && (
          <>
            <label>SSH private key (leave blank to keep current)</label>
            <textarea
              name="sshPrivateKey"
              rows={6}
              placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"}
            />
          </>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" type="submit">Save configuration</button>
        </div>
      </form>
      {!isLocal && (
        <form action={runDiscovery} style={{ marginTop: 10 }}>
          <input type="hidden" name="id" value={node.id} />
          <button className="btn secondary" type="submit">Test & rediscover</button>
        </form>
      )}
    </Panel>
  );

  return (
    <>
      <Breadcrumbs items={[
        { label: "Infrastructure", href: "/infrastructure" },
        { label: "Nodes", href: "/infrastructure?tab=nodes" },
        { label: node.name },
      ]} />
      <div className="actionbar">
        <div>
          <h1 className="h1">{node.name}</h1>
          <p className="sub">
            {node.provider}{node.region ? ` · ${node.region}` : ""} ·{" "}
            <Badge status={node.status} /> · discovery <Badge status={node.discoveryStatus ?? "pending"} />
          </p>
        </div>
        <div className="row">
          <form action={refreshMetrics}><input type="hidden" name="id" value={node.id} /><button className="btn secondary">Refresh metrics</button></form>
          <form action={healthCheck}><input type="hidden" name="id" value={node.id} /><button className="btn secondary">Health check</button></form>
          <form action={runDiscovery}><input type="hidden" name="id" value={node.id} /><button className="btn secondary">Refresh hardware</button></form>
          {node.status === "active" && (
            <form action={drainNode}><input type="hidden" name="id" value={node.id} /><button className="btn secondary">Drain</button></form>
          )}
          {node.status === "disabled" ? (
            <form action={enableNode}><input type="hidden" name="id" value={node.id} /><button className="btn secondary">Enable</button></form>
          ) : !isLocal ? (
            <form action={disableNode}>
              <input type="hidden" name="id" value={node.id} />
              <ConfirmButton message={`Disable ${node.name}? Workloads will stop scheduling here.`} className="btn danger">
                Disable
              </ConfirmButton>
            </form>
          ) : null}
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 14 }}>{error}</div>}

      <NodeMetricCards nodeId={node.id} initial={initialMonitorData} />

      {onboardingPanel}

      <Tabs
        tabs={[
          { id: "overview", label: "Overview", icon: "nodes", content: overviewTab },
          { id: "monitoring", label: "Live monitoring", icon: "usage", content: monitoringTab },
          { id: "workloads", label: "Workloads", icon: "apps", content: workloadsTab },
          { id: "drain", label: "Drain", icon: "migrations", content: drainTab },
          { id: "capacity", label: "Capacity", icon: "cpu", content: capacityTab },
          { id: "configuration", label: "Configuration", icon: "settings", content: configTab },
          { id: "logs", label: "Logs", icon: "audit", content: logsTab },
          { id: "events", label: "Events", icon: "activity", content: eventsTab },
        ]}
      />
    </>
  );
}
