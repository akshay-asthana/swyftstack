import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "quickdock-shared";
import { requireUser, logout } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
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
    where: { ownerUserId: user.id },
    include: { subscriptions: { where: { status: "active" }, include: { plan: true }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });
  const activePlan = ownedOrg?.subscriptions[0]?.plan;

  async function doLogout() {
    "use server";
    logout();
    redirect("/login");
  }

  return (
    <>
      <div className="topbar">
        <span className="brand">Quickdock</span>
        <span className="small">{user.email}</span>
        <form action={doLogout} className="right">
          <button className="btn secondary">Sign out</button>
        </form>
      </div>
      <div className="wrap">
        <div className="row" style={{ marginBottom: 12 }}>
          <div>
            <h1 className="h1">Your projects</h1>
            <p className="sub">Projects you collaborate on. Roles control what you can do.</p>
          </div>
          <Link className="btn right" href="/projects/new">Create project</Link>
        </div>
        {!activePlan && (
          <div className="card small">
            Choose a plan before creating projects. <Link href="/pricing?next=/projects/new">View pricing</Link>
          </div>
        )}
        {memberships.length === 0 && (
          <div className="card small">
            You are not a member of any project yet. Ask an admin to invite you.
          </div>
        )}
        <table>
          <thead>
            <tr><th>Project</th><th>Organization</th><th>Role</th><th>Apps</th><th>DBs</th><th>Buckets</th><th></th></tr>
          </thead>
          <tbody>
            {memberships.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.project.name}</strong></td>
                <td>{m.project.organization.name}</td>
                <td><span className="badge">{m.role}</span></td>
                <td>{m.project._count.apps}</td>
                <td>{m.project._count.databases}</td>
                <td>{m.project._count.buckets}</td>
                <td><Link href={`/projects/${m.project.id}`}>Open →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
