import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { Icon } from "@/components/icons";
import { bytes } from "@/components/ui";

export const dynamic = "force-dynamic";

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

async function ensureOwnedOrg(userId: string, name: string) {
  const existing = await prisma.organization.findFirst({
    where: { ownerUserId: userId }, orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.organization.create({
    data: {
      name: `${name}'s workspace`, ownerUserId: userId,
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
      organizationId: org.id, planId: plan.id, status: "active", provider: "self_service",
      currentPeriodStart: now, currentPeriodEnd: periodEnd,
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
    where: { status: "active" }, orderBy: { priceCents: "asc" },
    include: { limits: true, features: true },
  });
  const next = safeNext(searchParams.next);
  const topPrice = Math.max(0, ...plans.map((p) => p.priceCents));

  return (
    <div className="wrap" style={{ maxWidth: 1040, margin: "0 auto" }}>
      <div className="brand-row" style={{ padding: "24px 0 8px" }}>
        <div className="brand-mark"><Icon name="rocket" size={18} /></div>
        <div>
          <div className="brand-name">Swyftstack</div>
          <div className="brand-sub">Cloud Platform</div>
        </div>
        <Link className="small right" href="/">Back to dashboard</Link>
      </div>
      <h1 className="h1" style={{ fontSize: 28, marginTop: 18 }}>Choose your plan</h1>
      <p className="sub">An active plan is required before creating projects and provisioning resources.</p>

      <div className="price-grid" style={{ marginTop: 8 }}>
        {plans.map((plan) => {
          const featured = plan.priceCents === topPrice && plans.length > 1;
          const features = plan.features.filter((f) => f.enabled);
          return (
            <form action={choosePlan} className={`card price-card${featured ? " featured" : ""}`} key={plan.id}>
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="next" value={next} />
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="panel-title">{plan.name}</span>
                {featured && <span className="badge ok plain">Most popular</span>}
              </div>
              <div className="price">${(plan.priceCents / 100).toFixed(0)}<span>/mo</span></div>
              <div style={{ margin: "4px 0 8px" }}>
                <div className="feature-li"><Icon name="check" size={14} />{plan.limits?.maxProjects ?? "Unlimited"} projects</div>
                <div className="feature-li"><Icon name="check" size={14} />{plan.limits?.maxDatabases ?? "Unlimited"} databases</div>
                <div className="feature-li"><Icon name="check" size={14} />{plan.limits?.maxObjectStorageBytes ? bytes(plan.limits.maxObjectStorageBytes) : "Unlimited"} object storage</div>
                <div className="feature-li"><Icon name="check" size={14} />{plan.limits?.maxTeamMembers ?? "Unlimited"} team members</div>
                <div className="feature-li"><Icon name="check" size={14} />{features.length} platform features</div>
              </div>
              <button className={`btn${featured ? "" : " secondary"}`} type="submit" style={{ width: "100%" }}>
                Select {plan.name}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
