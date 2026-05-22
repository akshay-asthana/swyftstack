import Link from "next/link";
import { prisma } from "quickdock-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import {
  StatCard, Panel, Table, Badge, MetricRow, FeedItem, Ring, bytes, timeAgo,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";

export const dynamic = "force-dynamic";

function actIcon(action: string): { icon: IconName; tone: "violet" | "blue" | "green" | "amber" | "rose" } {
  if (action.includes("deploy") || action.includes("app")) return { icon: "rocket", tone: "green" };
  if (action.includes("database") || action.includes("backup")) return { icon: "database", tone: "violet" };
  if (action.includes("domain")) return { icon: "globe", tone: "blue" };
  if (action.includes("project")) return { icon: "projects", tone: "amber" };
  return { icon: "activity", tone: "violet" };
}

const pretty = (s: string) => s.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default async function Dashboard() {
  const user = await requireUser();

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    include: { project: { include: { organization: true } } },
  });
  const projectIds = memberships.map((m) => m.project.id);

  const ownedOrg = await prisma.organization.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      subscriptions: { where: { status: "active" }, include: { plan: { include: { limits: true } } }, take: 1 },
    },
  });
  const plan = ownedOrg?.subscriptions[0]?.plan ?? null;
  const limits = plan?.limits ?? null;

  const [apps, databases, buckets, activity, rollups] = await Promise.all([
    prisma.app.findMany({
      where: { projectId: { in: projectIds } },
      include: { project: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.database.findMany({ where: { projectId: { in: projectIds } } }),
    prisma.storageBucket.findMany({ where: { projectId: { in: projectIds } } }),
    prisma.projectActivityLog.findMany({
      where: { projectId: { in: projectIds } }, orderBy: { createdAt: "desc" }, take: 6,
    }),
    ownedOrg
      ? prisma.usageRollup.findMany({ where: { organizationId: ownedOrg.id } })
      : Promise.resolve([]),
  ]);

  const activeProjects = memberships.filter((m) => m.project.status === "active").length;
  const runningApps = apps.filter((a) => a.status === "running").length;
  const activeDbs = databases.filter((d) => d.status === "active").length;
  const dbBytes = databases.reduce((s, d) => s + d.currentSizeBytes, 0n);
  const objBytes = buckets.reduce((s, b) => s + b.currentStorageBytes, 0n);
  const egressBytes = buckets.reduce((s, b) => s + b.currentEgressBytes, 0n);
  const storageBytes = dbBytes + objBytes;

  const rollupSum = (type: string) =>
    rollups.filter((r) => r.usageType === type).reduce((s, r) => s + r.quantity, 0n);
  const bandwidthIn =
    rollupSum("node_network_in_bytes") + rollupSum("app_network_in_bytes") +
    rollupSum("storage_network_in_bytes") + rollupSum("database_network_in_bytes");
  const bandwidthOut =
    rollupSum("node_network_out_bytes") + rollupSum("app_network_out_bytes") +
    rollupSum("storage_network_out_bytes") + rollupSum("database_network_out_bytes");
  const vcpuSeconds = rollupSum("app_runtime_vcpu_seconds") + rollupSum("build_vcpu_seconds");
  const vcpuHours = Number(vcpuSeconds) / 3600;
  const vcpuLimit = limits?.maxVcpuSeconds ? Number(limits.maxVcpuSeconds) / 3600 : null;
  const vcpuPct = vcpuLimit ? (vcpuHours / vcpuLimit) * 100 : 0;

  const pct = (used: bigint, limit: bigint | null | undefined) =>
    limit && Number(limit) > 0 ? (Number(used) / Number(limit)) * 100 : 0;

  return (
    <UserShell user={user} workspace={ownedOrg?.name}>
      <div className="page-head">
        <div>
          <h1 className="hello">Welcome back, {user.name?.split(" ")[0] ?? "there"} 👋</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Here&apos;s what&apos;s happening across your projects.</p>
        </div>
        <Link className="btn" href="/projects/new"><Icon name="plus" size={15} /> New Project</Link>
      </div>

      {!plan && (
        <div className="note" style={{ marginBottom: 16 }}>
          You don&apos;t have an active plan yet. <Link href="/pricing?next=/">Choose a plan</Link> to create
          projects and provision resources.
        </div>
      )}

      <div className="grid cols-5" style={{ marginBottom: 16 }}>
        <StatCard icon="projects" tone="violet" label="Projects" value={activeProjects}
          foot={`${memberships.length} total`} />
        <StatCard icon="rocket" tone="green" label="Apps" value={runningApps}
          foot={`${apps.length} deployed`} />
        <StatCard icon="database" tone="blue" label="Databases" value={activeDbs}
          foot={`${databases.length} total`} />
        <StatCard icon="storage" tone="amber" label="Storage" value={bytes(storageBytes)}
          foot={`${buckets.length} buckets`} />
        <div className="statcard">
          <div className="stat-top">
            <div className="stat-icon rose"><Icon name="cpu" size={18} /></div>
            <div className="stat-label">This Month vCPU</div>
          </div>
          <div className="ring-card">
            <Ring percent={vcpuPct} />
            <div className="ring-meta">
              <div className="stat-value" style={{ fontSize: 18 }}>{vcpuHours.toFixed(0)}<small> vCPU-h</small></div>
              <div className="stat-foot">of {vcpuLimit ? vcpuLimit.toFixed(0) : "∞"} included</div>
            </div>
          </div>
        </div>
      </div>

      <div className="split">
        <Panel title="Usage overview" action={<Link className="small" href="/usage">Details →</Link>}>
          <MetricRow name="vCPU hours" value={`${vcpuHours.toFixed(0)} / ${vcpuLimit ? vcpuLimit.toFixed(0) : "∞"}`} percent={vcpuPct} />
          <MetricRow name="Database storage" value={`${bytes(dbBytes)} / ${limits?.maxDatabaseStorageBytes ? bytes(limits.maxDatabaseStorageBytes) : "∞"}`} percent={pct(dbBytes, limits?.maxDatabaseStorageBytes)} />
          <MetricRow name="Object storage" value={`${bytes(objBytes)} / ${limits?.maxObjectStorageBytes ? bytes(limits.maxObjectStorageBytes) : "∞"}`} percent={pct(objBytes, limits?.maxObjectStorageBytes)} />
          <MetricRow name="Egress bandwidth" value={`${bytes(egressBytes)} / ${limits?.maxEgressBytes ? bytes(limits.maxEgressBytes) : "∞"}`} percent={pct(egressBytes, limits?.maxEgressBytes)} />
          <MetricRow name="Bandwidth in (this month)" value={bytes(bandwidthIn)} percent={0} />
          <MetricRow name="Bandwidth out (this month)" value={bytes(bandwidthOut)} percent={0} />
        </Panel>

        <Panel title="Recent activity">
          <div className="feed">
            {activity.length === 0 && <p className="small" style={{ margin: 0 }}>No activity yet.</p>}
            {activity.map((a) => {
              const m = actIcon(a.action);
              return (
                <FeedItem key={a.id} icon={m.icon} tone={m.tone}
                  title={pretty(a.action)} time={timeAgo(a.createdAt)} />
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Your apps" flush action={<Link className="small" href="/projects">All projects →</Link>}>
        <Table
          columns={["Name", "Type", "Status", "Project", "Domain", "Updated"]}
          empty="No apps yet — open a project to deploy your first app."
          rows={apps.slice(0, 8).map((a) => [
            <strong key="n">{a.name}</strong>,
            a.type,
            <Badge key="s" status={a.status} />,
            a.project.name,
            a.defaultDomain ?? "—",
            timeAgo(a.updatedAt),
          ])}
        />
      </Panel>
    </UserShell>
  );
}
