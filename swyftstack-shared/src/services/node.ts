// Local-dev NodeService. Reports real OS metrics for the local all-in-one node
// and applies missed-heartbeat health rules. A remote node-agent would later
// implement the same interface over HTTPS/mTLS.
import os from "node:os";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { prisma, type Node } from "../db.js";
import { audit } from "../audit.js";
import { NODE_STALE_MS, NODE_OFFLINE_MS, LOCAL_NODE_KEY } from "../constants.js";
import type { NodeService, NodeMetricsSample } from "./types.js";

function execCapture(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 6000 }, (err, stdout) => resolve(err ? "" : stdout.toString()));
  });
}

/** Count running / failed Docker containers on the local host (best effort). */
async function dockerContainerCounts(): Promise<{
  running: number | null;
  failed: number | null;
  ok: boolean;
}> {
  const running = await execCapture("docker", ["ps", "--format", "{{.Status}}"]);
  if (!running) {
    // `docker ps` of a healthy daemon with zero containers still prints nothing
    // on stdout but exits 0 — distinguish that from a missing daemon.
    const info = await execCapture("docker", ["info", "--format", "{{.ServerVersion}}"]);
    if (!info) return { running: null, failed: null, ok: false };
    return { running: 0, failed: 0, ok: true };
  }
  const all = await execCapture("docker", ["ps", "-a", "--format", "{{.Status}}"]);
  const runningCount = running.split("\n").filter((l) => l.trim()).length;
  const failedCount = all
    .split("\n")
    .filter((l) => /exited \([1-9]/i.test(l) || /unhealthy/i.test(l)).length;
  return { running: runningCount, failed: failedCount, ok: true };
}

async function localDiskBytes(): Promise<{ total: bigint; used: bigint }> {
  try {
    const sf = await fs.statfs("/");
    const total = BigInt(sf.bsize) * BigInt(sf.blocks);
    const free = BigInt(sf.bsize) * BigInt(sf.bavail);
    return { total, used: total - free };
  } catch {
    return { total: BigInt(0), used: BigInt(0) };
  }
}

function localSample(): NodeMetricsSample {
  const load = os.loadavg()[0];
  const cores = os.cpus().length || 1;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  return {
    cpuUsagePercent: Math.min(100, (load / cores) * 100),
    ramUsedBytes: totalMem - freeMem,
    diskUsedBytes: 0, // filled in from statfs below
    networkRxBytes: 0,
    networkTxBytes: 0,
  };
}

/** True for the local control-plane / dev node (used to pick local discovery). */
export function isLocalControlPlaneNode(
  node: Partial<Pick<Node, "connectionMode" | "provider" | "isLocal" | "nodeKey">>,
): boolean {
  return (
    node.isLocal === true ||
    node.nodeKey === LOCAL_NODE_KEY ||
    node.connectionMode === "local" ||
    node.provider === "local" ||
    node.provider === "local_dev"
  );
}

export const localNodeService: NodeService = {
  async collectMetrics(nodeId: string) {
    const sample = localSample();
    const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });
    const [disk, containers] = await Promise.all([localDiskBytes(), dockerContainerCounts()]);
    const load = os.loadavg();
    const hasDbRole = node.roles.includes("database");
    const hasProxyRole = node.roles.includes("proxy");

    await prisma.nodeMetric.create({
      data: {
        nodeId,
        cpuUsagePercent: sample.cpuUsagePercent,
        cpuLoad1: load[0],
        cpuLoad5: load[1],
        cpuLoad15: load[2],
        ramTotalBytes: BigInt(os.totalmem()),
        ramUsedBytes: BigInt(Math.round(sample.ramUsedBytes)),
        diskTotalBytes: disk.total,
        diskUsedBytes: disk.used,
        networkRxBytes: BigInt(sample.networkRxBytes),
        networkTxBytes: BigInt(sample.networkTxBytes),
        uptimeSeconds: BigInt(Math.round(os.uptime())),
        containersRunning: containers.running,
        containersFailed: containers.failed,
        dockerOk: containers.ok,
        // DB/proxy process health: derived from Docker availability for the
        // local all-in-one node. A real node-agent probes the services directly.
        databaseOk: hasDbRole ? containers.ok : null,
        proxyOk: hasProxyRole ? containers.ok : null,
      },
    });
    await prisma.node.update({
      where: { id: nodeId },
      data: {
        lastHeartbeatAt: new Date(),
        // last_metric_at drives staleness (§4) — distinct from agent heartbeat.
        lastMetricAt: new Date(),
        dockerInstalled: containers.ok || node.dockerInstalled,
        uptimeSeconds: BigInt(Math.round(os.uptime())),
      },
    });
    return { ...sample, diskUsedBytes: Number(disk.used) };
  },

  async recordHeartbeat(nodeId: string, agentVersion?: string) {
    await prisma.node.update({
      where: { id: nodeId },
      data: {
        lastHeartbeatAt: new Date(),
        agentVersion: agentVersion ?? undefined,
        status: "active",
      },
    });
  },

  /**
   * Re-evaluate node health from metric/heartbeat freshness (§4):
   *   fresh  -> active
   *   stale  -> degraded   (warning; older than NODE_STALE_MS)
   *   gone   -> offline    (older than NODE_OFFLINE_MS)
   * Offline nodes are included so a node RECOVERS once metrics resume.
   */
  async reconcileHealth() {
    await markStaleNodes();
  },

  async drain(nodeId: string) {
    await prisma.node.update({ where: { id: nodeId }, data: { status: "draining" } });
    await audit({ actorType: "admin", action: "node.drain", targetType: "node", targetId: nodeId });
  },

  // Disable is a reversible, safe lifecycle action — allowed on ANY node,
  // including the local control-plane node (§2). Hard delete is gated
  // separately by NodeDeletionService via the `isProtected` flag.
  async disable(nodeId: string) {
    await prisma.node.update({ where: { id: nodeId }, data: { status: "disabled" } });
    await audit({ actorType: "admin", action: "node.disable", targetType: "node", targetId: nodeId });
  },
};

/**
 * Flip nodes between active / degraded / offline based on how fresh their last
 * metric (or heartbeat) is. Exported as NodeMetricsService.markStaleNodes (§11).
 */
export async function markStaleNodes(): Promise<{ checked: number; changed: number }> {
  const now = Date.now();
  const nodes = await prisma.node.findMany({
    where: { status: { in: ["active", "degraded", "offline"] } },
  });
  let changed = 0;
  for (const node of nodes) {
    const last = (node.lastMetricAt ?? node.lastHeartbeatAt)?.getTime() ?? 0;
    const age = now - last;
    let next: "active" | "degraded" | "offline" = "active";
    if (age > NODE_OFFLINE_MS) next = "offline";
    else if (age > NODE_STALE_MS) next = "degraded";
    if (next !== node.status) {
      await prisma.node.update({ where: { id: node.id }, data: { status: next } });
      await audit({
        actorType: "system",
        action: `node.${next}`,
        targetType: "node",
        targetId: node.id,
        metadata: { previous: node.status, metricAgeMs: age },
      });
      changed++;
    }
  }
  return { checked: nodes.length, changed };
}
