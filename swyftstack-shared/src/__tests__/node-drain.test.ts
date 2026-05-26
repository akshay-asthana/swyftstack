import { describe, it, expect } from "vitest";

// Pure logic check for the helper that filters provisioning policy candidates
// to exclude the source node. This mirrors what NodeDrainService does inline
// in `pickTargetExcluding`. The DB-bound service is integration-tested
// elsewhere; here we verify the source-exclusion rule never returns the
// source node, even when it is the policy's "chosen" candidate.

type Candidate = {
  targetType: string;
  targetId: string;
  healthy: boolean;
  usagePercent: number | null;
};

function pickTargetExcluding(
  candidates: Candidate[],
  chosen: Candidate | null,
  excludeNodeId: string,
): string | null {
  const healthy = candidates.filter(
    (c) => c.healthy && c.targetType === "node" && c.targetId !== excludeNodeId,
  );
  if (healthy.length === 0) return null;
  if (chosen && chosen.targetType === "node" && chosen.targetId !== excludeNodeId) {
    return chosen.targetId;
  }
  return healthy.sort((a, b) => (a.usagePercent ?? 0) - (b.usagePercent ?? 0))[0].targetId;
}

describe("nodeDrainService target selection", () => {
  it("never returns the source node even when policy chose it", () => {
    const source = { targetType: "node", targetId: "node-A", healthy: true, usagePercent: 20 };
    const other = { targetType: "node", targetId: "node-B", healthy: true, usagePercent: 60 };
    expect(pickTargetExcluding([source, other], source, "node-A")).toBe("node-B");
  });

  it("returns null when only the source node is healthy", () => {
    const source = { targetType: "node", targetId: "node-A", healthy: true, usagePercent: 0 };
    const offline = { targetType: "node", targetId: "node-B", healthy: false, usagePercent: 0 };
    expect(pickTargetExcluding([source, offline], source, "node-A")).toBeNull();
  });

  it("picks the lowest-usage candidate when chosen is the source", () => {
    const source = { targetType: "node", targetId: "node-A", healthy: true, usagePercent: 0 };
    const low = { targetType: "node", targetId: "node-B", healthy: true, usagePercent: 10 };
    const high = { targetType: "node", targetId: "node-C", healthy: true, usagePercent: 80 };
    expect(pickTargetExcluding([source, low, high], source, "node-A")).toBe("node-B");
  });

  it("ignores non-node targets", () => {
    const cluster = { targetType: "database_cluster", targetId: "cluster-1", healthy: true, usagePercent: 0 };
    const node = { targetType: "node", targetId: "node-B", healthy: true, usagePercent: 0 };
    expect(pickTargetExcluding([cluster, node], cluster, "node-A")).toBe("node-B");
  });
});
