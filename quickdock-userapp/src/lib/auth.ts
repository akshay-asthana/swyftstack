// Baseline user session for the customer app. Email + password if the user has
// a password set; otherwise email-only (MVP baseline — wire real auth later).
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, env, verifyPassword } from "quickdock-shared";

const COOKIE = "qd_user_session";

function sign(v: string) {
  return `${v}.${crypto.createHmac("sha256", env.AUTH_SECRET).update(v).digest("base64url")}`;
}
function verify(signed: string): string | null {
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const v = signed.slice(0, i);
  const mac = crypto.createHmac("sha256", env.AUTH_SECRET).update(v).digest("base64url");
  return mac === signed.slice(i + 1) ? v : null;
}

export async function login(email: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== "active") return false;
  if (user.passwordHash && !verifyPassword(password, user.passwordHash)) return false;
  cookies().set(COOKIE, sign(`${user.id}:${Date.now()}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return true;
}

export function logout() {
  cookies().delete(COOKIE);
}

export async function currentUser() {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return null;
  const v = verify(raw);
  if (!v) return null;
  const user = await prisma.user.findUnique({ where: { id: v.split(":")[0] } });
  return user && user.status === "active" ? user : null;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}
