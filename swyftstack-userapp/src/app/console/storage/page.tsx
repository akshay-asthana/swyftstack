// Authenticated console storage listing. Moved here from /storage to free
// the top-level slug for the public marketing page (/storage).
import Link from "next/link";
import { prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Badge, Panel, Table, bytes, timeAgo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ConsoleStoragePage() {
  const user = await requireUser();
  const memberships = await prisma.projectMember.findMany({ where: { userId: user.id }, select: { projectId: true } });
  const projectIds = memberships.map((m) => m.projectId);
  const buckets = await prisma.storageBucket.findMany({
    where: { projectId: { in: projectIds }, status: { not: "deleted" } },
    include: { project: { include: { organization: true } } },
    orderBy: { createdAt: "desc" },
  });
  const workspace = buckets[0]?.project.organization.name;
  return (
    <UserShell user={user} workspace={workspace}>
      <div className="page-head">
        <div>
          <h1 className="h1">Storage</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Buckets, files, credentials, and signed URL access.</p>
        </div>
        <Link className="btn" href="/projects">Open project</Link>
      </div>
      <Panel title="All buckets" flush>
        <Table
          columns={["Bucket", "Project", "Status", "Used", "Objects", "Egress", "Created", ""]}
          empty="No storage buckets yet."
          rows={buckets.map((b) => [
            <strong key="n">{b.bucketName}</strong>,
            <Link key="p" href={`/projects/${b.projectId}`}>{b.project.name}</Link>,
            <Badge key="s" status={b.status} />,
            bytes(b.currentStorageBytes),
            b.objectCount.toString(),
            bytes(b.currentEgressBytes),
            timeAgo(b.createdAt),
            <Link key="l" className="btn sm secondary" href={`/projects/${b.projectId}/storage/${b.id}`}>Open</Link>,
          ])}
        />
      </Panel>
    </UserShell>
  );
}
