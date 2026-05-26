// Shared usage/resource aggregation for admin detail pages (§1, §12).
// Storage *sizes* are read from resource tables (current gauges); cumulative
// "flow" metrics (vCPU-seconds, bandwidth, egress) are summed from usage_events.
import { prisma, BANDWIDTH_IN_TYPES, BANDWIDTH_OUT_TYPES } from "swyftstack-shared";

/** Start of the current calendar month — the default billing period. */
export function monthStart(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1);
}

export interface Agg {
  projects: number;
  apps: number;
  runningApps: number;
  failedApps: number;
  databases: number;
  buckets: number;
  backups: number;
  dbStorageBytes: number;
  objectStorageBytes: number;
  egressUsedBytes: number;
  vcpuSeconds: number;
  buildVcpuSeconds: number;
  bandwidthInBytes: number;
  bandwidthOutBytes: number;
}

const EMPTY: Agg = {
  projects: 0, apps: 0, runningApps: 0, failedApps: 0, databases: 0, buckets: 0,
  backups: 0, dbStorageBytes: 0, objectStorageBytes: 0, egressUsedBytes: 0,
  vcpuSeconds: 0, buildVcpuSeconds: 0, bandwidthInBytes: 0, bandwidthOutBytes: 0,
};

/** Aggregate usage + resource counts across an explicit set of projects. */
export async function aggregateForProjects(projectIds: string[], since: Date): Promise<Agg> {
  if (projectIds.length === 0) return { ...EMPTY };
  const pIn = { in: projectIds };

  const [apps, runningApps, failedApps, dbs, dbSize, buckets, bucketAgg, backups, usage] =
    await Promise.all([
      prisma.app.count({ where: { projectId: pIn } }),
      prisma.app.count({ where: { projectId: pIn, status: "running" } }),
      prisma.app.count({ where: { projectId: pIn, status: "failed" } }),
      prisma.database.count({ where: { projectId: pIn, status: { not: "deleted" } } }),
      prisma.database.aggregate({ where: { projectId: pIn, status: { not: "deleted" } }, _sum: { currentSizeBytes: true } }),
      prisma.storageBucket.count({ where: { projectId: pIn, status: { not: "deleted" } } }),
      prisma.storageBucket.aggregate({
        where: { projectId: pIn, status: { not: "deleted" } },
        _sum: { currentStorageBytes: true, currentEgressBytes: true },
      }),
      prisma.databaseBackup.count({ where: { database: { projectId: pIn } } }),
      prisma.usageEvent.groupBy({
        by: ["usageType"],
        where: { projectId: pIn, recordedAt: { gte: since } },
        _sum: { quantity: true },
      }),
    ]);

  const sum = (type: string) =>
    Number(usage.find((u) => u.usageType === type)?._sum.quantity ?? 0);
  const sumMany = (types: readonly string[]) =>
    types.reduce((s, t) => s + sum(t), 0);

  return {
    projects: projectIds.length,
    apps, runningApps, failedApps,
    databases: dbs,
    buckets,
    backups,
    dbStorageBytes: Number(dbSize._sum.currentSizeBytes ?? 0),
    objectStorageBytes: Number(bucketAgg._sum.currentStorageBytes ?? 0),
    egressUsedBytes: Number(bucketAgg._sum.currentEgressBytes ?? 0) + sum("object_egress_bytes"),
    vcpuSeconds: sum("app_runtime_vcpu_seconds"),
    buildVcpuSeconds: sum("build_vcpu_seconds"),
    bandwidthInBytes: sumMany(BANDWIDTH_IN_TYPES),
    bandwidthOutBytes: sumMany(BANDWIDTH_OUT_TYPES),
  };
}

/** Aggregate across all projects owned by an organization. */
export async function aggregateForOrg(organizationId: string, since: Date): Promise<Agg> {
  const projects = await prisma.project.findMany({
    where: { organizationId, status: { not: "deleted" } },
    select: { id: true },
  });
  return aggregateForProjects(projects.map((p) => p.id), since);
}

/** Aggregate across every organization a user owns. */
export async function aggregateForUser(userId: string, since: Date): Promise<Agg> {
  const orgs = await prisma.organization.findMany({
    where: { ownerUserId: userId },
    select: { id: true },
  });
  const projects = await prisma.project.findMany({
    where: { organizationId: { in: orgs.map((o) => o.id) }, status: { not: "deleted" } },
    select: { id: true },
  });
  return aggregateForProjects(projects.map((p) => p.id), since);
}

export function vcpuHours(seconds: number): string {
  return (seconds / 3600).toFixed(1);
}
