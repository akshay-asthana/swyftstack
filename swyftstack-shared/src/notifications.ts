import { Prisma } from "./generated/prisma/index.js";
import { prisma } from "./db.js";
import { env } from "./env.js";
import { planResourceService } from "./services/plan-resource.js";
import { queueEmailDelivery } from "./email.js";

export type UsageThresholdPercent = 75 | 90 | 100;

type ThresholdResource = {
  eventResourceType: "database_storage" | "object_storage" | "egress";
  notificationResourceType: "database" | "object_storage" | "egress";
  limitKey: "max_database_storage_bytes" | "max_object_storage_bytes" | "max_egress_bytes";
  resourceName: string;
  usageType?: string[];
  currentBytes: bigint;
  limitBytes: bigint | null;
};

type NotificationCopy = {
  type: "usage_threshold" | "usage_limit_reached";
  severity: "warning" | "critical";
  title: string;
  message: string;
};

const EGRESS_USAGE_TYPES = [
  "object_egress_bytes",
  "app_egress_bytes",
  "database_egress_bytes",
  "storage_egress_bytes",
  "database_network_out_bytes",
  "storage_network_out_bytes",
  "app_network_out_bytes",
  "bandwidth_out_bytes",
];

function isUniqueError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export function highestCrossedThreshold(percent: number): UsageThresholdPercent | null {
  if (!Number.isFinite(percent)) return null;
  if (percent >= 100) return 100;
  if (percent >= 90) return 90;
  if (percent >= 75) return 75;
  return null;
}

export function usagePercent(current: bigint, limit: bigint | null): number | null {
  if (limit === null || limit <= 0n) return null;
  return Number((current * 10_000n) / limit) / 100;
}

export function formatUsageBytes(value: bigint): string {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let n = Number(value);
  let idx = 0;
  while (n >= 1024 && idx < units.length - 1) {
    n /= 1024;
    idx += 1;
  }
  return `${idx === 0 ? n.toFixed(0) : n.toFixed(n >= 10 ? 1 : 2)} ${units[idx]}`;
}

export function usageThresholdCopy(
  resourceName: string,
  threshold: UsageThresholdPercent,
  current: string,
  limit: string,
): NotificationCopy {
  if (threshold >= 100) {
    return {
      type: "usage_limit_reached",
      severity: "critical",
      title: `You've reached your ${resourceName} limit`,
      message: `Your ${resourceName} usage has reached your plan limit: ${current} of ${limit}. New usage may be blocked until you upgrade or reduce usage.`,
    };
  }
  if (threshold >= 90) {
    return {
      type: "usage_threshold",
      severity: "critical",
      title: `You've used 90% of your ${resourceName} limit`,
      message: `Your ${resourceName} usage is almost at your plan limit: ${current} of ${limit}. Upgrade or reduce usage to avoid service interruption.`,
    };
  }
  return {
    type: "usage_threshold",
    severity: "warning",
    title: `You've used 75% of your ${resourceName} limit`,
    message: `Your ${resourceName} usage is at ${current} of ${limit}. Consider upgrading before you hit the limit.`,
  };
}

function thresholdTemplate(threshold: UsageThresholdPercent) {
  return threshold >= 100 ? "usage_limit_100" : threshold >= 90 ? "usage_threshold_90" : "usage_threshold_75";
}

function thresholdEventKey(input: {
  userId: string;
  organizationId: string;
  projectId?: string | null;
  usagePeriodId?: string | null;
  resourceType: string;
  threshold: UsageThresholdPercent;
}): string {
  return [
    "usage-threshold",
    input.userId,
    input.organizationId,
    input.projectId ?? "org",
    input.usagePeriodId ?? "period",
    input.resourceType,
    input.threshold,
  ].join(":");
}

async function ensureOpenUsagePeriod(organizationId: string) {
  const now = new Date();
  const existing = await prisma.usagePeriod.findFirst({
    where: { organizationId, status: "open", periodEnd: { gt: now } },
    orderBy: { periodStart: "desc" },
  });
  if (existing) return existing;
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return prisma.usagePeriod.create({
    data: { organizationId, periodStart: start, periodEnd: end, status: "open" },
  });
}

export async function ensureNotificationPreferences(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function egressBytes(organizationId: string, usagePeriodId: string): Promise<bigint> {
  const grouped = await prisma.usageRollup.aggregate({
    where: {
      organizationId,
      usagePeriodId,
      usageType: { in: EGRESS_USAGE_TYPES },
    },
    _sum: { quantity: true },
  });
  return grouped._sum.quantity ?? 0n;
}

async function usageResources(organizationId: string, usagePeriodId: string): Promise<ThresholdResource[]> {
  const effective = await planResourceService.getEffectivePlanResources({ organizationId });
  const [db, storage, egress] = await Promise.all([
    prisma.database.aggregate({
      where: {
        project: { organizationId },
        status: { notIn: ["deleted"] },
      },
      _sum: { currentSizeBytes: true },
    }),
    prisma.storageBucket.aggregate({
      where: {
        project: { organizationId },
        status: { notIn: ["deleted"] },
      },
      _sum: { currentStorageBytes: true },
    }),
    egressBytes(organizationId, usagePeriodId),
  ]);

  const limit = (key: ThresholdResource["limitKey"]): bigint | null => {
    const raw = effective.limits[key];
    if (raw === null || raw === undefined) return null;
    return BigInt(Math.max(0, Math.floor(raw)));
  };

  return [
    {
      eventResourceType: "database_storage",
      notificationResourceType: "database",
      limitKey: "max_database_storage_bytes",
      resourceName: "database storage",
      currentBytes: db._sum.currentSizeBytes ?? 0n,
      limitBytes: limit("max_database_storage_bytes"),
    },
    {
      eventResourceType: "object_storage",
      notificationResourceType: "object_storage",
      limitKey: "max_object_storage_bytes",
      resourceName: "object storage",
      currentBytes: storage._sum.currentStorageBytes ?? 0n,
      limitBytes: limit("max_object_storage_bytes"),
    },
    {
      eventResourceType: "egress",
      notificationResourceType: "egress",
      limitKey: "max_egress_bytes",
      resourceName: "egress",
      currentBytes: egress,
      limitBytes: limit("max_egress_bytes"),
    },
  ];
}

async function notifyUserThreshold(input: {
  user: { id: string; email: string; emailVerified: boolean; name: string | null };
  organization: { id: string; name: string };
  periodId: string;
  planName: string | null;
  resource: ThresholdResource;
  threshold: UsageThresholdPercent;
}): Promise<"created" | "skipped"> {
  const prefs = await ensureNotificationPreferences(input.user.id);
  const current = formatUsageBytes(input.resource.currentBytes);
  const limit = formatUsageBytes(input.resource.limitBytes ?? 0n);
  const copy = usageThresholdCopy(input.resource.resourceName, input.threshold, current, limit);
  const actionUrl = "/console/usage";
  const idempotencyKey = thresholdEventKey({
    userId: input.user.id,
    organizationId: input.organization.id,
    usagePeriodId: input.periodId,
    resourceType: input.resource.eventResourceType,
    threshold: input.threshold,
  });
  const emailAllowed = prefs.usageThresholdEmail && input.user.emailVerified;
  const emailStatus = prefs.usageThresholdEmail
    ? input.user.emailVerified
      ? "pending"
      : "skipped"
    : "skipped";
  const emailError = prefs.usageThresholdEmail
    ? input.user.emailVerified
      ? null
      : "Recipient email is not verified."
    : "Usage threshold email preference is disabled.";
  const templateVariables = {
    userName: input.user.name ?? input.user.email,
    resourceName: input.resource.resourceName,
    currentUsage: current,
    limit,
    percent: input.threshold,
    actionUrl: new URL(actionUrl, env.USERAPP_BASE_URL).toString(),
    planName: input.planName,
    organizationName: input.organization.name,
  };
  const higherOrEqualAlreadySent = await prisma.usageThresholdEvent.findFirst({
    where: {
      userId: input.user.id,
      organizationId: input.organization.id,
      usagePeriodId: input.periodId,
      resourceType: input.resource.eventResourceType,
      thresholdPercent: { gte: input.threshold },
    },
    select: { id: true },
  });
  if (higherOrEqualAlreadySent) return "skipped";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          userId: input.user.id,
          organizationId: input.organization.id,
          resourceType: input.resource.notificationResourceType,
          type: copy.type,
          severity: copy.severity,
          title: copy.title,
          message: copy.message,
          actionLabel: "View usage",
          actionUrl,
          idempotencyKey: `notification:${idempotencyKey}`,
          metadata: {
            thresholdPercent: input.threshold,
            currentValueBytes: input.resource.currentBytes.toString(),
            limitValueBytes: input.resource.limitBytes?.toString() ?? null,
            email: {
              to: input.user.email,
              templateKey: thresholdTemplate(input.threshold),
              variables: templateVariables,
              essential: false,
            },
          },
        },
      });
      await tx.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: "in_app",
          status: prefs.usageThresholdInApp ? "sent" : "skipped",
          sentAt: prefs.usageThresholdInApp ? new Date() : null,
          errorMessage: prefs.usageThresholdInApp ? null : "Usage threshold in-app preference is disabled.",
        },
      });
      const emailDelivery = await tx.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: "email",
          status: emailStatus,
          errorMessage: emailError,
          metadata: {
            to: input.user.email,
            templateKey: thresholdTemplate(input.threshold),
            variables: templateVariables,
            essential: false,
          },
        },
      });
      await tx.usageThresholdEvent.create({
        data: {
          userId: input.user.id,
          organizationId: input.organization.id,
          usagePeriodId: input.periodId,
          resourceType: input.resource.eventResourceType,
          thresholdPercent: input.threshold,
          currentValueBytes: input.resource.currentBytes,
          limitValueBytes: input.resource.limitBytes,
          notificationId: notification.id,
          emailDeliveryId: emailDelivery.id,
          idempotencyKey,
        },
      });
      return { emailDeliveryId: emailDelivery.id };
    });
    if (emailAllowed) await queueEmailDelivery(result.emailDeliveryId);
    return "created";
  } catch (err) {
    if (isUniqueError(err)) return "skipped";
    throw err;
  }
}

export async function checkUsageThresholds(): Promise<{ organizations: number; notifications: number }> {
  const orgs = await prisma.organization.findMany({
    where: { status: "active" },
    include: {
      members: {
        where: { role: { in: ["owner", "admin", "billing"] } },
        include: { user: true },
      },
      subscriptions: {
        where: { status: { in: ["active", "trialing", "past_due"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: true },
      },
    },
  });

  let notifications = 0;
  for (const org of orgs) {
    if (org.members.length === 0) continue;
    const period = await ensureOpenUsagePeriod(org.id);
    const resources = await usageResources(org.id, period.id);
    for (const resource of resources) {
      const percent = usagePercent(resource.currentBytes, resource.limitBytes);
      if (percent === null) continue;
      const threshold = highestCrossedThreshold(percent);
      if (!threshold) continue;
      for (const member of org.members) {
        if (member.user.status !== "active") continue;
        const result = await notifyUserThreshold({
          user: member.user,
          organization: org,
          periodId: period.id,
          planName: org.subscriptions[0]?.plan.name ?? null,
          resource,
          threshold,
        });
        if (result === "created") notifications += 1;
      }
    }
  }
  return { organizations: orgs.length, notifications };
}

export async function createGoogleWelcomeNotification(userId: string): Promise<{ created: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { orgMemberships: { include: { organization: true }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!user || user.status !== "active") return { created: false };
  const org = user.orgMemberships[0]?.organization ?? null;
  const prefs = await ensureNotificationPreferences(user.id);
  const idempotencyKey = `welcome:google:${user.id}`;
  const actionUrl = "/console";
  const templateVariables = {
    userName: user.name ?? user.email,
    organizationName: org?.name ?? null,
    actionUrl: new URL(actionUrl, env.USERAPP_BASE_URL).toString(),
  };
  const emailStatus = prefs.welcomeEmail && user.emailVerified ? "pending" : "skipped";
  const emailError = prefs.welcomeEmail
    ? user.emailVerified
      ? null
      : "Recipient email is not verified."
    : "Welcome email preference is disabled.";

  try {
    const result = await prisma.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          userId: user.id,
          organizationId: org?.id ?? null,
          type: "welcome",
          severity: "success",
          title: "Welcome to Swyftstack",
          message: "Your Swyftstack console is ready. Create projects, databases, and storage buckets from one place.",
          actionLabel: "Go to Console",
          actionUrl,
          idempotencyKey,
          metadata: {
            authProvider: "google",
            email: {
              to: user.email,
              templateKey: "welcome_google_signup",
              variables: templateVariables,
              essential: false,
            },
          },
        },
      });
      await tx.notificationDelivery.create({
        data: { notificationId: notification.id, channel: "in_app", status: "sent", sentAt: new Date() },
      });
      const emailDelivery = await tx.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: "email",
          status: emailStatus,
          errorMessage: emailError,
          metadata: {
            to: user.email,
            templateKey: "welcome_google_signup",
            variables: templateVariables,
            essential: false,
          },
        },
      });
      return { emailDeliveryId: emailDelivery.id };
    });
    if (emailStatus === "pending") await queueEmailDelivery(result.emailDeliveryId);
    return { created: true };
  } catch (err) {
    if (isUniqueError(err)) return { created: false };
    throw err;
  }
}
