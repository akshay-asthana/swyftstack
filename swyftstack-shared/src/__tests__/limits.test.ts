import { describe, it, expect } from "vitest";
import { resolveLimit, resolveFeature, type LimitOverrideInput } from "../limits.js";

const chain = { organizationId: "org1", userId: "u1", projectId: "p1", serviceId: "s1" };

describe("override precedence: service > project > user > organization > plan", () => {
  it("falls back to plan default when no overrides", () => {
    expect(resolveLimit("max_projects", 1, [], chain)).toBe(1);
  });

  it("organization override beats plan default", () => {
    const ov: LimitOverrideInput[] = [
      { scopeType: "organization", scopeId: "org1", limitKey: "max_projects", limitValue: 5 },
    ];
    expect(resolveLimit("max_projects", 1, ov, chain)).toBe(5);
  });

  it("user override beats organization override", () => {
    const ov: LimitOverrideInput[] = [
      { scopeType: "organization", scopeId: "org1", limitKey: "max_projects", limitValue: 5 },
      { scopeType: "user", scopeId: "u1", limitKey: "max_projects", limitValue: 9 },
    ];
    expect(resolveLimit("max_projects", 1, ov, chain)).toBe(9);
  });

  it("service override wins over everything", () => {
    const ov: LimitOverrideInput[] = [
      { scopeType: "organization", scopeId: "org1", limitKey: "max_projects", limitValue: 5 },
      { scopeType: "user", scopeId: "u1", limitKey: "max_projects", limitValue: 9 },
      { scopeType: "project", scopeId: "p1", limitKey: "max_projects", limitValue: 12 },
      { scopeType: "service", scopeId: "s1", limitKey: "max_projects", limitValue: 99 },
    ];
    expect(resolveLimit("max_projects", 1, ov, chain)).toBe(99);
  });

  it("null override value means unlimited", () => {
    const ov: LimitOverrideInput[] = [
      { scopeType: "user", scopeId: "u1", limitKey: "max_vcpu_seconds", limitValue: null },
    ];
    expect(resolveLimit("max_vcpu_seconds", 360000, ov, chain)).toBeNull();
  });

  it("expired overrides are ignored", () => {
    const ov: LimitOverrideInput[] = [
      {
        scopeType: "user",
        scopeId: "u1",
        limitKey: "max_projects",
        limitValue: 50,
        expiresAt: new Date("2000-01-01"),
      },
    ];
    expect(resolveLimit("max_projects", 1, ov, chain)).toBe(1);
  });

  it("enabled:false override forces a hard 0", () => {
    const ov: LimitOverrideInput[] = [
      { scopeType: "project", scopeId: "p1", limitKey: "max_databases", limitValue: 10, enabled: false },
    ];
    expect(resolveLimit("max_databases", 1, ov, chain)).toBe(0);
  });
});

describe("feature override precedence", () => {
  it("project override beats plan default", () => {
    const r = resolveFeature(
      "team_members",
      false,
      [{ scopeType: "project", scopeId: "p1", featureKey: "team_members", enabled: true }],
      chain,
    );
    expect(r).toBe(true);
  });
});
