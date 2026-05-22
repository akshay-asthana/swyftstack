import Link from "next/link";
import { prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Panel, Table, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        include: {
          organization: true,
          _count: { select: { apps: true, databases: true, buckets: true } },
        },
      },
    },
  });
  const ownedOrg = await prisma.organization.findFirst({
    where: { ownerUserId: user.id }, orderBy: { createdAt: "asc" },
  });

  return (
    <UserShell user={user} workspace={ownedOrg?.name}>
      <div className="page-head">
        <div>
          <h1 className="h1">Projects</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Every project you own or collaborate on.</p>
        </div>
        <Link className="btn" href="/projects/new"><Icon name="plus" size={15} /> New Project</Link>
      </div>

      {memberships.length === 0 ? (
        <div className="card empty">
          <div className="stat-icon violet"><Icon name="projects" size={20} /></div>
          <p style={{ fontWeight: 650, color: "var(--text)", margin: "0 0 4px" }}>No projects yet</p>
          <p className="small" style={{ margin: 0 }}>Create your first project to deploy apps and databases.</p>
          <Link className="btn" href="/projects/new" style={{ marginTop: 14 }}>Create project</Link>
        </div>
      ) : (
        <Panel title={`${memberships.length} project${memberships.length === 1 ? "" : "s"}`} flush>
          <Table
            columns={["Project", "Workspace", "Role", "Status", "Apps", "DBs", "Buckets", ""]}
            rows={memberships.map((m) => [
              <strong key="n">{m.project.name}</strong>,
              m.project.organization.name,
              <span key="r" className="badge muted">{m.role}</span>,
              <Badge key="s" status={m.project.status} />,
              m.project._count.apps,
              m.project._count.databases,
              m.project._count.buckets,
              <Link key="o" href={`/projects/${m.project.id}`}>Open →</Link>,
            ])}
          />
        </Panel>
      )}
    </UserShell>
  );
}
