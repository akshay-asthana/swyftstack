// Local-dev NodeService. Reports real OS metrics for the local all-in-one node
// and applies missed-heartbeat health rules. A remote node-agent would later
// implement the same interface over HTTPS/mTLS.
import os from "node:os";
import { prisma, type Node } from "../db.js";
import { audit } from "../audit.js";
import type { NodeService, NodeMetricsSample } from "./types.js";

const HEARTBEAT_DEGRADED_MS = 60_000;
const HEARTBEAT_OFFLINE_MS = 180_000;

function localSample(): NodeMetricsSample {
  const load = os.loadavg()[0];
  const cores = os.cpus().length || 1;
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  return {
    cpuUsagePercent: Math.min(100, (load / cores) * 100),
    ramUsedBytes: totalMem - freeMem,
    diskUsedBytes: 0, // disk stats require platform-specific calls; 0 for MVP
    networkRxBytes: 0,
    networkTxBytes: 0,
  };
}

export class ProtectedLocalNodeError extends Error {
  constructor(action: "disable" | "delete") {
    super(`The local control-plane node cannot be ${action === "disable" ? "disabled" : "deleted"}.`);
    this.name = "ProtectedLocalNodeError";
  }
}

export function isLocalControlPlaneNode(node: Pick<Node, "connectionMode" | "provider">): boolean {
  return node.connectionMode === "local" || node.provider === "local";
}

async function assertNodeCanBeDisabled(nodeId: string) {
  const node = await prisma.node.findUniqueOrThrow({
    where: { id: nodeId },
    select: { connectionMode: true, provider: true },
  });
  if (isLocalControlPlaneNode(node)) throw new ProtectedLocalNodeError("disable");
}

export const localNodeService: NodeService = {
  async collectMetrics(nodeId: string) {
    const sample = localSample();
    await prisma.nodeMetric.create({
      data: {
        nodeId,
        cpuUsagePercent: sample.cpuUsagePercent,
        ramUsedBytes: BigInt(Math.round(sample.ramUsedBytes)),
        diskUsedBytes: BigInt(sample.diskUsedBytes),
        networkRxBytes: BigInt(sample.networkRxBytes),
        networkTxBytes: BigInt(sample.networkTxBytes),
      },
    });
    await prisma.node.update({
      where: { id: nodeId },
      data: { lastHeartbeatAt: new Date() },
    });
    return sample;
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

  async reconcileHealth() {
    const now = Date.now();
    const nodes = await prisma.node.findMany({
      where: { status: { in: ["active", "degraded"] } },
    });
    for (const node of nodes) {
      const last = node.lastHeartbeatAt?.getTime() ?? 0;
      const age = now - last;
      let next: "active" | "degraded" | "offline" = "active";
      if (age > HEARTBEAT_OFFLINE_MS) next = "offline";
      else if (age > HEARTBEAT_DEGRADED_MS) next = "degraded";
      if (next !== node.status) {
        await prisma.node.update({ where: { id: node.id }, data: { status: next } });
        await audit({
          actorType: "system",
          action: `node.${next}`,
          targetType: "node",
          targetId: node.id,
          metadata: { previous: node.status, heartbeatAgeMs: age },
        });
      }
    }
  },

  async drain(nodeId: string) {
    await prisma.node.update({ where: { id: nodeId }, data: { status: "draining" } });
    await audit({ actorType: "admin", action: "node.drain", targetType: "node", targetId: nodeId });
  },

  async disable(nodeId: string) {
    await assertNodeCanBeDisabled(nodeId);
    await prisma.node.update({ where: { id: nodeId }, data: { status: "disabled" } });
    await audit({ actorType: "admin", action: "node.disable", targetType: "node", targetId: nodeId });
  },
};
