import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  env,
  createGoogleWelcomeNotification,
  findOrCreateOAuthCustomerAccount,
  hashToken,
  prisma,
  randomSecret,
  USER_SESSION_COOKIE,
  USER_SESSION_MAX_AGE,
} from "swyftstack-shared";

export const dynamic = "force-dynamic";

type GoogleProfile = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

type GoogleState = {
  next?: string;
  createdAt?: number;
  ttlMs?: number;
};

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
}

function verifyState(raw: string | null): GoogleState | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx < 0) return null;

  const payload = raw.slice(0, idx);
  const got = raw.slice(idx + 1);
  const expected = sign(payload);
  if (
    expected.length !== got.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got))
  ) {
    return null;
  }

  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleState;
    const createdAt = Number(state.createdAt);
    const ttlMs = Number(state.ttlMs);
    if (!Number.isFinite(createdAt) || !Number.isFinite(ttlMs)) return null;
    if (Date.now() - createdAt > ttlMs) return null;
    return state;
  } catch {
    return null;
  }
}

function userAppRedirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, env.USERAPP_BASE_URL));
}

async function exchangeCode(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.GOOGLE_CALLBACK_URL,
    }),
  });
  if (!res.ok) throw new Error("Google token exchange failed.");
  return (await res.json()) as { access_token?: string };
}

async function loadProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Google profile request failed.");
  return (await res.json()) as GoogleProfile;
}

export async function GET(req: Request) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    return userAppRedirect("/login?error=google_config");
  }

  const url = new URL(req.url);
  const state = verifyState(url.searchParams.get("state"));
  if (!state) return userAppRedirect("/login?error=google_state");

  if (url.searchParams.get("error")) {
    return userAppRedirect("/login?error=google");
  }

  const code = url.searchParams.get("code");
  if (!code) return userAppRedirect("/login?error=google");

  try {
    const token = await exchangeCode(code);
    if (!token.access_token) return userAppRedirect("/login?error=google");

    const profile = await loadProfile(token.access_token);
    if (!profile.email || profile.email_verified === false) {
      return userAppRedirect("/login?error=google_email");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email.trim().toLowerCase() },
      select: { id: true },
    });
    const user = await findOrCreateOAuthCustomerAccount({
      email: profile.email,
      name: profile.name ?? profile.email,
      emailVerified: true,
      authProvider: "google",
      providerAccountId: profile.sub ?? profile.email,
    });
    if (user.status !== "active") return userAppRedirect("/login?error=disabled");

    const sessionToken = randomSecret(32);
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip");
    const userAgent = req.headers.get("user-agent");
    await prisma.$transaction([
      prisma.userSession.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(sessionToken),
          ipAddress,
          userAgent,
          app: "userapp",
          expiresAt: new Date(Date.now() + USER_SESSION_MAX_AGE * 1000),
        },
      }),
      prisma.loginEvent.create({
        data: {
          userId: user.id,
          email: user.email,
          provider: "google",
          success: true,
          ipAddress,
          userAgent,
          app: "userapp",
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), lastLoginIp: ipAddress, lastActivityAt: new Date() },
      }),
    ]);
    if (!existingUser) {
      await createGoogleWelcomeNotification(user.id).catch((err) =>
        console.error("[google-auth] welcome notification failed:", err),
      );
    }

    const res = userAppRedirect(safeNext(state.next));
    res.cookies.set(USER_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: USER_SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("[google-auth] callback failed:", err);
    return userAppRedirect("/login?error=google");
  }
}
