import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "quickdock-shared";

export const dynamic = "force-dynamic";

const STATE_TTL_MS = 10 * 60 * 1000;

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
}

function createState(next: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      next,
      nonce: crypto.randomBytes(16).toString("base64url"),
      createdAt: Date.now(),
      ttlMs: STATE_TTL_MS,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function userAppRedirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, env.USERAPP_BASE_URL));
}

export async function GET(req: Request) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CALLBACK_URL) {
    return userAppRedirect("/login?error=google_config");
  }

  const url = new URL(req.url);
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", env.GOOGLE_CALLBACK_URL);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", createState(safeNext(url.searchParams.get("next"))));
  authorizeUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(authorizeUrl);
}
