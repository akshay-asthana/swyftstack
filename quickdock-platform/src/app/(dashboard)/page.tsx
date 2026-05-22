import Link from "next/link";
import { prisma } from "quickdock-shared";
import {
  StatCard, Panel, AreaChart, Donut, MetricRow, FeedItem, HealthRow, bytes, timeAgo,
} from "@/components/ui";
import { type IconName } from "@/components/icons";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

function activityIcon(action: string): { icon: IconName; tone: "violet" | "blue" | "green" | "amber" | "rose" } {
  if (action.startsWith("node")) return { icon: "nodes", tone: "blue" };
  if (action.startsWith("database") || action.startsWith("backup")) return { icon: "database", tone: "violet" };
  if (action.startsWith("deployment") || action.startsWith("app")) return { icon: "rocket", tone: "green" };
  if (action.startsWith("user") || action.startsWith("org")) return { icon: "users", tone: "amber" };
  if (action.startsWith("migration")) return { icon: "migrations", tone: "blue" };
  return { icon: "activity", tone: "violet" };
}

function prettyAction(action: string): string {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function Overview() {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * DAY);
  const dayAgo = new Date(now - DAY);

  const [
    users, newUsers, projects, newProjects, runningApps, newApps,
    nodes, subs, recentAudit, queuedJobs, failedJobs, latestBackup,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.project.count({ where: { status: "active" } }),
    prisma.project.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.app.count({ where: { status: "running" } }),
    prisma.app.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.node.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.subscription.findMany({ where: { status: "active" }, include: { plan: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.job.count({ where: { status: { in: ["queued", "running", "retrying"] } } }),
    prisma.job.count({ where: { status: "failed", updatedAt: { gte: dayAgo } } }),
    prisma.databaseBackup.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  // Aggregate the 7-day node-CPU series in a single query rather than
  // loading every metric row into the request.
  const metricRows = await prisma.$queryRaw<{ day: Date; avg_cpu: number | null }[]>`
    SELECT date_trunc('day', collected_at) AS day,
           avg(cpu_usage_percent)::float8 AS avg_cpu
    FROM node_metrics
    WHERE collected_at >= now() - interval '7 days'
    GROUP BY 1 ORDER BY 1
  `;

  // ---- node capacity / status ----
  const online = nodes.filter((n) => n.status === "active").length;
  const warning = nodes.filter((n) => ["degraded", "draining", "provisioning"].includes(n.status)).length;
  const offline = nodes.filter((n) => ["offline", "disabled"].includes(n.status)).length;
  const totalCpu = nodes.reduce((s, n) => s + Number(n.cpuCores), 0);
  const reservedCpu = nodes.reduce((s, n) => s + Number(n.reservedCpu), 0);
  const totalRam = nodes.reduce((s, n) => s + n.ramBytes, 0n);
  const reservedRam = nodes.reduce((s, n) => s + n.reservedRamBytes, 0n);
  const totalDisk = nodes.reduce((s, n) => s + n.diskBytes, 0n);
  const reservedDisk = nodes.reduce((s, n) => s + n.reservedDiskBytes, 0n);

  // ---- MRR ----
  const mrrCents = subs.reduce((s, x) => s + x.plan.priceCents, 0);
  const mrr = mrrCents >= 100_000
    ? `$${(mrrCents / 100_000).toFixed(2)}K`
    : `$${(mrrCents / 100).toFixed(0)}`;

  // ---- 7-day CPU series from aggregated node metrics ----
  const cpuByDay = new Map<string, number>();
  for (const r of metricRows) {
    cpuByDay.set(new Date(r.day).toISOString().slice(0, 10), Math.round(Number(r.avg_cpu ?? 0)));
  }
  const series: number[] = [];
  const labels: string[] = [];
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now - d * DAY);
    series.push(cpuByDay.get(day.toISOString().slice(0, 10)) ?? 0);
    labels.push(day.toLocaleDateString("en", { month: "short", day: "numeric" }));
  }
  const hasMetrics = metricRows.length > 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Overview</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Real-time overview of your infrastructure.</p>
        </div>
        <span className="pill">Last 7 days</span>
      </div>

      <div className="grid cols-5" style={{ marginBottom: 16 }}>
        <StatCard icon="users" tone="violet" label="Total Users" value={users.toLocaleString()}
          delta={`+${newUsers}`} deltaUp deltaNote=" in last 7 days" />
        <StatCard icon="projects" tone="blue" label="Active Projects" value={projects.toLocaleString()}
          delta={`+${newProjects}`} deltaUp deltaNote=" in last 7 days" />
        <StatCard icon="rocket" tone="green" label="Running Apps" value={runningApps.toLocaleString()}
          delta={`+${newApps}`} deltaUp deltaNote=" in last 7 days" />
        <StatCard icon="cpu" tone="amber" label="vCPU Provisioned" value={totalCpu.toLocaleString()} unit=" vCPU"
          delta={`${reservedCpu.toFixed(1)}`} deltaUp deltaNote=" reserved" />
        <StatCard icon="revenue" tone="rose" label="Revenue (MRR)" value={mrr}
          delta={`${subs.length}`} deltaUp deltaNote=" active plans" />
      </div>

      <div className="split">
        <Panel
          title="Average node CPU"
          action={<span className="small">{hasMetrics ? "From node metric probes" : "Awaiting first probe"}</span>}
        >
          <AreaChart points={series} labels={labels} />
          {!hasMetrics && (
            <p className="small" style={{ marginTop: 6 }}>
              No node metrics collected yet — start the worker (<code>npm run dev:worker</code>) to populate this chart.
            </p>
          )}
        </Panel>

        <Panel title="Node capacity utilisation">
          <MetricRow icon="cpu" name="vCPU reserved"
            value={`${reservedCpu.toFixed(1)} / ${totalCpu}`}
            percent={totalCpu ? (reservedCpu / totalCpu) * 100 : 0} />
          <MetricRow icon="nodes" name="Memory reserved"
            value={`${bytes(reservedRam)} / ${bytes(totalRam)}`}
            percent={totalRam ? (Number(reservedRam) / Number(totalRam)) * 100 : 0} />
          <MetricRow icon="storage" name="Disk reserved"
            value={`${bytes(reservedDisk)} / ${bytes(totalDisk)}`}
            percent={totalDisk ? (Number(reservedDisk) / Number(totalDisk)) * 100 : 0} />
          <MetricRow icon="apps" name="Apps running"
            value={`${runningApps}`}
            percent={runningApps ? 100 : 0} />
        </Panel>
      </div>

      <div className="split">
        <Panel title="Recent activity" action={<Link className="small" href="/audit-logs">View all →</Link>}>
          <div className="feed">
            {recentAudit.length === 0 && <p className="small">No activity recorded yet.</p>}
            {recentAudit.map((a) => {
              const m = activityIcon(a.action);
              return (
                <FeedItem key={a.id} icon={m.icon} tone={m.tone}
                  title={prettyAction(a.action)}
                  sub={`${a.actorType}${a.targetType ? ` · ${a.targetType}` : ""}`}
                  time={timeAgo(a.createdAt)} />
              );
            })}
          </div>
        </Panel>

        <div>
          <Panel title="Node status">
            <Donut
              segments={[
                { value: online, color: "#16a34a", label: "Online" },
                { value: warning, color: "#d98e04", label: "Warning" },
                { value: offline, color: "#dc2626", label: "Offline" },
              ]}
              total={nodes.length}
              caption="Nodes"
            />
          </Panel>
          <Panel title="System health">
            <HealthRow label="Control-plane database" value="Connected" tone="ok" />
            <HealthRow label="Job queue" value={`${queuedJobs} pending`} tone={queuedJobs > 25 ? "warn" : "ok"} />
            <HealthRow label="Failed jobs (24h)" value={`${failedJobs}`} tone={failedJobs > 0 ? "bad" : "ok"} />
            <HealthRow label="Latest DB backup" value={latestBackup?.status ?? "none"}
              tone={latestBackup?.status === "verified" ? "ok" : latestBackup ? "warn" : "warn"} />
          </Panel>
        </div>
      </div>
    </>
  );
}
