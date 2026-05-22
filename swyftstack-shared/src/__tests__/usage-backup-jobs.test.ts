import { describe, it, expect } from "vitest";
import { evaluateUsage, wouldExceed } from "../usage.js";
import { canTransition, backupsSafeToDelete } from "../backup-state.js";
import { backoffDelayMs } from "../jobs/backoff.js";

describe("usage enforcement 80/100/110", () => {
  it("ok below 80%", () => {
    expect(evaluateUsage(70, 100).state).toBe("ok");
  });
  it("warning at 80%", () => {
    expect(evaluateUsage(80, 100).state).toBe("warning");
  });
  it("limit_reached at 100% blocks builds", () => {
    const r = evaluateUsage(100, 100);
    expect(r.state).toBe("limit_reached");
    expect(r.blockNewBuilds).toBe(true);
    expect(r.suspendRuntime).toBe(false);
  });
  it("over_limit at 110% suspends runtime unless overage enabled", () => {
    expect(evaluateUsage(110, 100).suspendRuntime).toBe(true);
    expect(evaluateUsage(110, 100, { overageEnabled: true }).suspendRuntime).toBe(false);
  });
  it("null limit is unlimited", () => {
    expect(evaluateUsage(10 ** 9, null).state).toBe("ok");
  });
  it("wouldExceed respects unlimited", () => {
    expect(wouldExceed(5, 10, null)).toBe(false);
    expect(wouldExceed(5, 10, 12)).toBe(true);
  });
});

describe("backup state machine", () => {
  it("allows the verified path", () => {
    expect(canTransition("pending", "running")).toBe(true);
    expect(canTransition("running", "uploading")).toBe(true);
    expect(canTransition("uploading", "verified")).toBe(true);
  });
  it("forbids skipping verification", () => {
    expect(canTransition("running", "verified")).toBe(false);
  });
  it("keeps everything when nothing is verified yet", () => {
    const list = [
      { id: "a", status: "uploading" as const, createdAt: new Date(1) },
      { id: "b", status: "running" as const, createdAt: new Date(2) },
    ];
    expect(backupsSafeToDelete(list, 1)).toHaveLength(0);
  });
  it("only prunes older verified backups beyond retention", () => {
    const list = [
      { id: "old", status: "verified" as const, createdAt: new Date(1) },
      { id: "new", status: "verified" as const, createdAt: new Date(2) },
    ];
    const del = backupsSafeToDelete(list, 1);
    expect(del.map((d) => d.id)).toEqual(["old"]);
  });
});

describe("job retry backoff", () => {
  it("is exponential and capped at 60s", () => {
    expect(backoffDelayMs(1)).toBe(2000);
    expect(backoffDelayMs(2)).toBe(4000);
    expect(backoffDelayMs(20)).toBe(60000);
  });
});
