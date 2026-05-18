import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, permissionsFor, type Role } from "quickdock-shared";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: params.id, userId: user.id } },
  });
  if (!membership) notFound(); // not a member -> no access

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      organization: true,
      apps: { include: { node: true } },
      databases: true,
      buckets: true,
      activityLogs: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
  if (!project) notFound();

  const perms = permissionsFor(membership.role as Role);

  return (
    <>
      <div className="topbar">
        <Link href="/" className="brand">Quickdock</Link>
        <span className="small">{project.organization.name} / {project.name}</span>
        <span className="badge right">{membership.role}</span>
      </div>
      <div className="wrap">
        <h1 className="h1">{project.name}</h1>
        <p className="sub">Status: {project.status} · Your permissions: {perms.join(", ")}</p>

        <h2 className="h1" style={{ fontSize: 16 }}>Apps</h2>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Node</th><th>Domain</th></tr></thead>
          <tbody>
            {project.apps.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td><td>{a.type}</td><td>{a.status}</td>
                <td>{a.node?.name ?? "—"}</td><td>{a.defaultDomain ?? "—"}</td>
              </tr>
            ))}
            {project.apps.length === 0 && <tr><td colSpan={5} className="small">No apps.</td></tr>}
          </tbody>
        </table>

        <h2 className="h1" style={{ fontSize: 16 }}>Databases</h2>
        <table>
          <thead><tr><th>Name</th><th>Status</th><th>Engine</th></tr></thead>
          <tbody>
            {project.databases.map((d) => (
              <tr key={d.id}><td>{d.name}</td><td>{d.status}</td><td>{d.engine}</td></tr>
            ))}
            {project.databases.length === 0 && <tr><td colSpan={3} className="small">No databases.</td></tr>}
          </tbody>
        </table>

        <h2 className="h1" style={{ fontSize: 16 }}>Recent activity</h2>
        <table>
          <thead><tr><th>When</th><th>Action</th></tr></thead>
          <tbody>
            {project.activityLogs.map((l) => (
              <tr key={l.id}>
                <td className="small">{l.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                <td>{l.action}</td>
              </tr>
            ))}
            {project.activityLogs.length === 0 && <tr><td colSpan={2} className="small">No activity.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
