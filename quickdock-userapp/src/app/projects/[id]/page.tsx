import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  prisma, enqueueJob, encryptSecret, randomSecret, deriveDbNames,
  resolveLimit, wouldExceed, projectActivity, databaseClusterService,
  can, permissionsFor, type Role, type LimitOverrideInput,
} from "quickdock-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Panel, Table, Badge, StatCard, FeedItem, bytes, timeAgo } from "@/components/ui";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  forbidden: "Your role does not allow that action.",
  name: "A name is required.",
  dup_app: "An app with that name already exists in this project.",
  db_limit: "You have reached the database limit for your plan.",
  no_cluster: "No database cluster is available right now. Try again shortly.",
};

async function requireMembership(projectId: string) {
  const user = await requireUser();
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!membership) notFound();
  return { user, role: membership.role as Role };
}

// ---- create app ----
async function createApp(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId") ?? "");
  const { user, role } = await requireMembership(projectId);
  if (!can(role, "app.deploy")) redirect(`/projects/${projectId}?error=forbidden`);

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "nextjs");
  const repoUrl = String(formData.get("repoUrl") ?? "").trim() || null;
  const branch = String(formData.get("branch") ?? "").trim() || null;
  if (!name) redirect(`/projects/${projectId}?error=name#new-app`);

  const dup = await prisma.app.findUnique({ where: { projectId_name: { projectId, name } }, select: { id: true } });
  if (dup) redirect(`/projects/${projectId}?error=dup_app#new-app`);

  const node = await prisma.node.findFirst({ where: { roles: { has: "app" }, status: "active" } });
  const app = await prisma.app.create({
    data: {
      projectId, nodeId: node?.id, name,
      type: type as "nextjs" | "static" | "node" | "python" | "serverless_api",
      status: "created", cpuLimit: 0.25, memoryLimitBytes: BigInt(256 * 1024 * 1024),
    },
  });
  const deployment = await prisma.deployment.create({
    data: {
      appId: app.id, sourceType: repoUrl ? "git" : "cli", repoUrl, branch,
      status: "queued", buildNodeId: node?.id, runtimeNodeId: node?.id,
    },
  });
  await enqueueJob("deploy_app", { deploymentId: deployment.id }, { priority: 40 });
  await projectActivity(projectId, "app.created", user.id, { appId: app.id, name });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

// ---- create database ----
async function createDatabase(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId") ?? "");
  const { user, role } = await requireMembership(projectId);
  if (!can(role, "db.create")) redirect(`/projects/${projectId}?error=forbidden`);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      organization: { include: { subscriptions: { where: { status: "active" }, include: { plan: { include: { limits: true } } } } } },
      databases: true,
    },
  });
  if (!project) notFound();

  const plan = project.organization.subscriptions[0]?.plan;
  const overrides = (await prisma.limitOverride.findMany()) as unknown as LimitOverrideInput[];
  const maxDbs = resolveLimit("max_databases", plan?.limits?.maxDatabases ?? 1, overrides, {
    organizationId: project.organizationId, projectId: project.id,
  });
  if (wouldExceed(project.databases.length, 1, maxDbs)) {
    redirect(`/projects/${projectId}?error=db_limit`);
  }
  const storageLimit =
    resolveLimit("max_database_storage_bytes", plan?.limits?.maxDatabaseStorageBytes ?? null, overrides, {
      organizationId: project.organizationId, projectId: project.id,
    }) ?? 5 * 1024 ** 3;

  const cluster = await databaseClusterService.selectClusterForProject(project.id, { allowOverride: false });
  if (!cluster) redirect(`/projects/${projectId}?error=no_cluster`);

  const { dbName, dbUser } = deriveDbNames(project.id);
  const db = await prisma.database.create({
    data: {
      projectId: project.id, nodeId: cluster.nodeId, databaseClusterId: cluster.id,
      name: `${project.slug}-db-${project.databases.length + 1}`,
      dbName, dbUser, encryptedPassword: encryptSecret(randomSecret(18)),
      storageLimitBytes: BigInt(storageLimit), status: "provisioning",
    },
  });
  await databaseClusterService.updateClusterUsage(cluster.id);
  await enqueueJob("create_database", { databaseId: db.id }, { priority: 40 });
  await projectActivity(projectId, "database.create_requested", user.id, { databaseId: db.id });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export default async function ProjectDetail({
  params, searchParams,
}: {
  params: { id: string }; searchParams: { error?: string };
}) {
  const { user, role } = await requireMembership(params.id);

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      organization: true,
      apps: { include: { node: true }, orderBy: { createdAt: "desc" } },
      databases: { include: { cluster: true }, orderBy: { createdAt: "desc" } },
      buckets: true,
      domains: true,
      activityLogs: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!project) notFound();

  const perms = permissionsFor(role);
  const canDeploy = can(role, "app.deploy");
  const canDb = can(role, "db.create");
  const error = searchParams.error ? ERRORS[searchParams.error] ?? "Something went wrong." : null;
  const APP_TYPES = ["nextjs", "static", "node", "python", "serverless_api"];

  return (
    <UserShell user={user} workspace={project.organization.name}>
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h1 className="h1" style={{ margin: 0 }}>{project.name}</h1>
            <Badge status={project.status} />
          </div>
          <p className="sub" style={{ margin: "4px 0 0" }}>
            <Link href="/projects">Projects</Link> · {project.region ?? "local"} · your role: <strong>{role}</strong>
          </p>
        </div>
        <div className="row">
          {canDb && <a className="btn secondary" href="#new-db"><Icon name="database" size={15} /> New database</a>}
          {canDeploy && <a className="btn" href="#new-app"><Icon name="plus" size={15} /> New app</a>}
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <StatCard icon="rocket" tone="green" label="Apps" value={project.apps.length} />
        <StatCard icon="database" tone="violet" label="Databases" value={project.databases.length} />
        <StatCard icon="storage" tone="amber" label="Buckets" value={project.buckets.length} />
        <StatCard icon="globe" tone="blue" label="Domains" value={project.domains.length} />
      </div>

      <Panel
        title="Apps"
        flush
        action={canDeploy
          ? <a className="btn sm" href="#new-app"><Icon name="plus" size={13} /> New app</a>
          : <span className="small">View only</span>}
      >
        <Table
          columns={["Name", "Type", "Status", "Node", "Domain"]}
          empty="No apps yet. Deploy your first app to get started."
          rows={project.apps.map((a) => [
            <strong key="n">{a.name}</strong>,
            a.type,
            <Badge key="s" status={a.status} />,
            a.node?.name ?? "unassigned",
            a.defaultDomain ?? "—",
          ])}
        />
      </Panel>

      <Panel
        title="Databases"
        flush
        action={canDb
          ? <a className="btn sm" href="#new-db"><Icon name="plus" size={13} /> New database</a>
          : <span className="small">View only</span>}
      >
        <Table
          columns={["Name", "Engine", "Status", "Cluster", "Size", "Limit"]}
          empty="No databases yet. Create a managed Postgres database."
          rows={project.databases.map((d) => [
            <strong key="n">{d.name}</strong>,
            `${d.engine}${d.engineVersion ? ` ${d.engineVersion}` : ""}`,
            <Badge key="s" status={d.status} />,
            d.cluster?.name ?? "—",
            bytes(d.currentSizeBytes),
            bytes(d.storageLimitBytes),
          ])}
        />
      </Panel>

      <Panel title="Recent activity">
        <div className="feed">
          {project.activityLogs.length === 0 && <p className="small" style={{ margin: 0 }}>No activity yet.</p>}
          {project.activityLogs.map((l) => (
            <FeedItem key={l.id} icon="activity"
              title={l.action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              time={timeAgo(l.createdAt)} />
          ))}
        </div>
      </Panel>

      <p className="small">Your permissions in this project: {perms.join(", ")}</p>

      {/* New app modal */}
      <div id="new-app" className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-head"><strong>Deploy a new app</strong><a href="#" className="modal-close">×</a></div>
          <div className="modal-body">
            <form action={createApp}>
              <input type="hidden" name="projectId" value={project.id} />
              <label>App name</label>
              <input name="name" placeholder="marketing-site" required />
              <label>Framework / type</label>
              <select name="type" defaultValue="nextjs">
                {APP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <label>Git repository URL <span className="muted">(optional)</span></label>
              <input name="repoUrl" placeholder="https://github.com/acme/marketing-site" />
              <label>Branch <span className="muted">(optional)</span></label>
              <input name="branch" placeholder="main" />
              <div className="row" style={{ marginTop: 18 }}>
                <button className="btn" type="submit">Create &amp; deploy</button>
                <a href="#" className="btn secondary">Cancel</a>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* New database modal */}
      <div id="new-db" className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-head"><strong>Create a database</strong><a href="#" className="modal-close">×</a></div>
          <div className="modal-body">
            <form action={createDatabase}>
              <input type="hidden" name="projectId" value={project.id} />
              <p className="small" style={{ marginTop: 0 }}>
                A managed PostgreSQL database is provisioned on the least-loaded cluster, with an isolated
                role and an encrypted password. It will be named automatically.
              </p>
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn" type="submit">Provision database</button>
                <a href="#" className="btn secondary">Cancel</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </UserShell>
  );
}
