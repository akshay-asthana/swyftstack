// Public pricing page. Reads live plans from the DB when available so the
// page stays in sync with what the admin can sell. Falls back to the
// content-file pricing if the plans table is empty. The "Choose plan"
// action remains a server action - signed-out visitors get routed through
// /signup, signed-in visitors land on a real subscription.
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "swyftstack-shared";
import { currentUser } from "@/lib/auth";
import { MarketingShell } from "@/components/marketing/shell";
import { Section, SectionHead, FAQSection } from "@/components/marketing/sections";
import { CTASection } from "@/components/marketing/sections";
import { ComparisonTable } from "@/components/marketing/comparison-table";
import { ArrowRightIcon, CheckIcon } from "@/components/marketing/icons";
import { HeroBackgroundAnimation } from "@/components/marketing/hero-background";
import { FaqJsonLd, SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing - Swyftstack",
  description: "Honest pricing for managed PostgreSQL, object storage, and static site hosting. Starter $19/mo. Pro $99/mo. Enterprise: talk to us.",
  alternates: { canonical: `${SITE_URL}/pricing` },
  openGraph: {
    title: "Pricing - Swyftstack",
    description: "Pick a plan. Pay monthly or save with annual. Upgrade or cancel anytime.",
    url: `${SITE_URL}/pricing`,
  },
};

const FAQ_ITEMS = [
  { q: "Why no free tier?", a: "Free tiers attract users who get poor support and force paying customers to subsidize them. We'd rather charge a fair price and treat every project seriously." },
  { q: "How does the launch offer work?", a: "The first 500 customers get Starter at $9/mo or Growth at $49/mo for their first two months. After that you roll onto our standard pricing automatically - no contract, no surprise upsell." },
  { q: "What happens when I hit a usage limit?", a: "We email you at 80% and 95%. Your database keeps serving traffic. Upgrade in one click." },
  { q: "Can I change plans?", a: "Yes. Upgrades are instant. Downgrades take effect at the end of your billing cycle. No phone call required." },
  { q: "Do you charge for inbound traffic?", a: "No. Only egress counts toward your bandwidth limit." },
  { q: "How much do I save with annual?", a: "21% on Starter, 16% on Growth. Invoiced up front so finance can expense it." },
  { q: "Is there a discount for nonprofits or students?", a: "Yes - email support@swyftstack.com with a few sentences about what you're building and we'll set you up." },
];

// Static plan content from the marketing copy. Used when the DB has no
// published plans (and as the source of truth for plan tagline + feature
// bullets, which the DB doesn't store).
//
// Launch offer (first 500 customers only): Starter is $9/mo for the first
// two months, then rolls to $19/mo. Growth is $49/mo for two months, then
// rolls to $99/mo. We surface the launch price as the prominent number and
// the rollover price below it.
const STATIC_PLANS = [
  {
    slug: "starter",
    name: "Starter",
    monthly: 19,
    annual: 15,
    launchPrice: 9,
    tagline: "For solo founders, freelancers, and the first version of an idea.",
    features: [
      "3 PostgreSQL databases",
      "10 GB database storage total",
      "100 GB object storage",
      "500 GB egress / mo",
      "Daily backups, 7-day retention",
      "One-click restore + migration in",
      "5 static sites with custom domains",
      "2 team members",
      "99.9% uptime SLA",
    ],
    cta: "Start with Starter",
  },
  {
    slug: "growth",
    name: "Growth",
    monthly: 99,
    annual: 83,
    launchPrice: 49,
    tagline: "For agencies, growing teams, and apps doing real numbers.",
    popular: true,
    features: [
      "20 PostgreSQL databases",
      "100 GB database storage total",
      "1 TB object storage",
      "5 TB egress / mo",
      "Daily backups, 30-day retention",
      "Unlimited static sites & custom domains",
      "10 team members",
      "Email support, 24-hour response",
      "99.95% uptime SLA",
    ],
    cta: "Go Growth",
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    monthly: null,
    annual: null,
    launchPrice: null,
    tagline: "When uptime is the whole business.",
    features: [
      "Unlimited everything",
      "Custom infrastructure sizing",
      "Dedicated Slack channel",
      "Custom backup retention",
      "99.99% uptime SLA",
      "Custom contracts, DPA, security review",
      "SSO via SAML",
    ],
    cta: "Talk to the founder",
  },
];

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
  searchParams: { next?: string; billing?: string };
}) {
  const user = await currentUser();
  const next = safeNext(searchParams.next);
  const annual = (searchParams.billing ?? "annual") !== "monthly";

  // Live DB plans drive the buttons (so admins can adjust pricing). Static
  // plan content (tagline, bullets) layers on top, matched by slug.
  const dbPlans = await prisma.plan.findMany({
    where: { status: "active" }, orderBy: { priceCents: "asc" },
  });
  const dbPlanBySlug = new Map(dbPlans.map((p) => [p.slug, p]));

  return (
    <MarketingShell>
      <FaqJsonLd items={FAQ_ITEMS} />

      <section className="m-hero" style={{ paddingBottom: 32 }}>
        <HeroBackgroundAnimation />
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />Honest pricing. No surprises on your bill.</div>
          <h1>Pick a plan. Pay <span className="m-text-grad">predictably</span>.</h1>
          <p className="m-hero-lead">
            One price per plan. Upgrade or cancel in one click.
          </p>
          <div className="m-mt-6 m-row" style={{ justifyContent: "center" }}>
            <nav className="m-price-toggle" aria-label="Billing cadence">
              <Link href="/pricing?billing=monthly" className={!annual ? "active" : ""}>Monthly</Link>
              <Link href="/pricing?billing=annual" className={annual ? "active" : ""}>
                Annual <span className="m-tag m-tag-ok" style={{ marginLeft: 6 }}>save 21%</span>
              </Link>
            </nav>
          </div>
        </div>
      </section>

      <Section tight>
        <div className="m-price-grid">
          {STATIC_PLANS.map((plan) => {
            const dbMatch = dbPlanBySlug.get(plan.slug);
            const isCustom = plan.monthly == null;
            const standard = !isCustom ? (annual ? plan.annual : plan.monthly) : null;
            const launch = plan.launchPrice;
            const popular = !!plan.popular;
            return (
              <form
                key={plan.slug}
                action={dbMatch ? choosePlan : undefined}
                className={`m-plan ${popular ? "m-plan-popular" : ""}`}
              >
                {dbMatch && <input type="hidden" name="planId" value={dbMatch.id} />}
                {dbMatch && <input type="hidden" name="next" value={next} />}

                <div className="m-plan-name">{plan.name}</div>
                <div className="m-plan-desc">{plan.tagline}</div>
                {isCustom ? (
                  <div className="m-plan-price">Custom</div>
                ) : (
                  <div className="m-plan-price">
                    ${launch}<small>/mo</small>
                    <span className="m-plan-old">${standard}/mo</span>
                  </div>
                )}
                {!isCustom && (
                  <div className="m-plan-launch">
                    Launch offer · first 2 months, then ${standard}/mo
                  </div>
                )}
                <ul className="m-plan-list">
                  {plan.features.map((f, i) => (
                    <li key={i}><CheckIcon size={16} /> <span>{f}</span></li>
                  ))}
                </ul>
                {isCustom ? (
                  <Link href="/about" className="m-btn m-btn-secondary m-btn-block">{plan.cta}</Link>
                ) : dbMatch ? (
                  <button className={`m-btn m-btn-block ${popular ? "m-btn-primary" : "m-btn-secondary"}`} type="submit">
                    {user ? `Select ${plan.name}` : plan.cta}
                  </button>
                ) : (
                  <Link href={`/signup?plan=${plan.slug}`} className={`m-btn m-btn-block ${popular ? "m-btn-primary" : "m-btn-secondary"}`}>
                    {plan.cta}
                  </Link>
                )}
              </form>
            );
          })}
        </div>

        <div className="m-banner m-mt-7">
          <span style={{ fontSize: 18 }}>🎉</span>
          <strong>Launch offer · first 500 customers only</strong>
          <span>Starter at $9/mo or Growth at $49/mo for your first 2 months. Applied automatically at signup.</span>
        </div>

        {dbPlans.length === 0 && (
          <p className="m-muted m-text-center m-mt-5">
            Live plan IDs aren&rsquo;t configured yet. <Link href="/signup">Create an account</Link> and pick a plan from the console.
          </p>
        )}
      </Section>

      <Section alt>
        <SectionHead
          eyebrow="What everyone gets"
          title="The boring stuff, done well"
          subtitle="On every plan: SSL on every database, daily encrypted backups, plain-English errors, and a real human answering support emails."
        />
        <ComparisonTable
          columns={[
            { label: "Feature" },
            { label: "Starter", sublabel: "$9 → $19/mo" },
            { label: "Growth", sublabel: "$49 → $99/mo", highlight: true },
            { label: "Enterprise", sublabel: "Custom" },
          ]}
          rows={[
            { label: "PostgreSQL databases", cells: ["", "3", "20", "Unlimited"] },
            { label: "Database storage", cells: ["", "10 GB", "100 GB", "Custom"] },
            { label: "Object storage", cells: ["", "100 GB", "1 TB", "Custom"] },
            { label: "Egress / mo", cells: ["", "500 GB", "5 TB", "Custom"] },
            { label: "Daily backups", cells: ["", true, true, true] },
            { label: "Backup retention", cells: ["", "7 days", "30 days", "Custom"] },
            { label: "One-click restore", cells: ["", true, true, true] },
            { label: "One-click migration in", cells: ["", true, true, true] },
            { label: "Static sites", cells: ["", "5", "Unlimited", "Unlimited"] },
            { label: "Custom domains", cells: ["", "5", "Unlimited", "Unlimited"] },
            { label: "Team members", cells: ["", "2", "10", "Unlimited"] },
            { label: "Email support", cells: ["", "Best effort", "24h SLA", "Slack channel"] },
            { label: "Uptime SLA", cells: ["", "99.9%", "99.95%", "99.99%"] },
            { label: "Audit logs", cells: ["", false, true, true] },
            { label: "SSO (SAML)", cells: ["", false, false, true] },
            { label: "Webhook alerts", cells: ["", false, true, true] },
            { label: "Custom contract / DPA", cells: ["", false, false, true] },
          ]}
        />
      </Section>

      <FAQSection title="Pricing FAQ" items={FAQ_ITEMS} />

      <CTASection
        title="Two minutes to sign up. Sixty seconds to deploy."
        subtitle="Pick Starter or Pro. Switch later. Cancel in one click."
        primary={{ label: user ? "Open console" : "Start with Starter", href: user ? "/console" : "/signup" }}
        secondary={{ label: "Compare to your provider", href: "/migrate" }}
      />
    </MarketingShell>
  );
}
