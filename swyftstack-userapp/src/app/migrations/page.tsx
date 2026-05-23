import Link from "next/link";
import { maskDbUrl, prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Badge, Panel, Table, bytes, timeAgo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MigrationsPage() {
  const user = await requireUser();
  const memberships = await prisma.projectMember.findMany({ where: { userId: user.id }, select: { projectId: true } });
  const projectIds = memberships.map((m) => m.projectId);
  const imports = await prisma.databaseImport.findMany({
    where: { projectId: { in: projectIds } },
    include: { project: { include: { organization: true } }, database: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const workspace = imports[0]?.project.organization.name;
  return (
    <UserShell user={user} workspace={workspace}>
      <div className="page-head">
        <div>
          <h1 className="h1">Migrations</h1>
          <p className="sub" style={{ marginBottom: 0 }}>PostgreSQL imports run read-only against the source and progress through worker states.</p>
        </div>
      </div>
      <Panel title="Database imports" flush>
        <Table
          columns={["Target", "Project", "Status", "Size", "Requested", "Last log", ""]}
          empty="No migrations yet."
          rows={imports.map((imp) => [
            <strong key="t">{imp.targetDbName}</strong>,
            <Link key="p" href={`/projects/${imp.projectId}`}>{imp.project.name}</Link>,
            <Badge key="s" status={imp.status} />,
            bytes(imp.sizeBytes),
            timeAgo(imp.createdAt),
            <code key="l">{maskDbUrl(imp.logs?.split("\n").at(-1) ?? "—")}</code>,
            imp.databaseId ? <Link key="d" className="btn sm secondary" href={`/projects/${imp.projectId}/databases/${imp.databaseId}`}>Open DB</Link> : "—",
          ])}
        />
      </Panel>
    </UserShell>
  );
}
