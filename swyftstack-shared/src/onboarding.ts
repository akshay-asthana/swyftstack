import { prisma } from "./db.js";
import { hashPassword } from "./crypto.js";
import { env } from "./env.js";
import type { AuthProvider } from "./generated/prisma/index.js";

type CustomerAccountInput = {
  name: string;
  email: string;
  company?: string;
  organizationName?: string;
  password?: string;
  emailVerified?: boolean;
  authProvider?: AuthProvider;
  providerAccountId?: string;
};

export class SignupEmailExistsError extends Error {
  constructor() {
    super("A user with this email already exists.");
    this.name = "SignupEmailExistsError";
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function compactName(value: string | undefined): string | null {
  const name = value?.trim().replace(/\s+/g, " ");
  return name || null;
}

function organizationName(input: CustomerAccountInput): string {
  const organization = compactName(input.organizationName);
  if (organization) return organization;
  const company = compactName(input.company);
  if (company) return company;
  const name = compactName(input.name);
  return name ? `${name}'s organization` : "Personal organization";
}

export async function createPasswordCustomerAccount(input: CustomerAccountInput) {
  const email = normalizeEmail(input.email);
  if (!input.password || input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new SignupEmailExistsError();

  return createCustomerAccount({
    ...input,
    email,
    passwordHash: hashPassword(input.password ?? ""),
    emailVerified: false,
  });
}

export async function findOrCreateOAuthCustomerAccount(input: CustomerAccountInput) {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: existing.name ?? compactName(input.name),
        emailVerified: input.emailVerified ?? existing.emailVerified,
        authProvider: input.authProvider ?? existing.authProvider,
      },
    });
    if (input.authProvider && input.providerAccountId) {
      await prisma.userAuthAccount.upsert({
        where: {
          provider_providerAccountId: {
            provider: input.authProvider,
            providerAccountId: input.providerAccountId,
          },
        },
        update: { userId: user.id, email, displayName: compactName(input.name), lastUsedAt: new Date() },
        create: {
          userId: user.id,
          provider: input.authProvider,
          providerAccountId: input.providerAccountId,
          email,
          displayName: compactName(input.name),
          lastUsedAt: new Date(),
        },
      });
    }
    return user;
  }

  const account = await createCustomerAccount({
    ...input,
    email,
    passwordHash: null,
    emailVerified: input.emailVerified ?? true,
    authProvider: input.authProvider ?? "google",
    providerAccountId: input.providerAccountId,
  });
  return account.user;
}

async function createCustomerAccount(
  input: CustomerAccountInput & { email: string; passwordHash: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: compactName(input.name),
        passwordHash: input.passwordHash,
        emailVerified: input.emailVerified ?? false,
        authProvider: input.authProvider ?? "password",
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: organizationName(input),
        ownerUserId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
    });

    if (input.authProvider && input.providerAccountId) {
      await tx.userAuthAccount.create({
        data: {
          userId: user.id,
          provider: input.authProvider,
          providerAccountId: input.providerAccountId,
          email: input.email,
          displayName: compactName(input.name),
          lastUsedAt: new Date(),
        },
      });
    }

    const plan = await tx.plan.findUnique({
      where: { slug: env.DEFAULT_CUSTOMER_PLAN_SLUG },
    });
    if (plan) {
      const now = new Date();
      const trialEndAt = plan.hasTrial && plan.trialDays
        ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60_000)
        : null;
      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: plan.id,
          status: trialEndAt ? "trialing" : "active",
          billingPhase: trialEndAt ? "trial" : "regular",
          trialStartAt: trialEndAt ? now : null,
          trialEndAt,
          trialPriceCents: plan.trialPriceCents,
          regularPriceCents: plan.priceCents,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndAt ?? new Date(now.getTime() + 30 * 24 * 60 * 60_000),
        },
      });
    }

    return { user, organization };
  });
}
