import Link from "next/link";
import { prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Panel, MetricRow, StatCard, bytes } from "@/components/ui";
import { orgHasAppDeployment } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const user = await requireUser();

  const org = await prisma.organization.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      members: true,
      subscriptions: {
        where: { status: { in: ["active", "trialing", "past_due"] } }, orderBy: { createdAt: "desc" }, take: 1,
        include: { plan: { include: { limits: true } } },
      },
    },
  });

  if (!org) {
    return (
      <UserShell user={user}>
        <h1 className="h1">Usage &amp; Billing</h1>
        <div className="note">No organization found. <Link href="/pricing">Choose a plan</Link> to begin.</div>
      </UserShell>
    );
  }

  const subscription = org.subscriptions[0] ?? null;
  const plan = subscription?.plan ?? null;
  const limits = plan?.limits ?? null;
  const appDeploymentEnabled = await orgHasAppDeployment(org.id);

  const projects = await prisma.project.findMany({
    where: { organizationId: org.id }, select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  const [databases, buckets, domains, rollups] = await Promise.all([
    prisma.database.findMany({ where: { projectId: { in: projectIds } } }),
    prisma.storageBucket.findMany({ where: { projectId: { in: projectIds } } }),
    prisma.domain.count({ where: { projectId: { in: projectIds }, type: "custom" } }),
    prisma.usageRollup.findMany({ where: { organizationId: org.id } }),
  ]);

  const rollup = (t: string) => rollups.filter((r) => r.usageType === t).reduce((s, r) => s + r.quantity, 0n);
  const dbBytes = databases.reduce((s, d) => s + d.currentSizeBytes, 0n);
  const objBytes = buckets.reduce((s, b) => s + b.currentStorageBytes, 0n);
  const egressBytes = buckets.reduce((s, b) => s + b.currentEgressBytes, 0n) + rollup("app_egress_bytes");

  const pct = (used: number, limit: number | null) => (limit && limit > 0 ? (used / limit) * 100 : 0);
  const num = (v: bigint | number | null | undefined) => (v == null ? null : Number(v));

  const vcpuUsed = Number(rollup("app_runtime_vcpu_seconds")) / 3600;
  const vcpuLimit = limits?.maxVcpuSeconds ? Number(limits.maxVcpuSeconds) / 3600 : null;
  const buildUsed = Number(rollup("build_vcpu_seconds")) / 3600;
  const buildLimit = limits?.maxBuildVcpuSeconds ? Number(limits.maxBuildVcpuSeconds) / 3600 : null;

  const periodEnd = subscription?.currentPeriodEnd
    ? subscription.currentPeriodEnd.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <UserShell user={user} organizationName={org.name}>
      <div className="page-head">
        <div>
          <h1 className="h1">Usage &amp; Billing</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Track consumption against your plan limits.</p>
        </div>
        <Link className="btn secondary" href="/pricing?next=/usage">Change plan</Link>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <StatCard icon="plans" tone="violet" label="Current plan" value={plan?.name ?? "No plan"}
          foot={plan ? `$${(plan.priceCents / 100).toFixed(0)} / month` : "Choose a plan"} />
        <StatCard icon="revenue" tone="green" label="Billing status"
          value={subscription?.status ?? "inactive"} foot={`Renews ${periodEnd}`} />
        <StatCard icon="users" tone="blue" label="Team members" value={org.members.length}
          foot={`${limits?.maxTeamMembers ?? "∞"} included`} />
      </div>

      <Panel title="Plan usage this period">
        {!limits && <p className="small">No plan limits configured.</p>}
        {limits && (
          <>
            {appDeploymentEnabled && (
              <>
                <MetricRow name="App runtime — vCPU hours"
                  value={`${vcpuUsed.toFixed(0)} / ${vcpuLimit?.toFixed(0) ?? "∞"}`}
                  percent={pct(vcpuUsed, vcpuLimit)} />
                <MetricRow name="Build — vCPU hours"
                  value={`${buildUsed.toFixed(0)} / ${buildLimit?.toFixed(0) ?? "∞"}`}
                  percent={pct(buildUsed, buildLimit)} />
              </>
            )}
            <MetricRow name="Database storage"
              value={`${bytes(dbBytes)} / ${limits.maxDatabaseStorageBytes ? bytes(limits.maxDatabaseStorageBytes) : "∞"}`}
              percent={pct(Number(dbBytes), num(limits.maxDatabaseStorageBytes))} />
            <MetricRow name="Object storage"
              value={`${bytes(objBytes)} / ${limits.maxObjectStorageBytes ? bytes(limits.maxObjectStorageBytes) : "∞"}`}
              percent={pct(Number(objBytes), num(limits.maxObjectStorageBytes))} />
            <MetricRow name="Egress bandwidth"
              value={`${bytes(egressBytes)} / ${limits.maxEgressBytes ? bytes(limits.maxEgressBytes) : "∞"}`}
              percent={pct(Number(egressBytes), num(limits.maxEgressBytes))} />
          </>
        )}
      </Panel>

      <Panel title="Resource counts">
        <MetricRow name="Projects" value={`${projects.length} / ${limits?.maxProjects ?? "∞"}`}
          percent={pct(projects.length, num(limits?.maxProjects))} />
        <MetricRow name="Databases" value={`${databases.length} / ${limits?.maxDatabases ?? "∞"}`}
          percent={pct(databases.length, num(limits?.maxDatabases))} />
        <MetricRow name="Storage buckets" value={`${buckets.length} / ${limits?.maxStorageBuckets ?? "∞"}`}
          percent={pct(buckets.length, num(limits?.maxStorageBuckets))} />
        <MetricRow name="Custom domains" value={`${domains} / ${limits?.maxCustomDomains ?? "∞"}`}
          percent={pct(domains, num(limits?.maxCustomDomains))} />
        <MetricRow name="Team members" value={`${org.members.length} / ${limits?.maxTeamMembers ?? "∞"}`}
          percent={pct(org.members.length, num(limits?.maxTeamMembers))} />
      </Panel>
    </UserShell>
  );
}
