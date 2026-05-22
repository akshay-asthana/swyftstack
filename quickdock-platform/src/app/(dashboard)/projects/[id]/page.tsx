import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, enqueueJob, audit } from "quickdock-shared";
import {
  Badge, bytes, Panel, KeyValue, Table, StatCard, Breadcrumbs, EmptyState,
  ProgressBar, timeAgo, MiniStat,
} from "@/components/ui";
import { Tabs, ConfirmButton } from "@/components/client";
import { aggregateForProjects, monthStart, vcpuHours } from "@/lib/stats";

export const dynamic = "force-dynamic";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

async function suspendProject(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  await enqueueJob("suspend_project", { projectId: id });
  await audit({ actorType: "admin", action: "project.suspend_requested", targetType: "project", targetId: id });
  revalidatePath(`/projects/${id}`);
}
async function unsuspendProject(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  await prisma.project.update({ where: { id }, data: { status: "active" } });
  await audit({ actorType: "admin", action: "project.unsuspended", targetType: "project", targetId: id });
  revalidatePath(`/projects/${id}`);
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      organization: {
        include: {
          owner: true,
          subscriptions: { orderBy: { createdAt: "desc" }, take: 1, include: { plan: { include: { limits: true } } } },
        },
      },
      members: { include: { user: true } },
      apps: {
        include: {
          node: { select: { name: true } },
          envVars: { select: { key: true } },
          deployments: { orderBy: { createdAt: "desc" }, take: 3, include: { buildMetric: true } },
        },
      },
      databases: { include: { backups: { orderBy: { createdAt: "desc" }, take: 1 } } },
      buckets: true,
      domains: true,
      migrations: { orderBy: { createdAt: "desc" }, take: 10 },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });
  if (!project) notFound();

  const [agg, auditLogs, deployments, backups] = await Promise.all([
    aggregateForProjects([project.id], monthStart()),
    prisma.auditLog.findMany({ where: { targetType: "project", targetId: project.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.deployment.findMany({
      where: { app: { projectId: project.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { app: { select: { name: true } }, buildMetric: true },
    }),
    prisma.databaseBackup.findMany({
      where: { database: { projectId: project.id } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { database: { select: { name: true } } },
    }),
  ]);

  const sub = project.organization.subscriptions[0];
  const limits = sub?.plan.limits;

  const overviewTab = (
    <div className="split-even">
      <Panel title="Project">
        <KeyValue
          rows={[
            ["Name", project.name],
            ["Slug", project.slug],
            ["Organization", <Link key="o" href={`/organizations/${project.organizationId}`}>{project.organization.name}</Link>],
            ["Owner", project.organization.owner?.email ?? "—"],
            ["Status", <Badge key="s" status={project.status} />],
            ["Region", project.region ?? "—"],
            ["Created", project.createdAt.toISOString().slice(0, 16).replace("T", " ")],
          ]}
        />
      </Panel>
      <Panel title="Plan & limit status">
        {limits ? (
          <>
            <ProgressBar used={agg.databases} limit={limits.maxDatabases} label="Databases" />
            <ProgressBar used={agg.dbStorageBytes} limit={limits.maxDatabaseStorageBytes ? Number(limits.maxDatabaseStorageBytes) : null} label="DB storage" format={bytes} />
            <ProgressBar used={agg.objectStorageBytes} limit={limits.maxObjectStorageBytes ? Number(limits.maxObjectStorageBytes) : null} label="Object storage" format={bytes} />
            <ProgressBar used={agg.egressUsedBytes} limit={limits.maxEgressBytes ? Number(limits.maxEgressBytes) : null} label="Egress" format={bytes} />
            <ProgressBar used={agg.vcpuSeconds} limit={limits.maxVcpuSeconds ? Number(limits.maxVcpuSeconds) : null} label="vCPU-seconds" format={(n) => `${(n / 3600).toFixed(1)}h`} />
          </>
        ) : (
          <div className="small">Organization has no active plan.</div>
        )}
      </Panel>
    </div>
  );

  const appsTab = (
    <Panel title={`Apps & services (${project.apps.length})`} flush>
      {project.apps.length === 0 ? (
        <EmptyState icon="apps" title="No apps in this project" />
      ) : (
        <Table
          columns={["App", "Type", "Status", "Node", "Domain", "Latest deploy"]}
          rows={project.apps.map((a) => [
            <strong key="n">{a.name}</strong>,
            a.type,
            <Badge key="s" status={a.status} />,
            a.node?.name ?? "—",
            a.defaultDomain ?? "—",
            a.deployments[0] ? <Badge key="d" status={a.deployments[0].status} /> : "—",
          ])}
        />
      )}
    </Panel>
  );

  const databasesTab = (
    <Panel title={`Databases (${project.databases.length})`} flush>
      {project.databases.length === 0 ? (
        <EmptyState icon="database" title="No databases in this project" />
      ) : (
        <Table
          columns={["Database", "Engine", "Status", "Size", "Conn limit", "Last backup"]}
          rows={project.databases.map((d) => [
            <strong key="n">{d.name}</strong>,
            `${d.engine} ${d.engineVersion ?? ""}`,
            <Badge key="s" status={d.status} />,
            bytes(d.currentSizeBytes),
            d.connectionLimit ?? "—",
            d.backups[0] ? <Badge key="b" status={d.backups[0].status} /> : "none",
          ])}
        />
      )}
    </Panel>
  );

  const storageTab = (
    <Panel title={`Object storage buckets (${project.buckets.length})`} flush>
      {project.buckets.length === 0 ? (
        <EmptyState icon="storage" title="No storage buckets in this project" />
      ) : (
        <Table
          columns={["Bucket", "Provider", "Status", "Visibility", "Storage used", "Egress used"]}
          rows={project.buckets.map((b) => [
            <strong key="n">{b.bucketName}</strong>,
            b.provider,
            <Badge key="s" status={b.status} />,
            b.isPublic ? "public" : "private",
            bytes(b.currentStorageBytes),
            bytes(b.currentEgressBytes),
          ])}
        />
      )}
    </Panel>
  );

  const buildsTab = (
    <Panel title={`Deployments & builds (${deployments.length})`} flush>
      {deployments.length === 0 ? (
        <EmptyState icon="rocket" title="No deployments yet" />
      ) : (
        <Table
          columns={["App", "Status", "Source", "Build duration", "Build CPU", "When"]}
          rows={deployments.map((d) => [
            d.app.name,
            <Badge key="s" status={d.status} />,
            d.sourceType,
            d.buildMetric?.durationSeconds ? `${d.buildMetric.durationSeconds}s` : "—",
            d.buildMetric ? `${Number(d.buildMetric.cpuSeconds).toFixed(0)}s` : "—",
            timeAgo(d.createdAt),
          ])}
        />
      )}
    </Panel>
  );

  const domainsTab = (
    <>
      <Panel title={`Custom domains (${project.domains.length})`} flush>
        {project.domains.length === 0 ? (
          <EmptyState icon="globe" title="No domains configured" />
        ) : (
          <Table
            columns={["Domain", "Type", "Status", "SSL"]}
            rows={project.domains.map((d) => [
              d.domain, d.type, <Badge key="s" status={d.status} />, d.sslStatus ?? "—",
            ])}
          />
        )}
      </Panel>
      <Panel title="Environment variables (metadata)" flush>
        {project.apps.every((a) => a.envVars.length === 0) ? (
          <EmptyState icon="settings" title="No environment variables set" />
        ) : (
          <Table
            columns={["App", "Variable keys"]}
            rows={project.apps
              .filter((a) => a.envVars.length > 0)
              .map((a) => [a.name, <span key="k" className="small">{a.envVars.map((e) => e.key).join(", ")}</span>])}
          />
        )}
        <p className="small" style={{ marginTop: 8 }}>Values are encrypted at rest and never displayed in the admin panel.</p>
      </Panel>
    </>
  );

  const membersTab = (
    <Panel title={`Team members (${project.members.length})`} flush>
      <Table
        columns={["Member", "Email", "Role", ""]}
        rows={project.members.map((m) => [
          m.user.name ?? "—", m.user.email, m.role,
          <Link key="l" className="btn sm secondary" href={`/users/${m.userId}`}>Open user</Link>,
        ])}
      />
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
      </div>
      <Panel title="Resource counts">
        <div className="grid compact">
          <MiniStat k="Apps" v={agg.apps} />
          <MiniStat k="Running apps" v={agg.runningApps} />
          <MiniStat k="Databases" v={agg.databases} />
          <MiniStat k="Buckets" v={agg.buckets} />
          <MiniStat k="Backups" v={agg.backups} />
        </div>
      </Panel>
    </>
  );

  const backupsTab = (
    <Panel title={`Backups (${backups.length})`} flush>
      {backups.length === 0 ? (
        <EmptyState icon="backups" title="No backups recorded" />
      ) : (
        <Table
          columns={["Database", "Type", "Status", "Size", "Provider", "When"]}
          rows={backups.map((b) => [
            b.database.name, b.backupType, <Badge key="s" status={b.status} />,
            bytes(b.sizeBytes), b.storageProvider, timeAgo(b.createdAt),
          ])}
        />
      )}
    </Panel>
  );

  const migrationsTab = (
    <Panel title={`Migrations (${project.migrations.length})`} flush>
      {project.migrations.length === 0 ? (
        <EmptyState icon="migrations" title="No migrations" />
      ) : (
        <Table
          columns={["Resource", "Strategy", "Status", "When"]}
          rows={project.migrations.map((m) => [
            m.resourceType, m.strategy, <Badge key="s" status={m.status} />, timeAgo(m.createdAt),
          ])}
        />
      )}
    </Panel>
  );

  const activityTab = (
    <>
      <Panel title="Project activity" flush>
        {project.activityLogs.length === 0 ? (
          <EmptyState icon="activity" title="No project activity" />
        ) : (
          <Table
            columns={["Time", "Action", "Detail"]}
            rows={project.activityLogs.map((a) => [
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

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/projects" },
          { label: project.organization.name, href: `/organizations/${project.organizationId}` },
          { label: project.name },
        ]}
      />
      <div className="actionbar">
        <div>
          <h1 className="h1">{project.name}</h1>
          <p className="sub">{project.organization.name} · <Badge status={project.status} /> · {sub?.plan.name ?? "no plan"}</p>
        </div>
        <div className="row">
          {project.status === "active" ? (
            <form action={suspendProject}>
              <input type="hidden" name="id" value={project.id} />
              <ConfirmButton message={`Suspend ${project.name}? Apps will stop.`} className="btn danger">Suspend project</ConfirmButton>
            </form>
          ) : (
            <form action={unsuspendProject}><input type="hidden" name="id" value={project.id} /><button className="btn secondary">Unsuspend project</button></form>
          )}
        </div>
      </div>

      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="apps" tone="violet" label="Apps" value={agg.apps} />
        <StatCard icon="database" tone="blue" label="Databases" value={agg.databases} />
        <StatCard icon="storage" tone="green" label="Buckets" value={agg.buckets} />
        <StatCard icon="cpu" tone="amber" label="vCPU-hours" value={vcpuHours(agg.vcpuSeconds)} />
        <StatCard icon="backups" tone="rose" label="Backups" value={agg.backups} />
      </div>

      <Tabs
        tabs={[
          { id: "overview", label: "Overview", icon: "projects", content: overviewTab },
          { id: "apps", label: "Apps", icon: "apps", content: appsTab },
          { id: "databases", label: "Databases", icon: "database", content: databasesTab },
          { id: "storage", label: "Storage", icon: "storage", content: storageTab },
          { id: "builds", label: "Builds", icon: "rocket", content: buildsTab },
          { id: "domains", label: "Domains & env", icon: "globe", content: domainsTab },
          { id: "members", label: "Members", icon: "users", content: membersTab },
          { id: "usage", label: "Usage", icon: "usage", content: usageTab },
          { id: "backups", label: "Backups", icon: "backups", content: backupsTab },
          { id: "migrations", label: "Migrations", icon: "migrations", content: migrationsTab },
          { id: "activity", label: "Activity & audit", icon: "activity", content: activityTab },
        ]}
      />
    </>
  );
}
