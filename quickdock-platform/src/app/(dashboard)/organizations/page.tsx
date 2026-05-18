import { prisma } from "quickdock-shared";
import { Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: true,
      subscriptions: { include: { plan: true } },
      _count: { select: { projects: true, members: true } },
    },
  });
  return (
    <>
      <h1 className="h1">Organizations</h1>
      <p className="sub">Billing + ownership boundary. Plans and overrides apply at this scope.</p>
      <Table
        columns={["Name", "Owner", "Plan", "Status", "Projects", "Members"]}
        rows={orgs.map((o) => [
          o.name,
          o.owner?.email ?? "—",
          o.subscriptions[0]?.plan.name ?? "—",
          <Badge key="s" status={o.status} />,
          o._count.projects,
          o._count.members,
        ])}
      />
    </>
  );
}
