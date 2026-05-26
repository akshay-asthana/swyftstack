// Waitlist / early-access gate.
//
// When WAITLIST_MODE is truthy, the public site replaces every Sign in / Sign
// up affordance with a "Request early access" CTA that points at the
// /request-early-access form. This gate is intentionally decoupled from
// NODE_ENV so we can run the userapp in `production` mode with the waitlist
// off (or in `development` with the waitlist on for QA).
//
// Accepts: "true", "1", "yes", "on" (case-insensitive). Anything else = off.
export function isEarlyAccessMode(): boolean {
  const raw = (process.env as Record<string, string | undefined>).WAITLIST_MODE;
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export function authTarget(path: "/login" | "/signup" = "/signup"): string {
  return isEarlyAccessMode() ? "/request-early-access" : path;
}
