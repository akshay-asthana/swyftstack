// Infrastructure → Overview. The operational hub: fleet capacity + usage +
// reservations, health, bandwidth, top-N nodes/projects/users and incidents.
import {
  prisma, BANDWIDTH_IN_TYPES, BANDWIDTH_OUT_TYPES,
} from "swyftstack-shared";
import {
  Badge, bytes, Panel, StatCard, Table, BarChart, AreaChart, LineChart, EmptyState, timeAgo,
} from "@/components/ui";
import { monthStart } from "@/lib/stats";

const BW_TYPES = [...BANDWIDTH_IN_TYPES, ...BANDWIDTH_OUT_TYPES];

async function topNames(
  ids: string[],
  table: "app" | "user" | "project",
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  if (table === "app") {
    const r = await prisma.app.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return new Map(r.map((x) => [x.id, x.name]));
  }
  if (table === "user") {
    const r = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
    return new Map(r.map((x) => [x.id, x.name ?? x.email]));
  }
  const r = await prisma.project.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(r.map((x) => [x.id, x.name]));
}

export async function OverviewSection() {
  const since = monthStart();

  const [
    nodes, runningApps, failedApps, databases, buckets, backups, failedJobs,
    objectProviders, backupProviders, clusters,
    recentIncidents, platformRollups, bwByUser, bwByProject, cpuByApp, topDbs, bwAgg,
  ] = await Promise.all([
    prisma.node.findMany({
      include: { metrics: { orderBy: { collectedAt: "desc" }, take: 1 }, _count: { select: { apps: true, databases: true } } },
    }),
    prisma.app.count({ where: { status: "running" } }),
    prisma.app.count({ where: { status: "failed" } }),
    prisma.database.count({ where: { status: { not: "deleted" } } }),
    prisma.storageBucket.count({ where: { status: { not: "deleted" } } }),
    prisma.databaseBackup.count(),
    prisma.job.count({ where: { status: "failed" } }),
    prisma.objectStorageProvider.count({ where: { status: "active" } }),
    prisma.backupStorageProvider.count({ where: { status: "active" } }),
    prisma.databaseCluster.count({ where: { status: "active" } }),
    prisma.auditLog.findMany({
      where: {
        action: {
          in: ["node.offline", "node.degraded", "node.discovery_failed", "node.duplicate_archived", "database.import_failed", "usage.limit_reached", "usage.over_limit"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.metricRollup.findMany({
      where: {
        scopeType: "platform", period: "daily",
        metricType: { in: ["cpu_usage_percent", "ram_used_bytes", "disk_used_bytes", "network_in_bytes", "network_out_bytes"] },
      },
      orderBy: { bucketStart: "asc" },
      take: 70,
    }),
    prisma.usageEvent.groupBy({
      by: ["userId"],
      where: { recordedAt: { gte: since }, usageType: { in: BW_TYPES }, userId: { not: null } },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.groupBy({
      by: ["projectId"],
      where: { recordedAt: { gte: since }, usageType: { in: BW_TYPES }, projectId: { not: null } },
      _sum: { quantity: true },
    }),
    prisma.usageEvent.groupBy({
      by: ["appId"],
      where: { recordedAt: { gte: since }, usageType: "app_runtime_vcpu_seconds", appId: { not: null } },
      _sum: { quantity: true },
    }),
    prisma.database.findMany({
      where: { status: { not: "deleted" } },
      orderBy: { currentSizeBytes: "desc" },
      take: 8,
      select: { id: true, name: true, currentSizeBytes: true },
    }),
    prisma.usageEvent.groupBy({
      by: ["usageType"],
      where: { recordedAt: { gte: since }, usageType: { in: BW_TYPES } },
      _sum: { quantity: true },
    }),
  ]);

  // Node aggregates — scheduling nodes only (exclude archived).
  const live = nodes.filter((n) => n.status !== "archived");
  const online = live.filter((n) => n.status === "active").length;
  const degraded = live.filter((n) => ["degraded", "draining"].includes(n.status)).length;
  const offline = live.filter((n) => ["offline", "disabled", "provisioning"].includes(n.status)).length;
  const totalCpu = live.reduce((s, n) => s + Number(n.cpuCores), 0);
  const totalRam = live.reduce((s, n) => s + Number(n.ramBytes), 0);
  const totalDisk = live.reduce((s, n) => s + Number(n.diskBytes), 0);
  const reservedCpu = live.reduce((s, n) => s + Number(n.reservedCpu), 0);
  const reservedRam = live.reduce((s, n) => s + Number(n.reservedRamBytes), 0);
  const reservedDisk = live.reduce((s, n) => s + Number(n.reservedDiskBytes), 0);
  const usedRam = live.reduce((s, n) => s + Number(n.metrics[0]?.ramUsedBytes ?? 0), 0);
  const usedDisk = live.reduce((s, n) => s + Number(n.metrics[0]?.diskUsedBytes ?? 0), 0);
  const usedCpuPct =
    live.length > 0
      ? live.reduce((s, n) => s + Number(n.metrics[0]?.cpuUsagePercent ?? 0), 0) / live.length
      : 0;

  // Platform bandwidth (this month) from usage events.
  const bwIn = bwAgg
    .filter((r) => (BANDWIDTH_IN_TYPES as readonly string[]).includes(r.usageType))
    .reduce((s, r) => s + Number(r._sum.quantity ?? 0), 0);
  const bwOut = bwAgg
    .filter((r) => (BANDWIDTH_OUT_TYPES as readonly string[]).includes(r.usageType))
    .reduce((s, r) => s + Number(r._sum.quantity ?? 0), 0);

  const topNodesCpu = [...live]
    .map((n) => ({ name: n.name, value: Number(n.metrics[0]?.cpuUsagePercent ?? 0) }))
    .sort((a, b) => b.value - a.value).slice(0, 6);
  const topNodesRam = [...live]
    .map((n) => ({ name: n.name, value: Number(n.metrics[0]?.ramUsedBytes ?? 0) }))
    .sort((a, b) => b.value - a.value).slice(0, 6);
  const topNodesBw = [...live]
    .map((n) => ({
      name: n.name,
      value: Number(n.metrics[0]?.networkRxBytes ?? 0) + Number(n.metrics[0]?.networkTxBytes ?? 0),
    }))
    .sort((a, b) => b.value - a.value).slice(0, 6);

  const [userNames, projectNames, appNames] = await Promise.all([
    topNames(bwByUser.map((r) => r.userId!).filter(Boolean), "user"),
    topNames(bwByProject.map((r) => r.projectId!).filter(Boolean), "project"),
    topNames(cpuByApp.map((r) => r.appId!).filter(Boolean), "app"),
  ]);

  const topUsersBw = bwByUser
    .map((r) => ({ name: userNames.get(r.userId!) ?? "—", value: Number(r._sum.quantity ?? 0) }))
    .sort((a, b) => b.value - a.value).slice(0, 6);
  const topProjectsBw = bwByProject
    .map((r) => ({ name: projectNames.get(r.projectId!) ?? "—", value: Number(r._sum.quantity ?? 0) }))
    .sort((a, b) => b.value - a.value).slice(0, 6);
  const topAppsCpu = cpuByApp
    .map((r) => ({ name: appNames.get(r.appId!) ?? "—", value: Number(r._sum.quantity ?? 0) / 3600 }))
    .sort((a, b) => b.value - a.value).slice(0, 6);

  const series = (metric: string) => platformRollups.filter((r) => r.metricType === metric);
  const cpuRows = series("cpu_usage_percent");
  const ramRows = series("ram_used_bytes");
  const netInRows = series("network_in_bytes");
  const netOutRows = series("network_out_bytes");
  const dayLabels = cpuRows.map((r) => r.bucketStart.toISOString().slice(5, 10));

  return (
    <>
      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="nodes" tone="violet" label="Nodes" value={live.length}
          deltaNote={`${online} online · ${degraded} warning · ${offline} offline`} />
        <StatCard icon="cpu" tone="blue" label="vCPU used / total"
          value={`${usedCpuPct.toFixed(0)}% / ${totalCpu}`}
          deltaNote={`${reservedCpu.toFixed(0)} reserved`} />
        <StatCard icon="infra" tone="green" label="RAM used / total"
          value={`${bytes(usedRam)} / ${bytes(totalRam)}`}
          deltaNote={`${bytes(reservedRam)} reserved`} />
        <StatCard icon="storage" tone="amber" label="Disk used / total"
          value={`${bytes(usedDisk)} / ${bytes(totalDisk)}`}
          deltaNote={`${bytes(reservedDisk)} reserved`} />
        <StatCard icon="arrowDown" tone="green" label="Network in (mo)" value={bytes(bwIn)} />
        <StatCard icon="arrowUp" tone="violet" label="Network out (mo)" value={bytes(bwOut)} />
      </div>

      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="apps" tone="violet" label="Apps running" value={runningApps} />
        <StatCard icon="database" tone="blue" label="Databases" value={databases} />
        <StatCard icon="database" tone="green" label="DB clusters" value={clusters} />
        <StatCard icon="storage" tone="amber" label="Object storage" value={objectProviders} />
        <StatCard icon="backups" tone="violet" label="Backup providers" value={backupProviders} />
        <StatCard icon="alert" tone="rose" label="Failed jobs / apps" value={failedJobs + failedApps} />
      </div>

      <div className="split-even">
        <Panel title="Aggregate CPU usage % (daily)">
          {cpuRows.length ? <AreaChart points={cpuRows.map((r) => Number(r.avg ?? r.sum))} labels={dayLabels} />
            : <div className="small">No rollups yet — the worker populates these.</div>}
        </Panel>
        <Panel title="Aggregate RAM used (GB, daily)">
          {ramRows.length ? <AreaChart points={ramRows.map((r) => Number(r.avg ?? r.sum) / 1e9)} color="#2563eb" />
            : <div className="small">No rollups yet.</div>}
        </Panel>
        <Panel title="Aggregate bandwidth (MB, daily)">
          {netInRows.length || netOutRows.length ? (
            <LineChart
              series={[
                { name: "Inbound", color: "#16a34a", points: netInRows.map((r) => Number(r.sum) / 1e6) },
                { name: "Outbound", color: "#6d5ef6", points: netOutRows.map((r) => Number(r.sum) / 1e6) },
              ]}
            />
          ) : <div className="small">No bandwidth rollups yet.</div>}
        </Panel>
        <Panel title="Buckets & backups">
          <Table
            columns={["Resource", "Count"]}
            rows={[
              ["Storage buckets", String(buckets)],
              ["Database backups", String(backups)],
              ["Failed apps", String(failedApps)],
            ]}
          />
        </Panel>
      </div>

      <div className="split-even">
        <Panel title="Top nodes by CPU">
          <BarChart items={topNodesCpu} format={(n) => `${n.toFixed(0)}%`} />
        </Panel>
        <Panel title="Top nodes by RAM">
          <BarChart items={topNodesRam} color="#2563eb" format={bytes} />
        </Panel>
        <Panel title="Top nodes by bandwidth">
          <BarChart items={topNodesBw} color="#0ea5e9" format={bytes} />
        </Panel>
        <Panel title="Top users by bandwidth">
          {topUsersBw.length ? <BarChart items={topUsersBw} color="#16a34a" format={bytes} />
            : <div className="small">No metered bandwidth yet.</div>}
        </Panel>
        <Panel title="Top projects by bandwidth">
          {topProjectsBw.length ? <BarChart items={topProjectsBw} color="#d98e04" format={bytes} />
            : <div className="small">No metered bandwidth yet.</div>}
        </Panel>
        <Panel title="Top apps by CPU-hours">
          {topAppsCpu.length ? <BarChart items={topAppsCpu} format={(n) => `${n.toFixed(1)}h`} />
            : <div className="small">No metered CPU yet.</div>}
        </Panel>
      </div>

      <Panel title="Recent infrastructure events" flush>
        {recentIncidents.length === 0 ? (
          <EmptyState icon="check" title="No recent incidents" hint="Node failures and limit breaches show up here." />
        ) : (
          <Table
            columns={["Time", "Event", "Target", "Detail"]}
            rows={recentIncidents.map((e) => [
              timeAgo(e.createdAt),
              <Badge key="b" status="warning" />,
              `${e.targetType ?? "—"}`,
              <span key="d" className="small">{e.action} · {JSON.stringify(e.metadata)}</span>,
            ])}
          />
        )}
      </Panel>
      {topDbs.length > 0 && (
        <Panel title="Largest databases">
          <BarChart items={topDbs.map((d) => ({ name: d.name, value: Number(d.currentSizeBytes) }))}
            color="#5847e8" format={bytes} />
        </Panel>
      )}
    </>
  );
}
