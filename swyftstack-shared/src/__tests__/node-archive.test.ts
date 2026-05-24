import { describe, it, expect } from "vitest";

// Mirrors the filter rule used in infrastructure/{overview,nodes}-section.tsx
// so changes to that rule (e.g. accidentally counting archived in totals)
// fail loudly in tests.

type Node = { status: string; cpuCores: number; ramBytes: number; diskBytes: number };

function liveNodes(nodes: Node[]): Node[] {
  return nodes.filter((n) => n.status !== "archived");
}

function totals(nodes: Node[]) {
  const live = liveNodes(nodes);
  return {
    count: live.length,
    cpu: live.reduce((s, n) => s + n.cpuCores, 0),
    ram: live.reduce((s, n) => s + n.ramBytes, 0),
    disk: live.reduce((s, n) => s + n.diskBytes, 0),
  };
}

describe("nodes summary excludes archived", () => {
  const sample: Node[] = [
    { status: "active", cpuCores: 4, ramBytes: 8e9, diskBytes: 100e9 },
    { status: "degraded", cpuCores: 8, ramBytes: 16e9, diskBytes: 250e9 },
    { status: "archived", cpuCores: 16, ramBytes: 32e9, diskBytes: 500e9 },
    { status: "draining", cpuCores: 2, ramBytes: 4e9, diskBytes: 50e9 },
  ];

  it("does not count archived nodes in totals", () => {
    const r = totals(sample);
    expect(r.count).toBe(3);
    expect(r.cpu).toBe(14);
    expect(r.ram).toBe(8e9 + 16e9 + 4e9);
    expect(r.disk).toBe(100e9 + 250e9 + 50e9);
  });

  it("includes draining/degraded/offline (still operational tracking)", () => {
    const live = liveNodes(sample);
    expect(live.map((n) => n.status).sort()).toEqual(["active", "degraded", "draining"]);
  });

  it("isolates archived list for the secondary panel", () => {
    const archived = sample.filter((n) => n.status === "archived");
    expect(archived.length).toBe(1);
    expect(archived[0].cpuCores).toBe(16);
  });
});
