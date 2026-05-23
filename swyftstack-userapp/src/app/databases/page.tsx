import Link from "next/link";
import { prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Badge, Panel, Table, bytes, timeAgo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DatabasesPage() {
  const user = await requireUser();
  const memberships = await prisma.projectMember.findMany({ where: { userId: user.id }, select: { projectId: true } });
  const projectIds = memberships.map((m) => m.projectId);
  const databases = await prisma.database.findMany({
    where: { projectId: { in: projectIds }, status: { not: "deleted" } },
    include: { project: { include: { organization: true } }, backups: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  const workspace = databases[0]?.project.organization.name;
  return (
    <UserShell user={user} workspace={workspace}>
      <div className="page-head">
        <div>
          <h1 className="h1">Databases</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Managed PostgreSQL databases across your projects.</p>
        </div>
        <Link className="btn" href="/projects/new">Create project</Link>
      </div>
      <Panel title="All databases" flush>
        <Table
          columns={["Database", "Project", "Status", "Storage", "Last backup", "Created", ""]}
          empty="No databases yet."
          rows={databases.map((db) => [
            <strong key="n">{db.name}</strong>,
            <Link key="p" href={`/projects/${db.projectId}`}>{db.project.name}</Link>,
            <Badge key="s" status={db.status} />,
            bytes(db.currentSizeBytes),
            db.backups[0] ? <Badge key="b" status={db.backups[0].status} /> : "none",
            timeAgo(db.createdAt),
            <Link key="l" className="btn sm secondary" href={`/projects/${db.projectId}/databases/${db.id}`}>Open</Link>,
          ])}
        />
      </Panel>
    </UserShell>
  );
}
