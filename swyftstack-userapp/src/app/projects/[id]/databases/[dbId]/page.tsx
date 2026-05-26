import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  prisma, enqueueJob, projectActivity, databaseConnectionUrl,
  can, formatPublicId, uuidFromPublicId, type Role,
} from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Panel, Table, Badge, StatCard, bytes, timeAgo } from "@/components/ui";
import { CopyButton, SecretField } from "@/components/client";
import { DatabaseBrowser } from "@/components/db-browser";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function requireMembership(projectId: string) {
  const user = await requireUser();
  const resolvedProjectId = uuidFromPublicId(projectId, "project");
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: resolvedProjectId, userId: user.id } },
  });
  if (!membership) notFound();
  return { user, role: membership.role as Role, projectId: resolvedProjectId };
}

const projectHref = (projectId: string) => `/projects/${formatPublicId("project", projectId)}`;
const dbHref = (projectId: string, dbId: string) =>
  `${projectHref(projectId)}/databases/${formatPublicId("database", dbId)}`;

function backupStatusText(status: string): string {
  const copy: Record<string, string> = {
    pending: "Backup is waiting to start.",
    running: "Backup is being created.",
    uploading: "Backup is being uploaded to secure storage.",
    verified: "Backup is complete and verified.",
    failed: "Backup failed. We kept your previous verified backup.",
    expired: "Backup expired based on your plan retention.",
  };
  return copy[status] ?? status;
}

async function rotatePassword(formData: FormData) {
  "use server";
  const projectRef = String(formData.get("projectId"));
  const dbId = uuidFromPublicId(String(formData.get("dbId")), "database");
  const { user, role, projectId } = await requireMembership(projectRef);
  if (!can(role, "db.rotate_password")) redirect(dbHref(projectId, dbId));
  await enqueueJob("rotate_database_password", { databaseId: dbId }, { priority: 40 });
  await projectActivity(projectId, "database.password_rotation_requested", user.id, { databaseId: dbId });
  revalidatePath(dbHref(projectId, dbId));
}

async function createBackup(formData: FormData) {
  "use server";
  const projectRef = String(formData.get("projectId"));
  const dbId = uuidFromPublicId(String(formData.get("dbId")), "database");
  const { user, role, projectId } = await requireMembership(projectRef);
  if (!can(role, "db.create")) redirect(dbHref(projectId, dbId));
  await enqueueJob("backup_database", { databaseId: dbId }, { priority: 50 });
  await projectActivity(projectId, "database.backup_requested", user.id, { databaseId: dbId });
  revalidatePath(dbHref(projectId, dbId));
}

async function restoreBackup(formData: FormData) {
  "use server";
  const projectRef = String(formData.get("projectId"));
  const dbId = uuidFromPublicId(String(formData.get("dbId")), "database");
  const backupId = String(formData.get("backupId"));
  const { user, role, projectId } = await requireMembership(projectRef);
  if (!can(role, "backup.restore")) redirect(dbHref(projectId, dbId));
  await enqueueJob("restore_database", { backupId }, { priority: 50 });
  await projectActivity(projectId, "database.restore_requested", user.id, { databaseId: dbId, backupId });
  revalidatePath(dbHref(projectId, dbId));
}

export default async function DatabaseDetail({
  params,
}: {
  params: { id: string; dbId: string };
}) {
  const { user, role, projectId } = await requireMembership(params.id);
  const dbId = uuidFromPublicId(params.dbId, "database");

  const db = await prisma.database.findUnique({
    where: { id: dbId },
    include: {
      project: { include: { organization: true } },
      cluster: true,
      backups: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!db || db.projectId !== projectId) notFound();
  const projectPublicId = formatPublicId("project", db.projectId);
  const dbPublicId = formatPublicId("database", db.id);

  const conn = await databaseConnectionUrl(db.id);
  const lastBackup = db.backups[0];
  const canManage = can(role, "db.create");
  const canRotate = can(role, "db.rotate_password");
  const canRestore = can(role, "backup.restore");
  const snippetUrl = conn ? conn.url.replace(encodeURIComponent(conn.password), "********") : "";

  return (
    <UserShell user={user} organizationName={db.project.organization.name}>
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h1 className="h1" style={{ margin: 0 }}>{db.name}</h1>
            <Badge status={db.status} />
          </div>
          <p className="sub" style={{ margin: "4px 0 0" }}>
            <Link href="/projects">Projects</Link> ·{" "}
            <Link href={projectHref(db.projectId)}>{db.project.name}</Link> · managed PostgreSQL
          </p>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <StatCard icon="database" tone="violet" label="Status" value={db.status} />
        <StatCard icon="storage" tone="blue" label="Size used" value={bytes(db.currentSizeBytes)} />
        <StatCard icon="cpu" tone="amber" label="Connection limit" value={db.connectionLimit ?? "—"} />
        <StatCard icon="backups" tone="green" label="Last backup"
          value={lastBackup ? lastBackup.status : "none"} />
      </div>

      <Panel title="Connection">
        {db.status !== "active" ? (
          <p className="small" style={{ margin: 0 }}>
            The database is still <strong>{db.status}</strong>. Connection details appear once it is active —
            this page refreshes automatically.
          </p>
        ) : conn ? (
          <>
            <label style={{ marginTop: 0 }}>DATABASE_URL</label>
            {conn.warning && <div className="note" style={{ marginBottom: 10 }}>{conn.warning}</div>}
            <div className="conn-box">
              <code>{conn.url}</code>
              <CopyButton value={conn.url} />
            </div>
            <dl className="kv" style={{ marginTop: 14 }}>
              <dt>Host</dt><dd>{conn.host}</dd>
              <dt>Port</dt><dd>{conn.port}</dd>
              <dt>Database</dt><dd>{conn.database}</dd>
              <dt>Username</dt><dd>{conn.username}</dd>
              <dt>Password</dt><dd><SecretField value={conn.password} /></dd>
              <dt>SSL mode</dt><dd>{conn.sslMode}</dd>
              <dt>Cluster</dt><dd>{db.cluster?.name ?? "—"} {db.cluster?.region ? `(${db.cluster.region})` : ""}</dd>
            </dl>
            <p className="small" style={{ marginTop: 10 }}>
              Keep these credentials secret. Use the connection URL directly in your app&apos;s
              <code> DATABASE_URL</code> environment variable.
            </p>
          </>
        ) : (
          <p className="small" style={{ margin: 0 }}>Connection details are not available for this database.</p>
        )}
      </Panel>

      {(canManage || canRotate) && (
        <Panel title="Actions">
          <div className="row">
            {canRotate && <form action={rotatePassword}>
              <input type="hidden" name="projectId" value={projectPublicId} />
              <input type="hidden" name="dbId" value={dbPublicId} />
              <button className="btn secondary" type="submit"><Icon name="key" size={14} /> Rotate password</button>
            </form>}
            {canManage && <form action={createBackup}>
              <input type="hidden" name="projectId" value={projectPublicId} />
              <input type="hidden" name="dbId" value={dbPublicId} />
              <button className="btn secondary" type="submit"><Icon name="backups" size={14} /> Create backup</button>
            </form>}
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            Password rotation and backups run through the worker queue. Refresh this page after the job completes.
          </p>
        </Panel>
      )}

      {conn && (
        <Panel title="Connect">
          <div className="snippet-grid">
            {[
              ["Environment", `DATABASE_URL=\"${snippetUrl}\"`],
              ["Prisma", `datasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}`],
              ["Drizzle", `import { drizzle } from \"drizzle-orm/node-postgres\";\nconst db = drizzle(process.env.DATABASE_URL!);`],
              ["Node pg", `import pg from \"pg\";\nconst pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });`],
              ["Python SQLAlchemy", `engine = create_engine(os.environ[\"DATABASE_URL\"], pool_pre_ping=True)`],
              ["psql", `psql \"${snippetUrl}\"`],
            ].map(([title, value]) => (
              <div key={title} className="snippet-card">
                <div className="row between"><strong>{title}</strong><CopyButton value={value} /></div>
                <pre>{value}</pre>
              </div>
            ))}
          </div>
          <p className="small">Snippets mask the password. Use the reveal/copy controls above when you need the full secret.</p>
        </Panel>
      )}

      {db.status === "active" && (
        <Panel title="Browse data" flush>
          <DatabaseBrowser databaseId={dbPublicId} />
        </Panel>
      )}

      <Panel title="Backups" flush>
        <Table
          columns={["Type", "Status", "Size", "Created", canManage ? "Restore" : ""]}
          empty="No backups yet."
          rows={db.backups.map((b) => [
            b.backupType,
            <div key="s"><Badge status={b.status} /><div className="small">{backupStatusText(b.status)}</div></div>,
            bytes(b.sizeBytes),
            timeAgo(b.createdAt),
            canRestore && b.status === "verified" ? (
              <form key="r" action={restoreBackup}>
                <input type="hidden" name="projectId" value={projectPublicId} />
                <input type="hidden" name="dbId" value={dbPublicId} />
                <input type="hidden" name="backupId" value={b.id} />
                <button className="btn sm secondary" type="submit">Restore safely</button>
              </form>
            ) : "—",
          ])}
        />
      </Panel>
    </UserShell>
  );
}
