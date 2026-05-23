import { prisma } from "../db.js";

export async function reconcileProjectProvisioning(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { status: true } });
  if (!project || ["suspended", "deleted", "over_limit"].includes(project.status)) return;

  const [creatingDatabases, failedDatabases, creatingBuckets, failedBuckets, runningImports, failedImports] =
    await Promise.all([
      prisma.database.count({ where: { projectId, status: "provisioning" } }),
      prisma.database.count({ where: { projectId, status: "failed" } }),
      prisma.storageBucket.count({ where: { projectId, status: "provisioning" } }),
      prisma.storageBucket.count({ where: { projectId, status: "failed" } }),
      prisma.databaseImport.count({
        where: { projectId, status: { in: ["queued", "testing_connection", "estimating_size", "creating_target", "dumping", "uploading_dump_optional", "restoring", "verifying", "switching"] } },
      }),
      prisma.databaseImport.count({ where: { projectId, status: "failed" } }),
    ]);

  const next =
    failedDatabases + failedBuckets + failedImports > 0
      ? "partially_failed"
      : creatingDatabases + creatingBuckets + runningImports > 0
        ? "provisioning"
        : "active";

  if (project.status !== next) {
    await prisma.project.update({ where: { id: projectId }, data: { status: next } });
  }
}
