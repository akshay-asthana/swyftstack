// Usage limit enforcement state machine.
//   < 80%  -> ok
//   80-99% -> warning
//   100-109% -> limit_reached (block new builds/deploys)
//   >=110% -> over_limit (suspend/throttle dynamic runtime) unless override
// Pure logic — no DB.

export type EnforcementState = "ok" | "warning" | "limit_reached" | "over_limit";

export interface EnforcementResult {
  state: EnforcementState;
  ratio: number; // used / limit (Infinity if limit is 0)
  blockNewBuilds: boolean;
  suspendRuntime: boolean;
}

export function evaluateUsage(
  used: number | bigint,
  limit: number | null,
  opts: { overageEnabled?: boolean } = {},
): EnforcementResult {
  const u = Number(used);

  // null limit = unlimited (admin override). Never blocks.
  if (limit === null) {
    return { state: "ok", ratio: 0, blockNewBuilds: false, suspendRuntime: false };
  }

  const ratio = limit === 0 ? Infinity : u / limit;

  let state: EnforcementState = "ok";
  if (ratio >= 1.1) state = "over_limit";
  else if (ratio >= 1.0) state = "limit_reached";
  else if (ratio >= 0.8) state = "warning";

  const blockNewBuilds = state === "limit_reached" || state === "over_limit";
  const suspendRuntime = state === "over_limit" && !opts.overageEnabled;

  return { state, ratio, blockNewBuilds, suspendRuntime };
}

/** True if a new resource of `quantity` would exceed the limit. */
export function wouldExceed(
  current: number,
  quantity: number,
  limit: number | null,
): boolean {
  if (limit === null) return false; // unlimited
  return current + quantity > limit;
}
