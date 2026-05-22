// Shared admin helpers for users: workspace bootstrap + plan assignment with
// trial-pricing support (§13). Used by both the users list and user detail.
import { prisma } from "quickdock-shared";

/** Ensure the user owns at least one workspace org + default project. */
export async function ensureOwnedWorkspace(userId: string, displayName: string) {
  const existing = await prisma.organization.findFirst({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.organization.create({
    data: {
      name: displayName ? `${displayName}'s workspace` : "User workspace",
      ownerUserId: userId,
      members: { create: { userId, role: "owner" } },
      projects: {
        create: {
          name: "Default project",
          slug: "default",
          region: "local",
          createdBy: userId,
          members: { create: { userId, role: "owner" } },
        },
      },
    },
  });
}

/**
 * Assign a plan to a user's workspace. If the plan has a trial, the new
 * subscription starts in the `trialing` phase with trial price + window;
 * it reverts to the regular price after trialDays.
 */
export async function assignPlanToUser(userId: string, planId: string) {
  if (!planId) return;
  const [user, plan] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.plan.findUniqueOrThrow({ where: { id: planId } }),
  ]);
  const org = await ensureOwnedWorkspace(userId, user.name ?? user.email);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const trialing = plan.hasTrial && (plan.trialDays ?? 0) > 0;
  const trialEnd = trialing
    ? new Date(now.getTime() + (plan.trialDays ?? 0) * 86_400_000)
    : null;

  // Cancel any current subscription before assigning the new plan.
  await prisma.subscription.updateMany({
    where: { organizationId: org.id, status: { in: ["active", "trialing", "past_due"] } },
    data: { status: "cancelled", cancelAtPeriodEnd: false },
  });
  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId,
      status: trialing ? "trialing" : "active",
      provider: "manual",
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd ?? periodEnd,
      billingPhase: trialing ? "trial" : "regular",
      trialStartAt: trialing ? now : null,
      trialEndAt: trialEnd,
      trialPriceCents: trialing ? plan.trialPriceCents ?? 0 : null,
      regularPriceCents: plan.priceCents,
    },
  });
}

/** The user's active/owned subscription, with plan + limits, or null. */
export async function activeSubscriptionForUser(userId: string) {
  const orgs = await prisma.organization.findMany({
    where: { ownerUserId: userId },
    select: { id: true },
  });
  return prisma.subscription.findFirst({
    where: {
      organizationId: { in: orgs.map((o) => o.id) },
      status: { in: ["active", "trialing", "past_due"] },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: { include: { limits: true } }, organization: true },
  });
}
