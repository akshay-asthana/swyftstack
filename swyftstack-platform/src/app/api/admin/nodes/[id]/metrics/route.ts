// Recent node metrics as a plain-number JSON payload — polled by the live
// monitoring charts (§4) every few seconds.
import { prisma } from "swyftstack-shared";
import { authorize } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;

  const node = await prisma.node.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, lastMetricAt: true, lastHeartbeatAt: true },
  });
  if (!node) return Response.json({ error: "not found" }, { status: 404 });

  const rows = await prisma.nodeMetric.findMany({
    where: { nodeId: params.id },
    orderBy: { collectedAt: "desc" },
    take: 60,
  });
  const metrics = rows.reverse().map((m) => ({
    collectedAt: m.collectedAt.toISOString(),
    cpuUsagePercent: m.cpuUsagePercent === null ? null : Number(m.cpuUsagePercent),
    cpuLoad1: m.cpuLoad1 === null ? null : Number(m.cpuLoad1),
    ramUsedBytes: Number(m.ramUsedBytes ?? 0),
    ramTotalBytes: Number(m.ramTotalBytes ?? 0),
    diskUsedBytes: Number(m.diskUsedBytes ?? 0),
    networkRxBytes: Number(m.networkRxBytes ?? 0),
    networkTxBytes: Number(m.networkTxBytes ?? 0),
    containersRunning: m.containersRunning ?? 0,
    containersFailed: m.containersFailed ?? 0,
  }));

  return Response.json({
    status: node.status,
    lastMetricAt: (node.lastMetricAt ?? node.lastHeartbeatAt)?.toISOString() ?? null,
    metrics,
  });
}
