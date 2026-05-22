// Metric rollup engine (§1). Pre-aggregates raw samples + usage_events into
// metric_rollups so dashboard pages read a handful of rows instead of scanning
// raw time-series. Runs periodically; every run recomputes the *current*
// hourly + daily buckets, so the upserts are idempotent.
import { prisma } from "./db.js";

/** Map a raw usage_type onto its dashboard metric_type. */
const USAGE_TO_METRIC: Record<string, string> = {
  node_network_in_bytes: "network_in_bytes",
  node_network_out_bytes: "network_out_bytes",
  app_network_in_bytes: "network_in_bytes",
  app_network_out_bytes: "network_out_bytes",
  storage_network_in_bytes: "network_in_bytes",
  storage_network_out_bytes: "network_out_bytes",
  database_network_in_bytes: "network_in_bytes",
  database_network_out_bytes: "network_out_bytes",
  app_runtime_vcpu_seconds: "app_cpu_seconds",
  build_vcpu_seconds: "build_cpu_seconds",
  database_storage_bytes: "database_size_bytes",
  object_storage_bytes: "storage_used_bytes",
};

function hourBucket(d = new Date()): Date {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  return x;
}
function dayBucket(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function upsertRollup(args: {
  period: "hourly" | "daily" | "billing";
  bucketStart: Date;
  scopeType: string;
  scopeId: string | null;
  metricType: string;
  sum: bigint;
  min?: bigint | null;
  max?: bigint | null;
  avg?: number | null;
  samples: number;
  unit: string;
}) {
  await prisma.metricRollup.upsert({
    where: {
      period_bucketStart_scopeType_scopeId_metricType: {
        period: args.period,
        bucketStart: args.bucketStart,
        scopeType: args.scopeType,
        scopeId: args.scopeId as unknown as string,
        metricType: args.metricType,
      },
    },
    update: {
      sum: args.sum, min: args.min ?? null, max: args.max ?? null,
      avg: args.avg ?? null, samples: args.samples, unit: args.unit,
    },
    create: {
      period: args.period, bucketStart: args.bucketStart,
      scopeType: args.scopeType, scopeId: args.scopeId,
      metricType: args.metricType, sum: args.sum,
      min: args.min ?? null, max: args.max ?? null,
      avg: args.avg ?? null, samples: args.samples, unit: args.unit,
    },
  });
}

/** Roll node_metrics gauge samples (cpu/ram/disk) into per-node + platform rows. */
async function rollNodeGauges(period: "hourly" | "daily", bucketStart: Date, windowEnd: Date) {
  const samples = await prisma.nodeMetric.findMany({
    where: { collectedAt: { gte: bucketStart, lt: windowEnd } },
    select: {
      nodeId: true, cpuUsagePercent: true, ramUsedBytes: true,
      diskUsedBytes: true, networkRxBytes: true, networkTxBytes: true,
      containersRunning: true, containersFailed: true,
    },
  });
  if (samples.length === 0) return;

  type Acc = { cpu: number[]; ram: bigint[]; disk: bigint[]; run: number[]; fail: number[] };
  const byNode = new Map<string, Acc>();
  const fresh = (): Acc => ({ cpu: [], ram: [], disk: [], run: [], fail: [] });
  for (const s of samples) {
    const a = byNode.get(s.nodeId) ?? fresh();
    if (s.cpuUsagePercent != null) a.cpu.push(Number(s.cpuUsagePercent));
    if (s.ramUsedBytes != null) a.ram.push(s.ramUsedBytes);
    if (s.diskUsedBytes != null) a.disk.push(s.diskUsedBytes);
    if (s.containersRunning != null) a.run.push(s.containersRunning);
    if (s.containersFailed != null) a.fail.push(s.containersFailed);
    byNode.set(s.nodeId, a);
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const avgBig = (xs: bigint[]) =>
    xs.length ? xs.reduce((s, x) => s + x, BigInt(0)) / BigInt(xs.length) : BigInt(0);
  const maxBig = (xs: bigint[]) => xs.reduce((m, x) => (x > m ? x : m), BigInt(0));

  const platform = fresh();
  for (const [nodeId, a] of byNode) {
    platform.cpu.push(...a.cpu);
    platform.ram.push(...a.ram);
    platform.disk.push(...a.disk);
    platform.run.push(...a.run);
    platform.fail.push(...a.fail);
    const rows: { metricType: string; sum: bigint; avg: number; max: bigint; unit: string }[] = [
      { metricType: "cpu_usage_percent", sum: BigInt(Math.round(avg(a.cpu))), avg: avg(a.cpu), max: BigInt(Math.round(Math.max(0, ...a.cpu))), unit: "percent" },
      { metricType: "ram_used_bytes", sum: avgBig(a.ram), avg: Number(avgBig(a.ram)), max: maxBig(a.ram), unit: "bytes" },
      { metricType: "disk_used_bytes", sum: avgBig(a.disk), avg: Number(avgBig(a.disk)), max: maxBig(a.disk), unit: "bytes" },
      { metricType: "containers_running", sum: BigInt(Math.round(avg(a.run))), avg: avg(a.run), max: BigInt(Math.max(0, ...a.run)), unit: "count" },
      { metricType: "containers_failed", sum: BigInt(Math.round(avg(a.fail))), avg: avg(a.fail), max: BigInt(Math.max(0, ...a.fail)), unit: "count" },
    ];
    for (const r of rows) {
      await upsertRollup({
        period, bucketStart, scopeType: "node", scopeId: nodeId,
        metricType: r.metricType, sum: r.sum, max: r.max, avg: r.avg,
        samples: a.cpu.length, unit: r.unit,
      });
    }
  }

  // Platform aggregate row.
  await upsertRollup({
    period, bucketStart, scopeType: "platform", scopeId: null,
    metricType: "cpu_usage_percent", sum: BigInt(Math.round(avg(platform.cpu))),
    avg: avg(platform.cpu), samples: platform.cpu.length, unit: "percent",
  });
  await upsertRollup({
    period, bucketStart, scopeType: "platform", scopeId: null,
    metricType: "ram_used_bytes", sum: avgBig(platform.ram),
    avg: Number(avgBig(platform.ram)), samples: platform.ram.length, unit: "bytes",
  });
  await upsertRollup({
    period, bucketStart, scopeType: "platform", scopeId: null,
    metricType: "disk_used_bytes", sum: avgBig(platform.disk),
    avg: Number(avgBig(platform.disk)), samples: platform.disk.length, unit: "bytes",
  });
}

/** Roll usage_events into summed rollups for every scope dimension. */
async function rollUsageEvents(period: "hourly" | "daily", bucketStart: Date, windowEnd: Date) {
  const where = { recordedAt: { gte: bucketStart, lt: windowEnd } };

  const dimensions: { scopeType: string; field: "organizationId" | "userId" | "projectId" | "appId" | "databaseId" | "bucketId" | "sourceNodeId" }[] = [
    { scopeType: "organization", field: "organizationId" },
    { scopeType: "user", field: "userId" },
    { scopeType: "project", field: "projectId" },
    { scopeType: "app", field: "appId" },
    { scopeType: "database", field: "databaseId" },
    { scopeType: "bucket", field: "bucketId" },
    { scopeType: "node", field: "sourceNodeId" },
  ];

  for (const dim of dimensions) {
    const grouped = await prisma.usageEvent.groupBy({
      by: ["usageType", dim.field],
      where,
      _sum: { quantity: true },
      _count: { _all: true },
    });
    for (const g of grouped) {
      const scopeId = g[dim.field] as string | null;
      if (!scopeId) continue;
      const metricType = USAGE_TO_METRIC[g.usageType] ?? g.usageType;
      const sum = g._sum.quantity ?? BigInt(0);
      await upsertRollup({
        period, bucketStart, scopeType: dim.scopeType, scopeId,
        metricType, sum, samples: g._count._all,
        unit: metricType.endsWith("_bytes") ? "bytes" : "count",
      });
    }
  }

  // Platform-wide totals.
  const platform = await prisma.usageEvent.groupBy({
    by: ["usageType"],
    where,
    _sum: { quantity: true },
    _count: { _all: true },
  });
  for (const g of platform) {
    const metricType = USAGE_TO_METRIC[g.usageType] ?? g.usageType;
    await upsertRollup({
      period, bucketStart, scopeType: "platform", scopeId: null,
      metricType, sum: g._sum.quantity ?? BigInt(0), samples: g._count._all,
      unit: metricType.endsWith("_bytes") ? "bytes" : "count",
    });
  }
}

/**
 * Recompute the current hourly + daily metric_rollups. Idempotent: safe to run
 * as often as the scheduler likes.
 */
export async function rollUpMetrics(): Promise<{ hourly: Date; daily: Date }> {
  const now = new Date();
  const hb = hourBucket(now);
  const db = dayBucket(now);
  const hourEnd = new Date(hb.getTime() + 3_600_000);
  const dayEnd = new Date(db.getTime() + 86_400_000);

  await rollNodeGauges("hourly", hb, hourEnd);
  await rollUsageEvents("hourly", hb, hourEnd);
  await rollNodeGauges("daily", db, dayEnd);
  await rollUsageEvents("daily", db, dayEnd);

  return { hourly: hb, daily: db };
}
