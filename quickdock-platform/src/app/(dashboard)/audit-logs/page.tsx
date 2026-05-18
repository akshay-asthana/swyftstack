import { prisma } from "quickdock-shared";
import { Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim();
  const logs = await prisma.auditLog.findMany({
    where: q ? { action: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: true },
  });
  return (
    <>
      <h1 className="h1">Audit Logs</h1>
      <p className="sub">Append-only record of admin/system actions.</p>
      <form className="toolbar" method="get">
        <input name="q" placeholder="Filter by action…" defaultValue={q} style={{ maxWidth: 280 }} />
        <button className="btn secondary">Search</button>
      </form>
      <Table
        columns={["When", "Actor", "Type", "Action", "Target", "Metadata"]}
        rows={logs.map((l) => [
          l.createdAt.toISOString().slice(0, 19).replace("T", " "),
          l.actor?.email ?? "—",
          l.actorType,
          l.action,
          `${l.targetType ?? ""} ${l.targetId?.slice(0, 8) ?? ""}`,
          <span key="m" className="small">{JSON.stringify(l.metadata).slice(0, 80)}</span>,
        ])}
      />
    </>
  );
}
