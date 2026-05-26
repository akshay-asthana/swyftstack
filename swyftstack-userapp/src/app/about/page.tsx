// /about - bespoke About page. Reflects the philosophy laid out in
// MARKETING_PAGES_CONTENT.md §24, with a more editorial layout than the
// product / alternative pages. Content is fixed in code; not CMS-backed.
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import { Section, SectionHead, CTASection } from "@/components/marketing/sections";
import { HeroBackgroundAnimation } from "@/components/marketing/hero-background";
import { OrganizationJsonLd, SITE_URL } from "@/components/marketing/jsonld";
import { ArrowRightIcon, BoltIcon, ClockIcon, LockIcon, ShieldIcon } from "@/components/marketing/icons";
import { authTarget } from "@/lib/early-access";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Why we built Swyftstack: managed PostgreSQL and S3-compatible storage for teams who'd rather ship features than babysit infrastructure. Predictable bills, 47-second provisioning, a real human on every support email.";

export const metadata: Metadata = {
  title: "About Swyftstack — the focused backend platform | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: { title: "About Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/about`, type: "website" },
};

const VALUES: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <BoltIcon size={20} />,
    title: "Speed is a feature",
    body: "Deploying a database in 47 seconds isn't a marketing number - it's a design constraint that shapes everything else we build. If provisioning is fast, restores are fast. If restores are fast, on-call is calmer.",
  },
  {
    icon: <LockIcon size={20} />,
    title: "Simplicity is a feature",
    body: "We've removed words from the dashboard for a year. We're not done. Every page exists because it makes a specific decision easier, not because we shipped something and forgot to delete it.",
  },
  {
    icon: <ClockIcon size={20} />,
    title: "Predictability is a feature",
    body: "Your bill should be the same number every month unless you change something. Usage-based pricing is a fine business model for the vendor; it's a worse experience for the customer.",
  },
  {
    icon: <ShieldIcon size={20} />,
    title: "Honesty is a feature",
    body: "If a competitor is right for your use case, we'll tell you. We'd rather lose a sale than mis-fit a customer. Read our Supabase / Railway / Heroku pages - we name the cases each one wins.",
  },
];

const MILESTONES: { when: string; what: string }[] = [
  { when: "2025-08", what: "First customer signs up. Cold-start provisioning is 4 minutes." },
  { when: "2025-11", what: "Cold-start provisioning crosses below 60 seconds for the first time." },
  { when: "2026-01", what: "Three-click migration ships to private beta. First Supabase migrant lands." },
  { when: "2026-03", what: "First weekly restore drill catches a regression nobody had noticed." },
  { when: "2026-05", what: "V1 launches publicly. Median deploy: 47 seconds." },
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <OrganizationJsonLd />

      {/* Hero */}
      <section className="m-hero">
        <HeroBackgroundAnimation />
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />About Swyftstack</div>
          <h1>
            We built Swyftstack because backend hosting was getting <span className="m-text-grad">harder</span>, not easier.
          </h1>
          <p className="m-hero-lead">
            Two products — managed PostgreSQL and S3-compatible storage — done well. Predictable bills, instant provisioning, and a real human on every support email.
          </p>
        </div>
      </section>

      {/* The story */}
      <Section borderTop>
        <div className="m-container-narrow" style={{ marginInline: "auto" }}>
          <div className="m-prose">
            <h2>The story</h2>
            <p>
              Every year, cloud platforms add more features, more dashboards, more tabs, more services that depend on other services. Pricing pages get longer. Bills get harder to forecast. The <em>thing</em> most developers actually need — &ldquo;a database for my app, and somewhere to store user files&rdquo; — keeps getting buried under bundled features they didn&rsquo;t ask for.
            </p>
            <p>
              We watched friends launch perfectly fine side projects and then quietly shut them down a year later because the platform-fee creep made them uneconomical. We watched a startup we admire move off a popular BaaS not because anything was technically wrong, but because they couldn&rsquo;t predict next month&rsquo;s bill within a 3× range.
            </p>
            <p>
              So we built Swyftstack: two products done well, on one dashboard, on one invoice. We don&rsquo;t ship auth, edge functions, generated APIs, or realtime channels. There&rsquo;s nothing wrong with those — they&rsquo;re just not what we&rsquo;re for. We host your database and your files; you wire them up to the framework, auth, and hosting you already use.
            </p>
            <p>
              That focus is the whole point. It&rsquo;s what makes 47-second provisioning possible. It&rsquo;s why a single founder can read every support email and reply within an hour. It&rsquo;s why the pricing page has three tiers and a published overage rate instead of a calculator.
            </p>
          </div>
        </div>
      </Section>

      {/* Who we're for / not for */}
      <Section alt>
        <SectionHead
          eyebrow="Who we're for"
          title="Honest about fit, both ways."
          subtitle="The fastest way to be a good vendor is to tell people when we're the wrong choice. Here's a checklist."
        />
        <div className="m-grid m-grid-2">
          <div className="m-card">
            <h3 style={{ fontSize: 19, marginBottom: 8 }}>You&rsquo;ll like Swyftstack if&hellip;</h3>
            <ul className="m-plan-list m-mt-3">
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-ok)" }}><path d="M5 12l5 5L20 7" /></svg><span>You&rsquo;re shipping a real app on Vercel/Render/Fly/Railway and want a no-drama Postgres + storage backend.</span></li>
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-ok)" }}><path d="M5 12l5 5L20 7" /></svg><span>You&rsquo;re tired of meter-based pricing and want a flat number you can budget for.</span></li>
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-ok)" }}><path d="M5 12l5 5L20 7" /></svg><span>You prefer real PostgreSQL with no proxy in front of it.</span></li>
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-ok)" }}><path d="M5 12l5 5L20 7" /></svg><span>You want to use Clerk / NextAuth / Auth0 for auth, not a bundled one you can&rsquo;t remove.</span></li>
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-ok)" }}><path d="M5 12l5 5L20 7" /></svg><span>You&rsquo;d rather email a founder than file a Zendesk ticket.</span></li>
            </ul>
          </div>
          <div className="m-card">
            <h3 style={{ fontSize: 19, marginBottom: 8 }}>You&rsquo;ll be happier elsewhere if&hellip;</h3>
            <ul className="m-plan-list m-mt-3">
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-text-muted)" }}><path d="M6 6l12 12M18 6L6 18" /></svg><span>You want a full BaaS (auth + edge functions + realtime + generated APIs) in one box — Supabase, Convex, or Appwrite are excellent at that.</span></li>
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-text-muted)" }}><path d="M6 6l12 12M18 6L6 18" /></svg><span>You need a free tier — we don&rsquo;t have one. Paying customers fund the support; we&rsquo;d rather charge less to people who pay than subsidise freeloaders.</span></li>
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-text-muted)" }}><path d="M6 6l12 12M18 6L6 18" /></svg><span>You need to self-host inside your own VPC — that&rsquo;s a different product. Run PostgreSQL yourself; you&rsquo;ll get the isolation you need.</span></li>
              <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-text-muted)" }}><path d="M6 6l12 12M18 6L6 18" /></svg><span>You need a database other than Postgres (MySQL, MongoDB, DynamoDB) — we&rsquo;re Postgres-only on purpose.</span></li>
            </ul>
          </div>
        </div>
      </Section>

      {/* What we believe */}
      <Section alt>
        <SectionHead
          eyebrow="What we believe"
          title="Four features that aren't on the pricing page"
          subtitle="Speed, simplicity, predictability, honesty. They sound like marketing words. We make engineering decisions with them."
        />
        <div className="m-grid m-grid-2">
          {VALUES.map((v) => (
            <div key={v.title} className="m-card">
              <div className="m-row m-row-tight">
                <span className="m-feature-icon" style={{ width: 36, height: 36, marginBottom: 0 }}>{v.icon}</span>
                <span style={{ fontWeight: 720, color: "var(--m-text-strong)", fontSize: 17 }}>{v.title}</span>
              </div>
              <p className="m-feature-body m-mt-3">{v.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Why we charge for everything */}
      <Section>
        <div className="m-container-narrow" style={{ marginInline: "auto" }}>
          <div className="m-prose">
            <h2>Why we charge for everything</h2>
            <p>
              Free tiers force paying customers to subsidize freeloaders. We answer every support email personally - we can
              only do that if we&rsquo;re paid. If $19/month (or $9 during launch) isn&rsquo;t right for you, we&rsquo;ll happily
              help you find a free alternative.
            </p>
            <h2>Why we don&rsquo;t offer self-hosting</h2>
            <p>
              The whole point of Swyftstack is that you don&rsquo;t operate infrastructure. Self-hosting would ship the same
              complexity we&rsquo;re trying to remove. PostgreSQL itself is open source and excellent - if you want to run it
              yourself, do that. We&rsquo;d be a worse choice.
            </p>
          </div>
        </div>
      </Section>

      {/* Milestones */}
      <Section alt>
        <SectionHead
          eyebrow="Milestones"
          title="The receipts"
          subtitle="What we shipped and when. We&rsquo;ll update this page as new milestones land - both the ones we&rsquo;re proud of and the ones we learn from."
        />
        <div className="m-card" style={{ padding: 28 }}>
          {MILESTONES.map((m) => (
            <div
              key={m.when}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                gap: 18,
                padding: "14px 0",
                borderBottom: "1px solid var(--m-border)",
              }}
            >
              <span style={{ fontFamily: "var(--m-font-mono)", color: "var(--m-text-muted)", fontSize: 13, letterSpacing: ".04em" }}>{m.when}</span>
              <span style={{ color: "var(--m-text)" }}>{m.what}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Talk to us */}
      <Section>
        <div className="m-card m-card-glow" style={{ padding: 36, textAlign: "center" }}>
          <h2 style={{ marginBottom: 12 }}>Talk to a human</h2>
          <p className="m-feature-body" style={{ maxWidth: 580, margin: "0 auto" }}>
            Email <strong>support@swyftstack.com</strong> for support, <strong>founder@swyftstack.com</strong> for everything else.
            Most replies come within an hour during working hours, and within a day otherwise.
          </p>
          <div className="m-row m-mt-5" style={{ justifyContent: "center" }}>
            <Link className="m-btn m-btn-primary m-btn-lg" href={authTarget("/signup")}>
              Try Swyftstack <ArrowRightIcon size={16} />
            </Link>
            <Link className="m-btn m-btn-secondary m-btn-lg" href="/security">
              Read our security posture
            </Link>
          </div>
        </div>
      </Section>

      <CTASection
        title="Ready when you are."
        subtitle="Launch offer: Starter at $9/mo for 2 months, then $19/mo."
        primary={{ label: "Start with Starter", href: "/signup" }}
        secondary={{ label: "See pricing", href: "/pricing" }}
      />
    </MarketingShell>
  );
}
