// Baseline user session for the customer app.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  prisma,
  verifyPassword,
  signUserSession,
  verifyUserSession,
  USER_SESSION_COOKIE,
  USER_SESSION_MAX_AGE,
} from "swyftstack-shared";

export function setUserSession(userId: string): void {
  cookies().set(USER_SESSION_COOKIE, signUserSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_SESSION_MAX_AGE,
  });
}

export async function login(email: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || user.status !== "active") return false;
  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) return false;
  setUserSession(user.id);
  return true;
}

export function logout() {
  cookies().delete(USER_SESSION_COOKIE);
}

export async function currentUser() {
  const raw = cookies().get(USER_SESSION_COOKIE)?.value;
  if (!raw) return null;
  const session = verifyUserSession(raw);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return user && user.status === "active" ? user : null;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}
