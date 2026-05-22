// NodeDiscoveryService (§1 / §11) — owns *stable node identity*.
//
// Every node carries a stable `nodeKey`. The local control-plane node is
// always `local-dev`; remote nodes derive their key from the strongest
// available signal (agent id > machine-id > provider instance id >
// hostname+provider+public-ip). Because identity is stable, re-running the
// seed or node discovery UPSERTS the same row instead of creating a duplicate.
import os from "node:os";
import { prisma, type Node } from "../db.js";
import { audit } from "../audit.js";
import { LOCAL_NODE_KEY, NODE_ROLES } from "../constants.js";

export interface StableIdentity {
  nodeKey?: string | null;
  agentId?: string | null;
  machineId?: string | null;
  hostname?: string | null;
  provider?: string | null;
  publicIp?: string | null;
  providerInstanceId?: string | null;
}

/**
 * Derive a stable node key from the strongest identity signal available.
 * Never falls back to the display name alone (names are not stable).
 */
export function deriveNodeKey(id: StableIdentity): string | null {
  if (id.nodeKey) return id.nodeKey;
  if (id.agentId) return `agent:${id.agentId}`;
  if (id.machineId) return `machine:${id.machineId}`;
  if (id.providerInstanceId) {
    return `instance:${id.provider ?? "x"}:${id.providerInstanceId}`;
  }
  if (id.hostname && id.provider && id.publicIp) {
    return `host:${id.provider}:${id.hostname}:${id.publicIp}`;
  }
  return null;
}

/** True for any row that represents the local control-plane / dev machine. */
export function looksLikeLocalNode(
  node: Pick<Node, "isLocal" | "nodeKey" | "connectionMode" | "provider">,
): boolean {
  return (
    node.isLocal ||
    node.nodeKey === LOCAL_NODE_KEY ||
    node.connectionMode === "local" ||
    node.provider === "local" ||
    node.provider === "local_dev"
  );
}

/** Find an existing node by any stable-identity signal (not by name). */
export async function findNodeByIdentity(id: StableIdentity): Promise<Node | null> {
  const or: Record<string, string>[] = [];
  if (id.nodeKey) or.push({ nodeKey: id.nodeKey });
  if (id.agentId) or.push({ agentId: id.agentId });
  if (id.machineId) or.push({ machineId: id.machineId });
  if (or.length === 0) return null;
  return prisma.node.findFirst({ where: { OR: or } });
}

async function workloadCount(nodeId: string): Promise<number> {
  const node = await prisma.node.findUnique({
    where: { id: nodeId },
    include: {
      _count: { select: { apps: true, databases: true, databaseClusters: true } },
    },
  });
  if (!node) return 0;
  return node._count.apps + node._count.databases + node._count.databaseClusters;
}

export const nodeDiscoveryService = {
  deriveNodeKey,

  /**
   * Upsert a node by stable identity. If a node with the same nodeKey /
   * agentId / machineId exists it is UPDATED; otherwise a new node is created.
   * This is the single safe entry point — never blind-create a node.
   */
  async upsertNodeByStableIdentity(
    identity: StableIdentity,
    data: Omit<Parameters<typeof prisma.node.create>[0]["data"], "nodeKey">,
  ): Promise<{ node: Node; created: boolean }> {
    const nodeKey = deriveNodeKey(identity);
    const existing = await findNodeByIdentity({ ...identity, nodeKey });
    if (existing) {
      const node = await prisma.node.update({
        where: { id: existing.id },
        data: {
          ...data,
          nodeKey: nodeKey ?? existing.nodeKey,
          agentId: identity.agentId ?? existing.agentId,
          machineId: identity.machineId ?? existing.machineId,
        },
      });
      return { node, created: false };
    }
    const node = await prisma.node.create({
      data: {
        ...data,
        nodeKey,
        agentId: identity.agentId ?? null,
        machineId: identity.machineId ?? null,
      },
    });
    return { node, created: true };
  },

  /**
   * Idempotently register the single local control-plane node. Re-running this
   * (or the seed) updates the existing `local-dev` node — it never creates a
   * second one. Pre-existing local-looking rows are folded into this one.
   */
  async registerLocalNode(): Promise<{
    node: Node;
    created: boolean;
    archivedDuplicates: string[];
    blockedDuplicates: { id: string; name: string; workloads: number }[];
  }> {
    const { archivedDuplicates, blockedDuplicates, canonicalId } =
      await this.dedupeLocalNodes();

    const capacity = {
      cpuCores: os.cpus().length || 2,
      ramBytes: BigInt(os.totalmem()),
      diskBytes: BigInt(100) * BigInt(1024) ** BigInt(3),
    };
    const base = {
      name: "local-dev",
      provider: "local",
      publicIp: "127.0.0.1",
      privateIp: "127.0.0.1",
      connectionMode: "local",
      region: "local",
      status: "active" as const,
      isLocal: true,
      isProtected: true,
      hostname: os.hostname(),
      agentVersion: "local-dev",
      lastHeartbeatAt: new Date(),
    };

    let node: Node;
    let created = false;
    if (canonicalId) {
      node = await prisma.node.update({
        where: { id: canonicalId },
        data: { ...base, nodeKey: LOCAL_NODE_KEY },
      });
    } else {
      node = await prisma.node.create({
        data: {
          ...base,
          ...capacity,
          nodeKey: LOCAL_NODE_KEY,
          roles: [...NODE_ROLES],
          lastDiscoveredAt: new Date(),
        },
      });
      created = true;
    }
    return { node, created, archivedDuplicates, blockedDuplicates };
  },

  /**
   * Collapse duplicate local nodes onto one canonical row. The canonical node
   * is the one already keyed `local-dev`, else the one with the most workloads,
   * else the oldest. Empty duplicates are ARCHIVED (reversible); duplicates
   * with workloads are left in place and reported so the admin can migrate.
   */
  async dedupeLocalNodes(): Promise<{
    canonicalId: string | null;
    archivedDuplicates: string[];
    blockedDuplicates: { id: string; name: string; workloads: number }[];
  }> {
    const all = await prisma.node.findMany({ orderBy: { createdAt: "asc" } });
    const locals = all.filter((n) => looksLikeLocalNode(n));
    if (locals.length === 0) {
      return { canonicalId: null, archivedDuplicates: [], blockedDuplicates: [] };
    }

    const counts = new Map<string, number>();
    for (const n of locals) counts.set(n.id, await workloadCount(n.id));

    const canonical =
      locals.find((n) => n.nodeKey === LOCAL_NODE_KEY) ??
      [...locals].sort(
        (a, b) =>
          (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      )[0];

    const archivedDuplicates: string[] = [];
    const blockedDuplicates: { id: string; name: string; workloads: number }[] = [];
    for (const dup of locals) {
      if (dup.id === canonical.id) continue;
      // Already archived on a previous run — leave it (no re-audit churn).
      if (dup.status === "archived") continue;
      const workloads = counts.get(dup.id) ?? 0;
      if (workloads > 0) {
        blockedDuplicates.push({ id: dup.id, name: dup.name, workloads });
        continue;
      }
      await prisma.node.update({
        where: { id: dup.id },
        data: { status: "archived", isProtected: false },
      });
      await audit({
        actorType: "system",
        action: "node.duplicate_archived",
        targetType: "node",
        targetId: dup.id,
        metadata: { name: dup.name, mergedInto: canonical.id },
      });
      archivedDuplicates.push(dup.id);
    }
    return { canonicalId: canonical.id, archivedDuplicates, blockedDuplicates };
  },

  /**
   * Backfill `nodeKey` for any pre-existing rows missing one (used by the seed
   * after the schema gains the column). Remote nodes get a derived stable key.
   */
  async backfillNodeKeys(): Promise<number> {
    const missing = await prisma.node.findMany({ where: { nodeKey: null } });
    let filled = 0;
    for (const n of missing) {
      if (looksLikeLocalNode(n)) continue; // handled by registerLocalNode
      const key =
        deriveNodeKey({
          agentId: n.agentId,
          machineId: n.machineId,
          providerInstanceId: n.providerInstanceId,
          provider: n.provider,
          hostname: n.hostname ?? n.name,
          publicIp: n.publicIp,
        }) ?? `node:${n.id}`;
      // `node:<id>` is unique by construction and stable for this row.
      await prisma.node.update({ where: { id: n.id }, data: { nodeKey: key } });
      filled++;
    }
    return filled;
  },
};
