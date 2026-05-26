import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { formatPublicId, prisma, audit, FEATURE_KEYS, LIMIT_KEYS, uuidFromPublicId } from "swyftstack-shared";
import {
  Badge, bytes, Panel, KeyValue, Table, StatCard, Breadcrumbs, EmptyState,
  timeAgo, MiniStat,
} from "@/components/ui";
import { Tabs, ConfirmButton } from "@/components/client";
import { aggregateForOrg, monthStart, vcpuHours } from "@/lib/stats";

export const dynamic = "force-dynamic";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
const orgHref = (id: string) => `/organizations/${formatPublicId("organization", id)}`;
const projectHref = (id: string) => `/projects/${formatPublicId("project", id)}`;
const userHref = (id: string) => `/users/${formatPublicId("user", id)}`;

async function setStatus(formData: FormData, status: "active" | "suspended") {
  const id = uuidFromPublicId(str(formData, "id"), "organization");
  await prisma.organization.update({ where: { id }, data: { status } });
  await audit({ actorType: "admin", action: `organization.${status}`, targetType: "organization", targetId: id });
  revalidatePath(orgHref(id));
}
async function suspendOrg(fd: FormData) { "use server"; await setStatus(fd, "suspended"); }
async function unsuspendOrg(fd: FormData) { "use server"; await setStatus(fd, "active"); }

async function saveLimitOverride(formData: FormData) {
  "use server";
  const id = uuidFromPublicId(str(formData, "id"), "organization");
  const limitKey = str(formData, "limitKey");
  const raw = str(formData, "limitValue");
  if (!limitKey) return;
  await prisma.limitOverride.upsert({
    where: { scopeType_scopeId_limitKey: { scopeType: "organization", scopeId: id, limitKey } },
    update: { limitValue: raw ? BigInt(raw) : null, reason: str(formData, "reason") || null },
    create: { scopeType: "organization", scopeId: id, limitKey, limitValue: raw ? BigInt(raw) : null, reason: str(formData, "reason") || null },
  });
  await audit({ actorType: "admin", action: "organization.limit_override", targetType: "organization", targetId: id });
  revalidatePath(orgHref(id));
}
async function deleteLimitOverride(formData: FormData) {
  "use server";
  const id = uuidFromPublicId(str(formData, "id"), "organization");
  await prisma.limitOverride.delete({ where: { id: str(formData, "overrideId") } }).catch(() => undefined);
  revalidatePath(orgHref(id));
}
async function saveFeatureOverride(formData: FormData) {
  "use server";
  const id = uuidFromPublicId(str(formData, "id"), "organization");
  const featureKey = str(formData, "featureKey");
  if (!featureKey) return;
  await prisma.featureOverride.upsert({
    where: { scopeType_scopeId_featureKey: { scopeType: "organization", scopeId: id, featureKey } },
    update: { enabled: formData.get("enabled") === "on", reason: str(formData, "reason") || null },
    create: { scopeType: "organization", scopeId: id, featureKey, enabled: formData.get("enabled") === "on", reason: str(formData, "reason") || null },
  });
  await audit({ actorType: "admin", action: "organization.feature_override", targetType: "organization", targetId: id });
  revalidatePath(orgHref(id));
}
async function deleteFeatureOverride(formData: FormData) {
  "use server";
  const id = uuidFromPublicId(str(formData, "id"), "organization");
  await prisma.featureOverride.delete({ where: { id: str(formData, "overrideId") } }).catch(() => undefined);
  revalidatePath(orgHref(id));
}

export default async function OrgDetailPage({ params }: { params: { id: string } }) {
  const organizationId = uuidFromPublicId(params.id, "organization");
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      owner: true,
      members: { include: { user: true } },
      projects: {
        include: { _count: { select: { apps: true, databases: true, buckets: true } } },
        orderBy: { createdAt: "desc" },
      },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: { include: { limits: true } } } },
    },
  });
  if (!org) notFound();
  const orgPublicId = formatPublicId("organization", org.id);

  const projectIds = org.projects.map((p) => p.id);
  const [agg, activity, auditLogs, limitOverrides, featureOverrides] = await Promise.all([
    aggregateForOrg(org.id, monthStart()),
    prisma.projectActivityLog.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.auditLog.findMany({
      where: { targetType: "organization", targetId: org.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.limitOverride.findMany({ where: { scopeType: "organization", scopeId: org.id } }),
    prisma.featureOverride.findMany({ where: { scopeType: "organization", scopeId: org.id } }),
  ]);

  const sub = org.subscriptions[0];

  const overviewTab = (
    <div className="split-even">
      <Panel title="Organization">
        <KeyValue
          rows={[
            ["Name", org.name],
            ["Owner", org.owner ? <Link key="o" href={userHref(org.owner.id)}>{org.owner.email}</Link> : "—"],
            ["Status", <Badge key="s" status={org.status} />],
            ["App deployment", <Badge key="ad" status={org.enableAppDeployment ? "active" : "disabled"} />],
            ["Members", org.members.length],
            ["Projects", org.projects.length],
            ["Created", org.createdAt.toISOString().slice(0, 16).replace("T", " ")],
          ]}
        />
      </Panel>
      <Panel title="Plan & subscription">
        <KeyValue
          rows={[
            ["Plan", sub?.plan.name ?? "none"],
            ["Status", sub ? <Badge key="s" status={sub.status} /> : "—"],
            ["Billing phase", sub?.billingPhase ?? "—"],
            ["Trial ends", timeAgo(sub?.trialEndAt)],
            ["Period end", sub?.currentPeriodEnd ? sub.currentPeriodEnd.toISOString().slice(0, 10) : "—"],
          ]}
        />
      </Panel>
    </div>
  );

  const membersTab = (
    <Panel title={`Members & roles (${org.members.length})`} flush>
      <Table
        columns={["Member", "Email", "Role", ""]}
        rows={org.members.map((m) => [
          m.user.name ?? "—", m.user.email,
          <Badge key="r" status="muted" />,
            <Link key="l" className="btn sm secondary" href={userHref(m.userId)}>Open user</Link>,
        ])}
      />
    </Panel>
  );

  const projectsTab = (
    <Panel title={`Projects (${org.projects.length})`} flush>
      {org.projects.length === 0 ? (
        <EmptyState icon="projects" title="No projects in this organization" />
      ) : (
        <Table
          columns={["Project", "Status", "Apps", "DBs", "Buckets", ""]}
          rows={org.projects.map((p) => [
            <Link key="n" href={projectHref(p.id)}>{p.name}</Link>,
            <Badge key="s" status={p.status} />,
            p._count.apps, p._count.databases, p._count.buckets,
            <Link key="l" className="btn sm secondary" href={projectHref(p.id)}>Open</Link>,
          ])}
        />
      )}
    </Panel>
  );

  const usageTab = (
    <>
      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="cpu" tone="violet" label="vCPU-hours" value={vcpuHours(agg.vcpuSeconds)} />
        <StatCard icon="rocket" tone="blue" label="Build vCPU-hours" value={vcpuHours(agg.buildVcpuSeconds)} />
        <StatCard icon="arrowDown" tone="green" label="Bandwidth in" value={bytes(agg.bandwidthInBytes)} />
        <StatCard icon="arrowUp" tone="amber" label="Bandwidth out" value={bytes(agg.bandwidthOutBytes)} />
        <StatCard icon="database" tone="blue" label="DB storage" value={bytes(agg.dbStorageBytes)} />
        <StatCard icon="storage" tone="violet" label="Object storage" value={bytes(agg.objectStorageBytes)} />
        <StatCard icon="globe" tone="rose" label="Egress used" value={bytes(agg.egressUsedBytes)} />
      </div>
      <Panel title="Resource counts">
        <div className="grid compact">
          <MiniStat k="Projects" v={agg.projects} />
          <MiniStat k="Apps" v={agg.apps} />
          <MiniStat k="Databases" v={agg.databases} />
          <MiniStat k="Buckets" v={agg.buckets} />
          <MiniStat k="Backups" v={agg.backups} />
        </div>
      </Panel>
      {sub?.plan.limits && (
        <Panel title="Plan limits">
          <KeyValue
            rows={[
              ["Max projects", sub.plan.limits.maxProjects ?? "∞"],
              ["Max databases", sub.plan.limits.maxDatabases ?? "∞"],
              ["DB storage", sub.plan.limits.maxDatabaseStorageBytes ? bytes(sub.plan.limits.maxDatabaseStorageBytes) : "∞"],
              ["Object storage", sub.plan.limits.maxObjectStorageBytes ? bytes(sub.plan.limits.maxObjectStorageBytes) : "∞"],
              ["Egress", sub.plan.limits.maxEgressBytes ? bytes(sub.plan.limits.maxEgressBytes) : "∞"],
            ]}
          />
        </Panel>
      )}
    </>
  );

  const activityTab = (
    <>
      <Panel title="Project activity" flush>
        {activity.length === 0 ? (
          <EmptyState icon="activity" title="No project activity" />
        ) : (
          <Table
            columns={["Time", "Action", "Detail"]}
            rows={activity.map((a) => [
              a.createdAt.toISOString().slice(0, 19).replace("T", " "),
              a.action,
              <span key="d" className="small">{JSON.stringify(a.metadata)}</span>,
            ])}
          />
        )}
      </Panel>
      <Panel title="Audit log" flush>
        <Table
          columns={["Time", "Action", "Actor"]}
          rows={auditLogs.map((a) => [
            a.createdAt.toISOString().slice(0, 19).replace("T", " "), a.action, a.actorType,
          ])}
        />
      </Panel>
    </>
  );

  const overridesTab = (
    <div className="split">
      <div>
        <Panel title={`Limit overrides (${limitOverrides.length})`} flush>
          <Table
            columns={["Limit", "Value", ""]}
            rows={limitOverrides.map((o) => [
              o.limitKey,
              o.limitValue == null ? "unlimited" : String(o.limitValue),
              <form key="d" action={deleteLimitOverride}>
                <input type="hidden" name="id" value={orgPublicId} />
                <input type="hidden" name="overrideId" value={o.id} />
                <ConfirmButton message="Remove override?" className="btn sm danger">Remove</ConfirmButton>
              </form>,
            ])}
          />
        </Panel>
        <Panel title={`Feature overrides (${featureOverrides.length})`} flush>
          <Table
            columns={["Feature", "Enabled", ""]}
            rows={featureOverrides.map((o) => [
              o.featureKey,
              <Badge key="e" status={o.enabled ? "active" : "disabled"} />,
              <form key="d" action={deleteFeatureOverride}>
                <input type="hidden" name="id" value={orgPublicId} />
                <input type="hidden" name="overrideId" value={o.id} />
                <ConfirmButton message="Remove override?" className="btn sm danger">Remove</ConfirmButton>
              </form>,
            ])}
          />
        </Panel>
      </div>
      <div>
        <Panel title="Add limit override">
          <form action={saveLimitOverride}>
            <input type="hidden" name="id" value={orgPublicId} />
            <label>Limit key</label>
            <select name="limitKey">{LIMIT_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
            <label>Value (blank = unlimited)</label>
            <input name="limitValue" />
            <label>Reason</label>
            <input name="reason" />
            <div style={{ marginTop: 12 }}><button className="btn" type="submit">Save</button></div>
          </form>
        </Panel>
        <Panel title="Add feature override">
          <form action={saveFeatureOverride}>
            <input type="hidden" name="id" value={orgPublicId} />
            <label>Feature key</label>
            <select name="featureKey">{FEATURE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
            <label className="check" style={{ marginTop: 10 }}>
              <input type="checkbox" name="enabled" defaultChecked /> Enabled
            </label>
            <label>Reason</label>
            <input name="reason" />
            <div style={{ marginTop: 12 }}><button className="btn" type="submit">Save</button></div>
          </form>
        </Panel>
      </div>
    </div>
  );

  return (
    <>
      <Breadcrumbs items={[{ label: "Organizations", href: "/organizations" }, { label: org.name }]} />
      <div className="actionbar">
        <div>
          <h1 className="h1">{org.name}</h1>
          <p className="sub">Owner {org.owner?.email ?? "—"} · <Badge status={org.status} /> · {sub?.plan.name ?? "no plan"}</p>
        </div>
        <div className="row">
          {org.status === "suspended" ? (
            <form action={unsuspendOrg}><input type="hidden" name="id" value={orgPublicId} /><button className="btn secondary">Unsuspend</button></form>
          ) : (
            <form action={suspendOrg}>
              <input type="hidden" name="id" value={orgPublicId} />
              <ConfirmButton message={`Suspend ${org.name}? All projects stop scheduling.`} className="btn danger">Suspend</ConfirmButton>
            </form>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "overview", label: "Overview", icon: "org", content: overviewTab },
          { id: "members", label: "Members", icon: "users", content: membersTab },
          { id: "projects", label: "Projects", icon: "projects", content: projectsTab },
          { id: "usage", label: "Usage", icon: "usage", content: usageTab },
          { id: "activity", label: "Activity & audit", icon: "activity", content: activityTab },
          { id: "overrides", label: "Overrides", icon: "settings", content: overridesTab },
        ]}
      />
    </>
  );
}
