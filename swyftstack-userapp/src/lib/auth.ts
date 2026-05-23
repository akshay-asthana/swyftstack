// Baseline user session for the customer app.
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  prisma,
  verifyPassword,
  hashToken,
  randomSecret,
  verifyUserSession,
  USER_SESSION_COOKIE,
  LEGACY_USER_SESSION_COOKIE,
  USER_SESSION_MAX_AGE,
} from "swyftstack-shared";

function requestMeta() {
  const h = headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

export async function setUserSession(userId: string): Promise<void> {
  const token = randomSecret(32);
  const meta = requestMeta();
  await prisma.userSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      app: "userapp",
      expiresAt: new Date(Date.now() + USER_SESSION_MAX_AGE * 1000),
    },
  });
  cookies().set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: USER_SESSION_MAX_AGE,
  });
}

export async function login(email: string, password: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const meta = requestMeta();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const fail = async (reason: string) => {
    await prisma.loginEvent.create({
      data: {
        userId: user?.id,
        email: normalized,
        provider: "password",
        success: false,
        reason,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        app: "userapp",
      },
    });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
      });
    }
    return false;
  };
  if (!user || user.status !== "active") return fail("invalid_or_disabled");
  if (!user.passwordHash || !user.passwordLoginEnabled) return fail("password_login_disabled");
  if (!verifyPassword(password, user.passwordHash)) return fail("bad_password");
  await setUserSession(user.id);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lastLoginAt: new Date(),
        lastLoginIp: meta.ipAddress,
        lastActivityAt: new Date(),
      },
    }),
    prisma.loginEvent.create({
      data: {
        userId: user.id,
        email: normalized,
        provider: "password",
        success: true,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        app: "userapp",
      },
    }),
  ]);
  return true;
}

export async function logout() {
  const raw = cookies().get(USER_SESSION_COOKIE)?.value;
  if (raw) {
    await prisma.userSession.updateMany({
      where: { tokenHash: hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookies().delete(USER_SESSION_COOKIE);
  cookies().delete(LEGACY_USER_SESSION_COOKIE);
}

export async function currentUser() {
  const raw = cookies().get(USER_SESSION_COOKIE)?.value ?? cookies().get(LEGACY_USER_SESSION_COOKIE)?.value;
  if (!raw) return null;
  const dbSession = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true },
  });
  if (dbSession) {
    if (dbSession.revokedAt || dbSession.expiresAt.getTime() < Date.now()) return null;
    await prisma.userSession.update({
      where: { id: dbSession.id },
      data: { lastSeenAt: new Date() },
    }).catch(() => undefined);
    const user = dbSession.user;
    return user.status === "active" ? user : null;
  }

  const legacy = verifyUserSession(raw);
  if (!legacy) return null;
  const user = await prisma.user.findUnique({ where: { id: legacy.userId } });
  return user && user.status === "active" ? user : null;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}
