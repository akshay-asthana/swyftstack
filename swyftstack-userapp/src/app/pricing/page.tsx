// Public pricing page. Lists active plans from the DB so the page is in
// sync with the admin's plan editor. Signed-in users can pick a plan
// directly; visitors are redirected through /signup.
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "swyftstack-shared";
import { currentUser } from "@/lib/auth";
import { MarketingShell } from "@/components/marketing-shell";
import { bytes } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — Swyftstack",
  description: "Simple plans for databases, storage, and app hosting. Pick the one that fits.",
};

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/console";
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
  const user = await currentUser();
  const planId = String(formData.get("planId") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/console"));
  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(`/pricing?planId=${planId}`)}`);
  }
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
  const user = await currentUser();
  const plans = await prisma.plan.findMany({
    where: { status: "active" }, orderBy: { priceCents: "asc" },
    include: { limits: true, features: true },
  });
  const next = safeNext(searchParams.next);
  const topPrice = Math.max(0, ...plans.map((p) => p.priceCents));

  return (
    <MarketingShell>
      <section className="mk-section">
        <div className="mk-container" style={{ textAlign: "center", maxWidth: 760 }}>
          <h1 className="mk-h1" style={{ fontSize: 36 }}>Simple, transparent pricing</h1>
          <p className="mk-lead">
            Start free. Pick the plan that fits when you outgrow it. No hidden fees, no per-seat surprises.
          </p>
        </div>
      </section>

      <section className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-container">
          <div className="mk-pricing-grid">
            {plans.map((plan) => {
              const featured = plan.priceCents === topPrice && plans.length > 1;
              const features = plan.features.filter((f) => f.enabled);
              return (
                <form action={choosePlan} className="mk-plan" key={plan.id} style={featured ? { borderColor: "var(--accent)" } : undefined}>
                  <input type="hidden" name="planId" value={plan.id} />
                  <input type="hidden" name="next" value={next} />
                  <div className="row between">
                    <strong>{plan.name}</strong>
                    {featured && <span className="tag" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>Most popular</span>}
                  </div>
                  <div className="mk-plan-price">
                    ${(plan.priceCents / 100).toFixed(0)}
                    <small style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>/mo</small>
                  </div>
                  {plan.hasTrial && plan.trialDays && (
                    <p className="small muted" style={{ margin: 0 }}>
                      {plan.trialDays}-day trial
                      {plan.trialPriceCents != null ? ` · $${(plan.trialPriceCents / 100).toFixed(0)}/mo` : ""}
                    </p>
                  )}
                  <ul>
                    <li>{plan.limits?.maxProjects ?? "Unlimited"} projects</li>
                    <li>{plan.limits?.maxDatabases ?? "Unlimited"} databases</li>
                    <li>{plan.limits?.maxStorageBuckets ?? "Unlimited"} storage buckets</li>
                    <li>{plan.limits?.maxObjectStorageBytes ? bytes(plan.limits.maxObjectStorageBytes) : "Unlimited"} object storage</li>
                    <li>{plan.limits?.maxVcpuSeconds ? `${Math.round(Number(plan.limits.maxVcpuSeconds) / 3600)} vCPU-hours / mo` : "Unlimited vCPU"}</li>
                    <li>{plan.limits?.maxTeamMembers ?? "Unlimited"} team members</li>
                    <li>{features.length} platform features</li>
                  </ul>
                  <button className="btn" type="submit" style={{ width: "100%" }}>
                    {user ? `Select ${plan.name}` : "Get started"}
                  </button>
                </form>
              );
            })}
          </div>
          {plans.length === 0 && (
            <p className="mk-lead" style={{ textAlign: "center" }}>
              Plans are being set up. <Link href="/help">Contact us</Link> to get early access.
            </p>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}
