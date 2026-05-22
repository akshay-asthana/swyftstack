import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  prisma, enqueueJob, encryptSecret, projectActivity,
  provisionDatabase, assertDatabaseLimit, DatabaseLimitReachedError, NoClusterAvailableError,
  provisioningPolicyService,
  can, permissionsFor, maskDbUrl, BANDWIDTH_IN_TYPES, BANDWIDTH_OUT_TYPES,
  type Role,
} from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Panel, Table, Badge, StatCard, FeedItem, bytes, timeAgo } from "@/components/ui";
import { Tabs } from "@/components/client";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  forbidden: "Your role does not allow that action.",
  name: "A name is required.",
  dup_app: "An app with that name already exists in this project.",
  db_limit: "You have reached the database limit for your plan.",
  no_cluster: "No database cluster is available right now. Try again shortly.",
  import_url: "Enter a valid PostgreSQL connection URL (postgres://…).",
  import_name: "Enter a name for the imported database.",
};

const monthStart = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1);
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

  // §10/§11 — placement flows through the admin provisioning policy, with a
  // fallback to the first active app node if no policy/healthy target exists.
  const decision = await provisioningPolicyService.selectTarget("app");
  let nodeId =
    decision.chosen?.targetType === "node" ? decision.chosen.targetId : null;
  if (!nodeId) {
    const fallback = await prisma.node.findFirst({
      where: { roles: { has: "app" }, status: "active" },
    });
    nodeId = fallback?.id ?? null;
  }
  const app = await prisma.app.create({
    data: {
      projectId, nodeId, name,
      type: type as "nextjs" | "static" | "node" | "python" | "serverless_api",
      status: "created", cpuLimit: 0.25, memoryLimitBytes: BigInt(256 * 1024 * 1024),
    },
  });
  const deployment = await prisma.deployment.create({
    data: {
      appId: app.id, sourceType: repoUrl ? "git" : "cli", repoUrl, branch,
      status: "queued", buildNodeId: nodeId, runtimeNodeId: nodeId,
    },
  });
  await enqueueJob("deploy_app", { deploymentId: deployment.id }, { priority: 40 });
  await projectActivity(projectId, "app.created", user.id, { appId: app.id, name });
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

// ---- create database (§10) ----
async function createDatabase(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId") ?? "");
  const { user, role } = await requireMembership(projectId);
  if (!can(role, "db.create")) redirect(`/projects/${projectId}?error=forbidden`);

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  try {
    await assertDatabaseLimit(project.organizationId);
    const db = await provisionDatabase({
      projectId,
      name: String(formData.get("name") ?? "").trim() || `${project.slug}-db`,
    });
    await projectActivity(projectId, "database.create_requested", user.id, { databaseId: db.id });
    redirect(`/projects/${projectId}/databases/${db.id}`);
  } catch (err) {
    if (err instanceof DatabaseLimitReachedError) redirect(`/projects/${projectId}?error=db_limit`);
    if (err instanceof NoClusterAvailableError) redirect(`/projects/${projectId}?error=no_cluster`);
    throw err;
  }
}

// ---- import database from external URL (§11) ----
async function importDatabase(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId") ?? "");
  const { user, role } = await requireMembership(projectId);
  if (!can(role, "db.create")) redirect(`/projects/${projectId}?error=forbidden`);

  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const targetName = String(formData.get("targetName") ?? "").trim();
  if (!/^postgres(ql)?:\/\//i.test(sourceUrl)) redirect(`/projects/${projectId}?error=import_url#import-db`);
  if (!targetName) redirect(`/projects/${projectId}?error=import_name#import-db`);

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  try {
    await assertDatabaseLimit(project.organizationId);
  } catch {
    redirect(`/projects/${projectId}?error=db_limit`);
  }

  const imp = await prisma.databaseImport.create({
    data: {
      projectId,
      targetDbName: targetName,
      sourceEngine: "postgres",
      // Source URL is encrypted at rest and never logged in plaintext.
      sourceUrlEncrypted: encryptSecret(sourceUrl),
      saveSourceCredentials: formData.get("saveCredentials") === "on",
      createdBy: user.id,
      status: "queued",
    },
  });
  await enqueueJob("import_database_from_url", { importId: imp.id }, { priority: 40 });
  await projectActivity(projectId, "database.import_requested", user.id, { importId: imp.id });
  redirect(`/projects/${projectId}`);
}

const IMPORT_STEPS = ["queued", "testing_connection", "dumping", "restoring", "verifying", "completed"];

function ImportSteps({ status }: { status: string }) {
  if (status === "failed") {
    return <div className="import-steps"><span className="import-step failed">failed</span></div>;
  }
  const idx = IMPORT_STEPS.indexOf(status);
  return (
    <div className="import-steps">
      {IMPORT_STEPS.map((s, i) => (
        <span key={s} className={`import-step${i < idx ? " done" : i === idx ? " active" : ""}`}>{s}</span>
      ))}
    </div>
  );
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
      apps: { include: { node: true, deployments: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" } },
      databases: { include: { cluster: true, backups: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" } },
      buckets: { include: { credentials: true } },
      domains: true,
      members: { include: { user: true } },
      databaseImports: { orderBy: { createdAt: "desc" }, take: 10 },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 12 },
    },
  });
  if (!project) notFound();

  const usage = await prisma.usageEvent.groupBy({
    by: ["usageType"],
    where: { projectId: project.id, recordedAt: { gte: monthStart() } },
    _sum: { quantity: true },
  });
  const sumOf = (types: readonly string[]) =>
    usage.filter((u) => types.includes(u.usageType)).reduce((s, u) => s + Number(u._sum.quantity ?? 0), 0);
  const vcpuHours = sumOf(["app_runtime_vcpu_seconds"]) / 3600;
  const bwIn = sumOf(BANDWIDTH_IN_TYPES);
  const bwOut = sumOf(BANDWIDTH_OUT_TYPES);

  const perms = permissionsFor(role);
  const canDeploy = can(role, "app.deploy");
  const canDb = can(role, "db.create");
  const error = searchParams.error ? ERRORS[searchParams.error] ?? "Something went wrong." : null;
  const APP_TYPES = ["nextjs", "static", "node", "python", "serverless_api"];

  const appsTab = (
    <Panel title="Apps & services" flush>
      <Table
        columns={["Name", "Type", "Status", "URL", "Latest deploy", "Node"]}
        empty="No apps yet. Deploy your first app to get started."
        rows={project.apps.map((a) => [
          <strong key="n">{a.name}</strong>,
          a.type,
          <Badge key="s" status={a.status} />,
          a.defaultDomain
            ? <a key="u" href={`https://${a.defaultDomain}`} target="_blank" rel="noreferrer">{a.defaultDomain}</a>
            : "—",
          a.deployments[0] ? <Badge key="d" status={a.deployments[0].status} /> : "—",
          a.node?.name ?? "unassigned",
        ])}
      />
    </Panel>
  );

  const databasesTab = (
    <Panel
      title="Databases"
      flush
      action={canDb ? <a className="btn sm" href="#new-db">New database</a> : <span className="small">View only</span>}
    >
      <Table
        columns={["Name", "Engine", "Status", "Size", "Last backup", ""]}
        empty="No databases yet. Create a managed Postgres database or import an existing one."
        rows={project.databases.map((d) => [
          <strong key="n">{d.name}</strong>,
          `${d.engine}${d.engineVersion ? ` ${d.engineVersion}` : ""}`,
          <Badge key="s" status={d.status} />,
          bytes(d.currentSizeBytes),
          d.backups[0] ? <Badge key="b" status={d.backups[0].status} /> : "none",
          <Link key="l" className="btn sm secondary" href={`/projects/${project.id}/databases/${d.id}`}>
            Connection details
          </Link>,
        ])}
      />
    </Panel>
  );

  const storageTab = (
    <Panel title="Object storage" flush>
      <Table
        columns={["Bucket", "Provider", "Endpoint", "Visibility", "Used", "Egress"]}
        empty="No storage buckets in this project."
        rows={project.buckets.map((b) => [
          <strong key="n">{b.bucketName}</strong>,
          b.provider,
          b.region ?? "—",
          b.isPublic ? "public" : "private",
          bytes(b.currentStorageBytes),
          bytes(b.currentEgressBytes),
        ])}
      />
    </Panel>
  );

  const importsTab = (
    <Panel
      title="Database imports"
      flush
      action={canDb ? <a className="btn sm" href="#import-db">Import database</a> : undefined}
    >
      {project.databaseImports.length === 0 ? (
        <p className="small" style={{ padding: 16, margin: 0 }}>
          No imports yet. Import an existing PostgreSQL database by entering its connection URL.
        </p>
      ) : (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {project.databaseImports.map((imp) => (
            <div key={imp.id} className="panel" style={{ margin: 0 }}>
              <div className="panel-head">
                <strong>{imp.targetDbName}</strong>
                <Badge status={imp.status} />
              </div>
              <div style={{ padding: 14 }}>
                <ImportSteps status={imp.status} />
                {imp.errorMessage && (
                  <div className="err" style={{ marginTop: 8 }}>
                    [{imp.errorCode}] {maskDbUrl(imp.errorMessage)}
                  </div>
                )}
                {imp.databaseId && imp.status === "completed" && (
                  <Link className="btn sm secondary" style={{ marginTop: 8 }}
                    href={`/projects/${project.id}/databases/${imp.databaseId}`}>
                    Open imported database
                  </Link>
                )}
                <div className="small" style={{ marginTop: 6 }}>Requested {timeAgo(imp.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );

  const membersTab = (
    <Panel title="Team members" flush>
      <Table
        columns={["Member", "Email", "Role"]}
        rows={project.members.map((m) => [
          m.user.name ?? "—", m.user.email, m.role,
        ])}
      />
    </Panel>
  );

  const activityTab = (
    <>
      <Panel title="Custom domains" flush>
        <Table
          columns={["Domain", "Type", "Status", "SSL"]}
          empty="No custom domains."
          rows={project.domains.map((d) => [d.domain, d.type, <Badge key="s" status={d.status} />, d.sslStatus ?? "—"])}
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
    </>
  );

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
          {canDb && <a className="btn secondary" href="#import-db"><Icon name="database" size={15} /> Import database</a>}
          {canDb && <a className="btn secondary" href="#new-db"><Icon name="database" size={15} /> New database</a>}
          {canDeploy && <a className="btn" href="#new-app"><Icon name="plus" size={15} /> New app</a>}
        </div>
      </div>

      {error && <div className="err" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid cols-5" style={{ marginBottom: 16 }}>
        <StatCard icon="rocket" tone="green" label="Apps" value={project.apps.length} />
        <StatCard icon="database" tone="violet" label="Databases" value={project.databases.length} />
        <StatCard icon="cpu" tone="rose" label="vCPU-hours" value={vcpuHours.toFixed(1)} />
        <StatCard icon="arrowDown" tone="blue" label="Bandwidth in" value={bytes(bwIn)} />
        <StatCard icon="arrowUp" tone="amber" label="Bandwidth out" value={bytes(bwOut)} />
      </div>

      <Tabs
        tabs={[
          { id: "apps", label: "Apps", content: appsTab },
          { id: "databases", label: "Databases", content: databasesTab },
          { id: "storage", label: "Storage", content: storageTab },
          { id: "imports", label: "Imports", content: importsTab },
          { id: "members", label: "Members", content: membersTab },
          { id: "activity", label: "Domains & activity", content: activityTab },
        ]}
      />

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
              <label>Database name</label>
              <input name="name" placeholder={`${project.slug}-db`} />
              <p className="small">
                A managed PostgreSQL database is provisioned on the least-loaded cluster with an isolated
                role and an encrypted password. You will see the connection URL once it is ready.
              </p>
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn" type="submit">Provision database</button>
                <a href="#" className="btn secondary">Cancel</a>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Import database modal */}
      <div id="import-db" className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-head"><strong>Import a database</strong><a href="#" className="modal-close">×</a></div>
          <div className="modal-body">
            <form action={importDatabase}>
              <input type="hidden" name="projectId" value={project.id} />
              <label>Source database URL</label>
              <input name="sourceUrl" placeholder="postgresql://user:password@host:5432/dbname" required />
              <label>Target database name</label>
              <input name="targetName" placeholder="imported-db" required />
              <label className="check" style={{ marginTop: 10 }}>
                <input type="checkbox" name="saveCredentials" /> Keep source credentials after import
              </label>
              <p className="small">
                The import runs in the background: connection test → dump → restore → verify. The source URL
                is encrypted, masked in all logs, and discarded on completion unless you keep it.
              </p>
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn" type="submit">Start import</button>
                <a href="#" className="btn secondary">Cancel</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </UserShell>
  );
}
