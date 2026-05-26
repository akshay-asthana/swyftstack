// NodeDeletionService (§2 / §11) — safe node lifecycle. Admins must never be
// trapped with an undeletable duplicate, yet a node carrying live workloads
// must not be silently destroyed. Lifecycle actions:
//   drain → disable → archive → delete (only when safe)
//   forceDeleteNodeInDev — escape hatch for dev/superadmin, confirmation gated.
import { prisma } from "../db.js";
import { audit } from "../audit.js";
import { env, isProductionEnv } from "../env.js";

export class NodeProtectedError extends Error {
  constructor(action: string) {
    super(`This node is protected and cannot be ${action}. Use force delete in dev mode.`);
    this.name = "NodeProtectedError";
  }
}

export class NodeHasWorkloadsError extends Error {
  constructor(public readonly blocking: BlockingResource[]) {
    super(
      `Node still has ${blocking.length} active workload(s): ` +
        blocking.map((b) => `${b.type} "${b.name}"`).join(", "),
    );
    this.name = "NodeHasWorkloadsError";
  }
}

export interface BlockingResource {
  type: "app" | "database" | "database_cluster" | "domain" | "migration";
  id: string;
  name: string;
  status: string;
}

export interface DeletionCheck {
  ok: boolean;
  reason: string | null;
  blocking: BlockingResource[];
  isProtected: boolean;
}

export const nodeDeletionService = {
  /** Every resource that currently blocks deleting / archiving a node. */
  async listBlockingResources(nodeId: string): Promise<BlockingResource[]> {
    const [apps, databases, clusters, domains, migrations] = await Promise.all([
      prisma.app.findMany({
        where: { nodeId, status: { not: "suspended" } },
        select: { id: true, name: true, status: true },
      }),
      prisma.database.findMany({
        where: { nodeId, status: { not: "deleted" } },
        select: { id: true, name: true, status: true },
      }),
      prisma.databaseCluster.findMany({
        where: { nodeId },
        select: { id: true, name: true, status: true },
      }),
      prisma.domain.findMany({
        where: { targetNodeId: nodeId },
        select: { id: true, domain: true, status: true },
      }),
      prisma.migration.findMany({
        where: {
          status: { in: ["pending", "running", "verifying"] },
          OR: [{ sourceNodeId: nodeId }, { targetNodeId: nodeId }],
        },
        select: { id: true, status: true },
      }),
    ]);
    return [
      ...apps.map((a) => ({ type: "app" as const, id: a.id, name: a.name, status: a.status })),
      ...databases.map((d) => ({ type: "database" as const, id: d.id, name: d.name, status: d.status })),
      ...clusters.map((c) => ({ type: "database_cluster" as const, id: c.id, name: c.name, status: c.status })),
      ...domains.map((d) => ({ type: "domain" as const, id: d.id, name: d.domain, status: d.status })),
      ...migrations.map((m) => ({ type: "migration" as const, id: m.id, name: m.id.slice(0, 8), status: m.status })),
    ];
  },

  /** Can this node be archived / deleted right now, and if not, why not. */
  async canDeleteNode(nodeId: string): Promise<DeletionCheck> {
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, isProtected: true },
    });
    if (!node) {
      return { ok: false, reason: "Node not found.", blocking: [], isProtected: false };
    }
    const blocking = await this.listBlockingResources(nodeId);
    if (node.isProtected) {
      return {
        ok: false,
        reason: "This node is protected. Force delete it in dev mode if you are sure.",
        blocking,
        isProtected: true,
      };
    }
    if (blocking.length > 0) {
      return {
        ok: false,
        reason: `Move or delete ${blocking.length} workload(s) first.`,
        blocking,
        isProtected: false,
      };
    }
    return { ok: true, reason: null, blocking: [], isProtected: false };
  },

  /** Archive a node (reversible) once it has no active workloads. */
  async archiveNode(nodeId: string, actorUserId?: string): Promise<void> {
    const node = await prisma.node.findUniqueOrThrow({
      where: { id: nodeId },
      select: { isProtected: true },
    });
    if (node.isProtected) throw new NodeProtectedError("archived");
    const blocking = await this.listBlockingResources(nodeId);
    if (blocking.length > 0) throw new NodeHasWorkloadsError(blocking);
    await prisma.node.update({ where: { id: nodeId }, data: { status: "archived" } });
    await audit({
      actorType: "admin",
      actorUserId,
      action: "node.archived",
      targetType: "node",
      targetId: nodeId,
    });
  },

  /** Hard-delete a node — only allowed when it is safe (see canDeleteNode). */
  async deleteNode(nodeId: string, actorUserId?: string): Promise<void> {
    const check = await this.canDeleteNode(nodeId);
    if (!check.ok) {
      if (check.isProtected) throw new NodeProtectedError("deleted");
      throw new NodeHasWorkloadsError(check.blocking);
    }
    await prisma.node.delete({ where: { id: nodeId } });
    await audit({
      actorType: "admin",
      actorUserId,
      action: "node.deleted",
      targetType: "node",
      targetId: nodeId,
    });
  },

  /**
   * Force-delete a node, bypassing protection and workload checks. Restricted
   * to non-production environments and requires an explicit `confirm` flag —
   * the dev/admin escape hatch for clearing a stuck duplicate.
   */
  async forceDeleteNodeInDev(
    nodeId: string,
    opts: { confirm: boolean; actorUserId?: string },
  ): Promise<void> {
    if (isProductionEnv()) {
      throw new Error("Force delete is disabled in production.");
    }
    if (!opts.confirm) {
      throw new Error("Force delete requires explicit confirmation.");
    }
    const node = await prisma.node.findUniqueOrThrow({
      where: { id: nodeId },
      select: { name: true, isProtected: true },
    });
    // Dependent apps/databases/clusters have optional node FKs (SetNull) so
    // the row deletes cleanly; their workloads become unscheduled, not lost.
    await prisma.node.delete({ where: { id: nodeId } });
    await audit({
      actorType: "admin",
      actorUserId: opts.actorUserId,
      action: "node.force_deleted",
      targetType: "node",
      targetId: nodeId,
      metadata: { name: node.name, wasProtected: node.isProtected },
    });
  },
};
