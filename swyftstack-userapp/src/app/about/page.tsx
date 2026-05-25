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

export const dynamic = "force-dynamic";

const DESCRIPTION = "Why we built Swyftstack: managed PostgreSQL and S3 storage that respects your time. Predictable bills, instant dashboards, and a real human who answers your emails.";

export const metadata: Metadata = {
  title: "About Swyftstack - backend hosting that respects your time",
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
            Two products, both simple, both fast. Predictable bills. A real human who answers your emails.
          </p>
        </div>
      </section>

      {/* The story */}
      <Section borderTop>
        <div className="m-container-narrow" style={{ marginInline: "auto" }}>
          <div className="m-prose">
            <h2>The story</h2>
            <p>
              Every year, cloud platforms add more features, more dashboards, more tabs, more services that depend on
              other services. Meanwhile, the actual thing most developers want hasn&rsquo;t changed:
              <em> a database for my app, and somewhere to store user files.</em>
            </p>
            <p>So we built that. Two products. Both simple. Both fast. Both backed by a real human who answers your emails.</p>
            <p>
              We are not trying to be the biggest backend platform. We are trying to be the one developers tell their friends
              about - the one that quietly works while they go ship their app.
            </p>
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
            <Link className="m-btn m-btn-primary m-btn-lg" href="/signup">
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
