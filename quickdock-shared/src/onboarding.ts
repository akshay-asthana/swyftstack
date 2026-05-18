import { prisma } from "./db.js";
import { hashPassword } from "./crypto.js";

type CustomerAccountInput = {
  name: string;
  email: string;
  company?: string;
  password?: string;
  emailVerified?: boolean;
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

function workspaceName(input: CustomerAccountInput): string {
  const company = compactName(input.company);
  if (company) return company;
  const name = compactName(input.name);
  return name ? `${name}'s workspace` : "Personal workspace";
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
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: existing.name ?? compactName(input.name),
        emailVerified: input.emailVerified ?? existing.emailVerified,
      },
    });
  }

  const account = await createCustomerAccount({
    ...input,
    email,
    passwordHash: null,
    emailVerified: input.emailVerified ?? true,
  });
  return account.user;
}

async function createCustomerAccount(
  input: CustomerAccountInput & { email: string; passwordHash: string | null },
) {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: compactName(input.name),
        passwordHash: input.passwordHash,
        emailVerified: input.emailVerified ?? false,
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: workspaceName(input),
        ownerUserId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
    });

    const starter = await tx.plan.findUnique({ where: { slug: "starter" } });
    if (starter) {
      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: starter.id,
          status: "active",
          provider: "internal",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    const project = await tx.project.create({
      data: {
        organizationId: organization.id,
        name: "Default project",
        slug: "default",
        region: "local",
        createdBy: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
    });

    return { user, organization, project };
  });
}
