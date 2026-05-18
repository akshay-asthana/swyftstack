import crypto from "node:crypto";
import { env } from "./env.js";

export const USER_SESSION_COOKIE = "qd_user_session";
export const USER_SESSION_MAX_AGE = 60 * 60 * 8;

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
  return `${value}.${mac}`;
}

export function signUserSession(userId: string, issuedAt = Date.now()): string {
  return sign(`${userId}:${issuedAt}`);
}

export function verifyUserSession(signed: string): { userId: string; issuedAt: number } | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;

  const value = signed.slice(0, idx);
  const expected = crypto.createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
  const got = signed.slice(idx + 1);
  if (
    expected.length !== got.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got))
  ) {
    return null;
  }

  const [userId, issuedAtRaw] = value.split(":");
  const issuedAt = Number(issuedAtRaw);
  if (!userId || !Number.isFinite(issuedAt)) return null;
  return { userId, issuedAt };
}
