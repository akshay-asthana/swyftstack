import { revalidatePath } from "next/cache";
import { prisma, enqueueJob } from "swyftstack-shared";
import { Table, Badge, bytes } from "@/components/ui";

export const dynamic = "force-dynamic";

async function controlBackup() {
  "use server";
  await enqueueJob("backup_control_db", {}, { priority: 10 });
  revalidatePath("/backups");
}

export default async function BackupsPage() {
  const [dbBackups, controlBackups] = await Promise.all([
    prisma.databaseBackup.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { database: true },
    }),
    prisma.controlPlaneBackup.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return (
    <>
      <h1 className="h1">Backups</h1>
      <p className="sub">Old backups are only pruned after a newer one is verified.</p>

      <div className="toolbar">
        <h2 className="h1" style={{ fontSize: 16, margin: 0 }}>Control-plane DB (every 6h)</h2>
        <form action={controlBackup} className="right">
          <button className="btn">Trigger control backup</button>
        </form>
      </div>
      <Table
        columns={["Created", "Status", "Size", "Checksum", "Expires"]}
        rows={controlBackups.map((b) => [
          b.createdAt.toISOString().slice(0, 19).replace("T", " "),
          <Badge key="s" status={b.status} />,
          bytes(b.sizeBytes),
          b.checksum?.slice(0, 12) ?? "—",
          b.expiresAt?.toISOString().slice(0, 10) ?? "—",
        ])}
      />

      <h2 className="h1" style={{ fontSize: 16, marginTop: 24 }}>Database backups</h2>
      <Table
        columns={["Database", "Status", "Type", "Provider", "Size", "Verified at"]}
        rows={dbBackups.map((b) => [
          <code key="n">{b.database.dbName}</code>,
          <Badge key="s" status={b.status} />,
          b.backupType,
          b.storageProvider,
          bytes(b.sizeBytes),
          b.completedAt?.toISOString().slice(0, 19).replace("T", " ") ?? "—",
        ])}
      />
    </>
  );
}
