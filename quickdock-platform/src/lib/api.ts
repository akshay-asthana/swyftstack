// API-route authorization. Accepts either a logged-in admin session OR the
// internal bearer token (used by the worker for internal calls).
import { NextResponse } from "next/server";
import { env } from "quickdock-shared";
import { currentAdmin } from "./auth";

export async function authorize(req: Request): Promise<
  | { ok: true; via: "session" | "token"; adminId?: string }
  | { ok: false; res: NextResponse }
> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && auth.slice(7) === env.INTERNAL_API_TOKEN) {
    return { ok: true, via: "token" };
  }
  const admin = await currentAdmin();
  if (admin) return { ok: true, via: "session", adminId: admin.id };
  return {
    ok: false,
    res: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
  };
}

/** JSON-safe serializer: BigInt -> string. */
export function json(data: unknown, init?: ResponseInit) {
  return new NextResponse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } },
  );
}
