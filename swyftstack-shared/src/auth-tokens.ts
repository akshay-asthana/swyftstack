import { prisma } from "./db.js";
import { env } from "./env.js";
import { hashPassword, hashToken, randomSecret } from "./crypto.js";
import { sendTransactionalEmail } from "./email.js";

const VERIFY_TTL_MS = 24 * 60 * 60_000;
const RESET_TTL_MS = 60 * 60_000;

function userAppUrl(path: string, token: string): string {
  const url = new URL(path, env.USERAPP_BASE_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function createEmailVerificationLink(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const token = randomSecret(32);
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      email: user.email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });
  return userAppUrl("/verify-email", token);
}

export async function sendVerificationEmail(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const link = await createEmailVerificationLink(userId);
  await sendTransactionalEmail({
    to: user.email,
    subject: "Verify your Swyftstack account",
    text:
      `Welcome to Swyftstack.\n\n` +
      `Verify your email address with this link:\n${link}\n\n` +
      `This link expires in 24 hours.`,
  });
  return link;
}

export async function verifyEmailToken(token: string): Promise<{ ok: boolean; reason?: string }> {
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!row || row.consumedAt) return { ok: false, reason: "invalid" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    }),
  ]);
  return { ok: true };
}

export async function createPasswordResetLink(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || !user.passwordLoginEnabled || !user.passwordHash || user.status !== "active") {
    return null;
  }

  const token = randomSecret(32);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  return userAppUrl("/reset-password", token);
}

export async function sendPasswordResetEmail(email: string): Promise<string | null> {
  const link = await createPasswordResetLink(email);
  if (!link) return null;
  await sendTransactionalEmail({
    to: email.trim().toLowerCase(),
    subject: "Reset your Swyftstack password",
    text:
      `Use this link to reset your Swyftstack password:\n${link}\n\n` +
      `This link expires in 1 hour. If you did not request it, you can ignore this email.`,
  });
  return link;
}

export async function resetPasswordWithToken(
  token: string,
  password: string,
): Promise<{ ok: boolean; reason?: string; userId?: string }> {
  if (password.length < 8) return { ok: false, reason: "password" };
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row || row.consumedAt) return { ok: false, reason: "invalid" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: {
        passwordHash: hashPassword(password),
        passwordLoginEnabled: true,
        failedLoginCount: 0,
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    }),
    prisma.userSession.updateMany({
      where: { userId: row.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  return { ok: true, userId: row.userId };
}
