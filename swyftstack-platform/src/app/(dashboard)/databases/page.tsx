import { revalidatePath } from "next/cache";
import { prisma, enqueueJob, audit } from "swyftstack-shared";
import { Table, Badge, bytes } from "@/components/ui";

export const dynamic = "force-dynamic";

async function backupNow(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await enqueueJob("backup_database", { databaseId: id }, { priority: 50 });
  await audit({ actorType: "admin", action: "backup.requested", targetType: "database", targetId: id });
  revalidatePath("/databases");
}

export default async function DatabasesPage() {
  const dbs = await prisma.database.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: true, node: true, _count: { select: { backups: true } } },
  });
  return (
    <>
      <h1 className="h1">Databases</h1>
      <p className="sub">Isolated Postgres per project — separate db/user/password, no superuser.</p>
      <Table
        columns={["DB name", "Project", "Status", "Node", "Size", "Limit", "Backups", "Action"]}
        rows={dbs.map((d) => [
          <code key="n">{d.dbName}</code>,
          d.project.name,
          <Badge key="s" status={d.status} />,
          d.node?.name ?? "unassigned",
          bytes(d.currentSizeBytes),
          bytes(d.storageLimitBytes),
          d._count.backups,
          <form key="a" action={backupNow}>
            <input type="hidden" name="id" value={d.id} />
            <button className="btn secondary">Backup now</button>
          </form>,
        ])}
      />
    </>
  );
}
