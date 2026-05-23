// Minimal signed-cookie session for the admin app. Role-ready: the session
// carries the user id; isPlatformAdmin is enforced on every request.
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, env, verifyPassword } from "swyftstack-shared";

const COOKIE = "swyftstack_admin_session";
const MAX_AGE = 60 * 60 * 8; // 8h

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const expected = crypto.createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
  const got = signed.slice(idx + 1);
  if (
    expected.length === got.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got))
  ) {
    return value;
  }
  return null;
}

export async function login(email: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !user.isPlatformAdmin || user.status !== "active") {
    return false;
  }
  if (!verifyPassword(password, user.passwordHash)) return false;
  const payload = `${user.id}:${Date.now()}`;
  cookies().set(COOKIE, sign(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return true;
}

export function logout(): void {
  cookies().delete(COOKIE);
}

export async function currentAdmin() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const value = verify(raw);
  if (!value) return null;
  const [userId] = value.split(":");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isPlatformAdmin || user.status !== "active") return null;
  return user;
}

export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/login");
  return admin;
}
