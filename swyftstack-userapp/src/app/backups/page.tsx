import Link from "next/link";
import { prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Badge, Panel, Table, bytes, timeAgo } from "@/components/ui";

export const dynamic = "force-dynamic";

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

export default async function BackupsPage() {
  const user = await requireUser();
  const memberships = await prisma.projectMember.findMany({ where: { userId: user.id }, select: { projectId: true } });
  const projectIds = memberships.map((m) => m.projectId);
  const backups = await prisma.databaseBackup.findMany({
    where: { database: { projectId: { in: projectIds } } },
    include: { database: { include: { project: { include: { organization: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const workspace = backups[0]?.database.project.organization.name;
  return (
    <UserShell user={user} workspace={workspace}>
      <div className="page-head">
        <div>
          <h1 className="h1">Backups</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Database backup history and restore entry points.</p>
        </div>
      </div>
      <Panel title="Database backups" flush>
        <Table
          columns={["Database", "Project", "Status", "Plain English", "Size", "Created", "Expires", ""]}
          empty="No backups yet."
          rows={backups.map((b) => [
            <strong key="d">{b.database.name}</strong>,
            <Link key="p" href={`/projects/${b.database.projectId}`}>{b.database.project.name}</Link>,
            <Badge key="s" status={b.status} />,
            backupStatusText(b.status),
            bytes(b.sizeBytes),
            timeAgo(b.createdAt),
            b.expiresAt ? b.expiresAt.toLocaleDateString() : "—",
            <Link key="l" className="btn sm secondary" href={`/projects/${b.database.projectId}/databases/${b.databaseId}`}>Open DB</Link>,
          ])}
        />
      </Panel>
    </UserShell>
  );
}
