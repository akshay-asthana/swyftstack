import { prisma } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const [users, projects, nodes, failedJobs, latestBackup] = await Promise.all([
    prisma.user.count(),
    prisma.project.count({ where: { status: "active" } }),
    prisma.node.findMany({ select: { status: true } }),
    prisma.job.count({ where: { status: "failed" } }),
    prisma.databaseBackup.findFirst({ orderBy: { createdAt: "desc" }, select: { status: true } }),
  ]);
  return json({
    users,
    activeProjects: projects,
    nodesOnline: nodes.filter((n) => n.status === "active").length,
    nodesTotal: nodes.length,
    failedJobs,
    latestBackupStatus: latestBackup?.status ?? null,
  });
}
