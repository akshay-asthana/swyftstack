import { redirect } from "next/navigation";
import { prisma } from "quickdock-shared";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

async function ensureOwnedOrg(userId: string, name: string) {
  const existing = await prisma.organization.findFirst({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.organization.create({
    data: {
      name: `${name}'s workspace`,
      ownerUserId: userId,
      members: { create: { userId, role: "owner" } },
    },
  });
}

async function choosePlan(formData: FormData) {
  "use server";
  const user = await requireUser();
  const planId = String(formData.get("planId") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));
  const plan = await prisma.plan.findFirst({ where: { id: planId, status: "active" } });
  if (!plan) redirect("/pricing");

  const org = await ensureOwnedOrg(user.id, user.name ?? user.email);
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await prisma.subscription.updateMany({
    where: { organizationId: org.id, status: { in: ["active", "trialing", "past_due"] } },
    data: { status: "cancelled", cancelAtPeriodEnd: false },
  });
  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId: plan.id,
      status: "active",
      provider: "self_service",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
  redirect(next);
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  await requireUser();
  const plans = await prisma.plan.findMany({
    where: { status: "active" },
    orderBy: { priceCents: "asc" },
    include: { limits: true, features: true },
  });
  const next = safeNext(searchParams.next);

  return (
    <>
      <div className="topbar"><span className="brand">Quickdock</span></div>
      <div className="wrap">
        <h1 className="h1">Choose a plan</h1>
        <p className="sub">A plan is required before creating projects and provisioning resources.</p>
        <div className="price-grid">
          {plans.map((plan) => (
            <form action={choosePlan} className="card price-card" key={plan.id}>
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="next" value={next} />
              <div className="brand">{plan.name}</div>
              <div className="price">${(plan.priceCents / 100).toFixed(0)}<span>/mo</span></div>
              <p className="small">{plan.limits?.maxProjects ?? "Unlimited"} projects · {plan.limits?.maxDatabases ?? "Unlimited"} databases</p>
              <p className="small">{plan.features.filter((f) => f.enabled).length} features included</p>
              <button className="btn" type="submit">Select plan</button>
            </form>
          ))}
        </div>
      </div>
    </>
  );
}
