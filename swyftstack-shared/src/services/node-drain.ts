// NodeDrainService — drain a node by automatically migrating its live
// workloads (apps, databases, static sites) off it. Builds on the existing
// MigrationService (which enqueues migrate_app / migrate_database jobs) and
// ProvisioningPolicyService (which picks a target node for each workload).
//
// Contract:
//   startDrain(nodeId) marks the node draining, enqueues one Migration row +
//   one job per movable workload, excluding the source node from target
//   selection. Migrations are tracked by sourceNodeId so drain progress is
//   derivable from the migrations table — no extra drain-step table.
//
//   drainStatus(nodeId) returns aggregated migration counts for the UI.
//   cancelDrain(nodeId) returns the node to active when nothing is in flight.
import { prisma } from "../db.js";
import { audit } from "../audit.js";
import { migrationService } from "./migration.js";
import { provisioningPolicyService } from "./provisioning-policy.js";

export class NoMigrationTargetError extends Error {
  constructor(public readonly resource: string, public readonly resourceName: string) {
    super(`No healthy target node is available to migrate ${resource} "${resourceName}".`);
    this.name = "NoMigrationTargetError";
  }
}

export class DrainInProgressError extends Error {
  constructor() {
    super("Drain is already in progress for this node.");
    this.name = "DrainInProgressError";
  }
}

interface DrainWorkload {
  kind: "app" | "static" | "database";
  id: string;
  name: string;
}

async function discoverWorkloads(nodeId: string): Promise<DrainWorkload[]> {
  const [apps, databases] = await Promise.all([
    prisma.app.findMany({
      where: { nodeId, status: { notIn: ["suspended"] } },
      select: { id: true, name: true, type: true },
    }),
    prisma.database.findMany({
      where: { nodeId, status: { notIn: ["deleted"] } },
      select: { id: true, name: true },
    }),
  ]);
  return [
    ...apps.map((a) => ({
      kind: a.type === "static" ? ("static" as const) : ("app" as const),
      id: a.id,
      name: a.name,
    })),
    ...databases.map((d) => ({ kind: "database" as const, id: d.id, name: d.name })),
  ];
}

/** Pick a target node for a workload, excluding the source. Returns null
 *  if no healthy alternative exists. Uses the configured provisioning policy
 *  for the resource type and filters out the source node. */
async function pickTargetExcluding(
  resourceType: "app" | "build" | "database" | "static",
  excludeNodeId: string,
): Promise<string | null> {
  const decision = await provisioningPolicyService.selectTarget(resourceType);
  const healthy = decision.candidates.filter(
    (c) => c.healthy && c.targetType === "node" && c.targetId !== excludeNodeId,
  );
  if (healthy.length === 0) return null;
  // Mirror the policy's chosen ordering when possible: if chosen is healthy
  // and not the source, prefer it; otherwise take the lowest-usage healthy.
  if (decision.chosen && decision.chosen.targetType === "node" && decision.chosen.targetId !== excludeNodeId) {
    return decision.chosen.targetId;
  }
  return healthy.sort((a, b) => (a.usagePercent ?? 0) - (b.usagePercent ?? 0))[0].targetId;
}

export interface DrainStatus {
  nodeId: string;
  nodeStatus: string;
  totalWorkloads: number;
  remainingWorkloads: number;
  migrations: {
    id: string;
    resourceType: string;
    resourceId: string | null;
    targetNodeId: string | null;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
  }[];
  blocked: { kind: string; name: string; reason: string }[];
}

export const nodeDrainService = {
  /**
   * Begin draining a node. Idempotent: re-running on a draining node
   * enqueues migrations only for workloads that don't already have an
   * in-flight migration record.
   */
  async startDrain(nodeId: string, actorUserId?: string): Promise<DrainStatus> {
    const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });
    if (node.status !== "draining") {
      await prisma.node.update({ where: { id: nodeId }, data: { status: "draining" } });
      await audit({
        actorType: "admin",
        actorUserId,
        action: "node.drain_started",
        targetType: "node",
        targetId: nodeId,
      });
    }

    const workloads = await discoverWorkloads(nodeId);
    const existing = await prisma.migration.findMany({
      where: {
        sourceNodeId: nodeId,
        status: { in: ["pending", "running", "verifying"] },
      },
      select: { resourceId: true },
    });
    const alreadyQueued = new Set(existing.map((m) => m.resourceId).filter(Boolean) as string[]);
    const blocked: { kind: string; name: string; reason: string }[] = [];

    for (const w of workloads) {
      if (alreadyQueued.has(w.id)) continue;
      const targetType = w.kind === "static" ? "static" : w.kind === "database" ? "database" : "app";
      const target = await pickTargetExcluding(targetType, nodeId);
      if (!target) {
        blocked.push({
          kind: w.kind,
          name: w.name,
          reason: "no healthy target node available (configure another node or relax provisioning targets)",
        });
        continue;
      }
      try {
        if (w.kind === "app") await migrationService.moveApp(w.id, target, actorUserId);
        else if (w.kind === "static") await migrationService.moveStaticSite(w.id, target, actorUserId);
        else await migrationService.moveDatabase(w.id, target, actorUserId);
      } catch (err) {
        blocked.push({ kind: w.kind, name: w.name, reason: String(err) });
      }
    }

    await audit({
      actorType: "admin",
      actorUserId,
      action: "node.drain_enqueued",
      targetType: "node",
      targetId: nodeId,
      metadata: {
        workloads: workloads.length,
        blocked: blocked.length,
        blockedDetail: blocked,
      },
    });

    return this.drainStatus(nodeId);
  },

  async drainStatus(nodeId: string): Promise<DrainStatus> {
    const [node, migrations, workloads] = await Promise.all([
      prisma.node.findUniqueOrThrow({
        where: { id: nodeId },
        select: { id: true, status: true },
      }),
      prisma.migration.findMany({
        where: { sourceNodeId: nodeId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          resourceType: true,
          resourceId: true,
          targetNodeId: true,
          status: true,
          errorMessage: true,
          createdAt: true,
        },
      }),
      discoverWorkloads(nodeId),
    ]);
    const inFlight = migrations.filter((m) =>
      ["pending", "running", "verifying"].includes(m.status),
    );
    return {
      nodeId: node.id,
      nodeStatus: node.status,
      totalWorkloads: workloads.length + inFlight.length,
      remainingWorkloads: workloads.length,
      migrations,
      blocked: [],
    };
  },

  /**
   * Cancel a drain and restore the node to active. Safe only when no
   * migrations are currently running/verifying (those would orphan).
   */
  async cancelDrain(nodeId: string, actorUserId?: string): Promise<void> {
    const inFlight = await prisma.migration.count({
      where: { sourceNodeId: nodeId, status: { in: ["running", "verifying"] } },
    });
    if (inFlight > 0) {
      throw new Error(
        `Cannot cancel drain — ${inFlight} migration(s) are in flight. Wait for them to finish.`,
      );
    }
    await prisma.migration.updateMany({
      where: { sourceNodeId: nodeId, status: "pending" },
      data: { status: "rolled_back", errorMessage: "drain cancelled by admin" },
    });
    await prisma.node.update({ where: { id: nodeId }, data: { status: "active" } });
    await audit({
      actorType: "admin",
      actorUserId,
      action: "node.drain_cancelled",
      targetType: "node",
      targetId: nodeId,
    });
  },

  /**
   * If a drained node has no remaining workloads and all migrations
   * completed, mark it disabled so it stops being picked for new resources.
   * Idempotent.
   */
  async finalizeIfDrained(nodeId: string): Promise<boolean> {
    const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });
    if (node.status !== "draining") return false;
    const [remaining, inFlight] = await Promise.all([
      prisma.app
        .count({ where: { nodeId, status: { notIn: ["suspended"] } } })
        .then(async (apps) =>
          apps + (await prisma.database.count({ where: { nodeId, status: { notIn: ["deleted"] } } })),
        ),
      prisma.migration.count({
        where: { sourceNodeId: nodeId, status: { in: ["pending", "running", "verifying"] } },
      }),
    ]);
    if (remaining > 0 || inFlight > 0) return false;
    await prisma.node.update({ where: { id: nodeId }, data: { status: "disabled" } });
    await audit({
      actorType: "system",
      action: "node.drain_completed",
      targetType: "node",
      targetId: nodeId,
    });
    return true;
  },
};
