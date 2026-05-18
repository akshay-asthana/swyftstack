import { prisma } from "quickdock-shared";
import { Stat, Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const [users, projects, nodes, failedJobs, latestBackup, latestControlBackup, recentAudit] =
    await Promise.all([
      prisma.user.count(),
      prisma.project.count({ where: { status: "active" } }),
      prisma.node.findMany(),
      prisma.job.count({ where: { status: "failed" } }),
      prisma.databaseBackup.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.controlPlaneBackup.findFirst({ orderBy: { createdAt: "desc" } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    ]);

  const online = nodes.filter((n) => n.status === "active").length;

  return (
    <>
      <h1 className="h1">Overview</h1>
      <p className="sub">Control-plane health at a glance.</p>
      <div className="grid">
        <Stat k="Users" v={users} />
        <Stat k="Active projects" v={projects} />
        <Stat k="Nodes online" v={`${online}/${nodes.length}`} />
        <Stat k="Failed jobs" v={failedJobs} />
        <Stat k="Latest DB backup" v={<Badge status={latestBackup?.status ?? "none"} />} />
        <Stat k="Latest control backup" v={<Badge status={latestControlBackup?.status ?? "none"} />} />
      </div>

      <h2 className="h1" style={{ fontSize: 16, marginTop: 28 }}>Recent audit activity</h2>
      <Table
        columns={["When", "Actor", "Action", "Target"]}
        rows={recentAudit.map((a) => [
          a.createdAt.toISOString().replace("T", " ").slice(0, 19),
          a.actorType,
          a.action,
          `${a.targetType ?? ""} ${a.targetId?.slice(0, 8) ?? ""}`,
        ])}
      />
    </>
  );
}
