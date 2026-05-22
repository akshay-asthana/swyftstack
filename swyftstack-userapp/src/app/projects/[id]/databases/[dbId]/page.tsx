import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  prisma, enqueueJob, projectActivity, localDatabaseService, databaseConnectionUrl,
  can, type Role,
} from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Panel, Table, Badge, StatCard, bytes, timeAgo } from "@/components/ui";
import { CopyButton, SecretField } from "@/components/client";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function requireMembership(projectId: string) {
  const user = await requireUser();
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!membership) notFound();
  return { user, role: membership.role as Role };
}

async function rotatePassword(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId"));
  const dbId = String(formData.get("dbId"));
  const { user, role } = await requireMembership(projectId);
  if (!can(role, "db.create")) redirect(`/projects/${projectId}/databases/${dbId}`);
  await localDatabaseService.rotateDatabasePassword(dbId);
  await projectActivity(projectId, "database.password_rotated", user.id, { databaseId: dbId });
  revalidatePath(`/projects/${projectId}/databases/${dbId}`);
}

async function createBackup(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId"));
  const dbId = String(formData.get("dbId"));
  const { user, role } = await requireMembership(projectId);
  if (!can(role, "db.create")) redirect(`/projects/${projectId}/databases/${dbId}`);
  await enqueueJob("backup_database", { databaseId: dbId }, { priority: 50 });
  await projectActivity(projectId, "database.backup_requested", user.id, { databaseId: dbId });
  revalidatePath(`/projects/${projectId}/databases/${dbId}`);
}

async function restoreBackup(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId"));
  const dbId = String(formData.get("dbId"));
  const backupId = String(formData.get("backupId"));
  const { user, role } = await requireMembership(projectId);
  if (!can(role, "db.create")) redirect(`/projects/${projectId}/databases/${dbId}`);
  await enqueueJob("restore_database", { backupId }, { priority: 50 });
  await projectActivity(projectId, "database.restore_requested", user.id, { databaseId: dbId, backupId });
  revalidatePath(`/projects/${projectId}/databases/${dbId}`);
}

export default async function DatabaseDetail({
  params,
}: {
  params: { id: string; dbId: string };
}) {
  const { user, role } = await requireMembership(params.id);

  const db = await prisma.database.findUnique({
    where: { id: params.dbId },
    include: {
      project: { include: { organization: true } },
      cluster: true,
      backups: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!db || db.projectId !== params.id) notFound();

  const conn = await databaseConnectionUrl(db.id);
  const lastBackup = db.backups[0];
  const canManage = can(role, "db.create");

  return (
    <UserShell user={user} workspace={db.project.organization.name}>
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h1 className="h1" style={{ margin: 0 }}>{db.name}</h1>
            <Badge status={db.status} />
          </div>
          <p className="sub" style={{ margin: "4px 0 0" }}>
            <Link href="/projects">Projects</Link> ·{" "}
            <Link href={`/projects/${db.projectId}`}>{db.project.name}</Link> · managed PostgreSQL
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

      {canManage && (
        <Panel title="Actions">
          <div className="row">
            <form action={rotatePassword}>
              <input type="hidden" name="projectId" value={db.projectId} />
              <input type="hidden" name="dbId" value={db.id} />
              <button className="btn secondary" type="submit"><Icon name="key" size={14} /> Rotate password</button>
            </form>
            <form action={createBackup}>
              <input type="hidden" name="projectId" value={db.projectId} />
              <input type="hidden" name="dbId" value={db.id} />
              <button className="btn secondary" type="submit"><Icon name="backups" size={14} /> Create backup</button>
            </form>
          </div>
          <p className="small" style={{ marginTop: 10 }}>
            Rotating the password updates the connection URL immediately. Backups run in the background.
          </p>
        </Panel>
      )}

      <Panel title="Backups" flush>
        <Table
          columns={["Type", "Status", "Size", "Created", canManage ? "Restore" : ""]}
          empty="No backups yet."
          rows={db.backups.map((b) => [
            b.backupType,
            <Badge key="s" status={b.status} />,
            bytes(b.sizeBytes),
            timeAgo(b.createdAt),
            canManage && b.status === "verified" ? (
              <form key="r" action={restoreBackup}>
                <input type="hidden" name="projectId" value={db.projectId} />
                <input type="hidden" name="dbId" value={db.id} />
                <input type="hidden" name="backupId" value={b.id} />
                <button className="btn sm secondary" type="submit">Restore</button>
              </form>
            ) : "—",
          ])}
        />
      </Panel>
    </UserShell>
  );
}
