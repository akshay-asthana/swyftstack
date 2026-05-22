import { prisma } from "swyftstack-shared";
import { Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MigrationsPage() {
  const migrations = await prisma.migration.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { project: true, sourceNode: true, targetNode: true },
  });
  return (
    <>
      <h1 className="h1">Migrations</h1>
      <p className="sub">Workload moves between nodes. Source kept until verified; rollback supported.</p>
      <Table
        columns={["Resource", "Project", "Strategy", "Source", "Target", "Status", "Created"]}
        rows={migrations.map((m) => [
          `${m.resourceType} ${m.resourceId?.slice(0, 8) ?? ""}`,
          m.project?.name ?? "—",
          m.strategy,
          m.sourceNode?.name ?? "—",
          m.targetNode?.name ?? "—",
          <Badge key="s" status={m.status} />,
          m.createdAt.toISOString().slice(0, 19).replace("T", " "),
        ])}
      />
    </>
  );
}
