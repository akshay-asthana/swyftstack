import { prisma } from "quickdock-shared";
import { Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const apps = await prisma.app.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: true, node: true, _count: { select: { deployments: true } } },
  });
  return (
    <>
      <h1 className="h1">Apps</h1>
      <p className="sub">Each dynamic app runs in its own container; static sites serve build output.</p>
      <Table
        columns={["App", "Project", "Type", "Status", "Node", "Deployments", "Domain"]}
        rows={apps.map((a) => [
          <strong key="n">{a.name}</strong>,
          a.project.name,
          a.type,
          <Badge key="s" status={a.status} />,
          a.node?.name ?? "unassigned",
          a._count.deployments,
          a.defaultDomain ?? "—",
        ])}
      />
    </>
  );
}
