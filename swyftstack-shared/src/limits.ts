// Effective limit + feature resolution with override precedence.
// Precedence (most specific wins):
//   service > project > user > organization > plan default
// Pure functions only (no DB) so they are trivially unit-testable.

import { SCOPE_PRECEDENCE, type LimitKey, type FeatureKey } from "./constants.js";

export type ScopeType = "organization" | "user" | "project" | "service";

export interface LimitOverrideInput {
  scopeType: ScopeType;
  scopeId: string;
  limitKey: string;
  limitValue: number | bigint | null;
  enabled?: boolean | null;
  expiresAt?: Date | null;
}

export interface FeatureOverrideInput {
  scopeType: ScopeType;
  scopeId: string;
  featureKey: string;
  enabled: boolean;
  config?: Record<string, unknown>;
  expiresAt?: Date | null;
}

/** The resolved id at each scope level for the entity we're evaluating. */
export interface ScopeChain {
  organizationId?: string;
  userId?: string;
  projectId?: string;
  serviceId?: string;
}

function scopeId(chain: ScopeChain, scope: ScopeType): string | undefined {
  switch (scope) {
    case "organization":
      return chain.organizationId;
    case "user":
      return chain.userId;
    case "project":
      return chain.projectId;
    case "service":
      return chain.serviceId;
  }
}

function isActive(o: { expiresAt?: Date | null }, now: Date): boolean {
  return !o.expiresAt || o.expiresAt.getTime() > now.getTime();
}

/**
 * Resolve a single limit key. Returns the most specific applicable override
 * value, falling back to the plan default. `null` means unlimited.
 */
export function resolveLimit(
  limitKey: LimitKey | string,
  planDefault: number | bigint | null,
  overrides: LimitOverrideInput[],
  chain: ScopeChain,
  now: Date = new Date(),
): number | null {
  for (const scope of SCOPE_PRECEDENCE) {
    const id = scopeId(chain, scope);
    if (!id) continue;
    const match = overrides.find(
      (o) =>
        o.scopeType === scope &&
        o.scopeId === id &&
        o.limitKey === limitKey &&
        isActive(o, now),
    );
    if (match) {
      if (match.enabled === false) return 0;
      return match.limitValue === null || match.limitValue === undefined
        ? null
        : Number(match.limitValue);
    }
  }
  return planDefault === null || planDefault === undefined ? null : Number(planDefault);
}

/** Resolve every limit key against plan defaults + overrides. */
export function resolveAllLimits(
  planDefaults: Record<string, number | bigint | null>,
  overrides: LimitOverrideInput[],
  chain: ScopeChain,
  now: Date = new Date(),
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const key of Object.keys(planDefaults)) {
    out[key] = resolveLimit(key, planDefaults[key], overrides, chain, now);
  }
  return out;
}

/** Resolve whether a feature is enabled, with the same precedence rules. */
export function resolveFeature(
  featureKey: FeatureKey | string,
  planDefault: boolean,
  overrides: FeatureOverrideInput[],
  chain: ScopeChain,
  now: Date = new Date(),
): boolean {
  for (const scope of SCOPE_PRECEDENCE) {
    const id = scopeId(chain, scope);
    if (!id) continue;
    const match = overrides.find(
      (o) =>
        o.scopeType === scope &&
        o.scopeId === id &&
        o.featureKey === featureKey &&
        isActive(o, now),
    );
    if (match) return match.enabled;
  }
  return planDefault;
}
