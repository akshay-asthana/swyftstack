// /migrate — public migration hub. Lists every supported source provider
// with a dedicated page (Supabase, Railway, Heroku, PlanetScale) plus
// generic Postgres providers we don't have a custom landing for yet.
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import { Section, SectionHead, CTASection, FAQSection, FeatureCard } from "@/components/marketing/sections";
import { MigrationInViewAnimation } from "@/components/marketing/migration-in-view";
import { HeroBackgroundAnimation } from "@/components/marketing/hero-background";
import { ArrowRightIcon, BackupIcon, CheckIcon, ClockIcon, MigrateIcon, ShieldIcon } from "@/components/marketing/icons";
import { FaqJsonLd, SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Migrate your database to Swyftstack — Migration hub",
  description: "Move your PostgreSQL database to Swyftstack in three clicks. Paste your connection string, watch the progress bar, copy your new URL. Source database is never touched.",
  alternates: { canonical: `${SITE_URL}/migrate` },
};

const SOURCES: { slug: string; label: string; blurb: string }[] = [
  { slug: "migrate-from-supabase",    label: "Supabase",         blurb: "Predictable pricing, lighter dashboard, your own auth." },
  { slug: "migrate-from-railway",     label: "Railway",          blurb: "Flat monthly bill instead of a usage meter." },
  { slug: "migrate-from-heroku",      label: "Heroku Postgres",  blurb: "Cut your bill by more than half." },
  { slug: "migrate-from-planetscale", label: "PlanetScale",       blurb: "MySQL → PostgreSQL with honest disclosure." },
];

const SUPPORTED = ["Render Postgres", "Neon", "AWS RDS (PostgreSQL)", "Google Cloud SQL (PostgreSQL)", "DigitalOcean Managed Postgres", "Azure Database for PostgreSQL", "Crunchy Bridge", "Self-hosted PostgreSQL"];

const FAQ = [
  { q: "Will my app go down?", a: "Only for the seconds it takes to update an environment variable and restart your app. Your source database is never touched — until you swap the URL, your old database is still serving traffic." },
  { q: "Do you charge for migration?", a: "No. Migration is free. You start paying when you decide to use your new Swyftstack database." },
  { q: "What if it fails?", a: "Nothing changes on your side. Source database untouched. Email us and we'll fix it — most migration issues are minor (an unusual extension, a missing role) and we resolve them in under an hour." },
  { q: "How big can my database be?", a: "Under 5 GB: 2–5 minutes. 5–50 GB: 10–45 minutes. Over 50 GB: email us and we'll plan it together — we've done multi-hundred-GB migrations without downtime." },
  { q: "What about extensions?", a: "Common ones (uuid-ossp, pgcrypto, pg_trgm, citext, PostGIS, pgvector) all migrate cleanly. Unusual extensions: ask us first." },
];

export default function MigrateHub() {
  return (
    <MarketingShell>
      <FaqJsonLd items={FAQ} />

      <section className="m-hero">
        <HeroBackgroundAnimation />
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />Migration hub</div>
          <h1>Move your database in <span className="m-text-grad">three clicks</span>.</h1>
          <p className="m-hero-lead">
            Paste a connection string. We pg_dump, restore, verify with checksums, hand you a new URL.
          </p>
          <div className="m-hero-ctas">
            <Link className="m-btn m-btn-primary m-btn-lg" href="/signup">
              Start a migration <ArrowRightIcon size={16} />
            </Link>
            <Link className="m-btn m-btn-secondary m-btn-lg" href="/postgres">See PostgreSQL specs</Link>
          </div>
          <div className="m-hero-trust">
            <span className="m-hero-trust-item"><ShieldIcon size={14} /> Read-only on your source</span>
            <span className="m-hero-trust-item"><CheckIcon size={14} /> Checksum-verified</span>
            <span className="m-hero-trust-item"><ClockIcon size={14} /> Free until you switch</span>
            <span className="m-hero-trust-item"><BackupIcon size={14} /> Rollback in zero clicks</span>
          </div>
          <div className="m-hero-visual">
            <MigrationInViewAnimation />
          </div>
        </div>
      </section>

      <Section borderTop>
        <SectionHead
          eyebrow="How it works"
          title="Five steps. None of them yours."
          subtitle="We do the actual work. You paste a string, click a button, and swap an environment variable when we're done."
        />
        <div className="m-grid m-grid-3">
          <Step n={1} title="Paste your existing connection string" body="We connect read-only to your source PostgreSQL. Standard libpq URI works." />
          <Step n={2} title="We pull your schema and data" body="Using standard PostgreSQL tools internally (pg_dump). No proprietary protocols, no special agents." />
          <Step n={3} title="We restore it onto your new Swyftstack database" body="Same indexes, foreign keys, sequences, common extensions. Your data lands ready to use." />
          <Step n={4} title="We verify every byte" body="Tables, row counts, indexes — checked end-to-end with checksums before we hand you the new URL." />
          <Step n={5} title="You swap the connection string" body="Drop the new URL into your app's environment variable and redeploy. Your old database is still there if anything looks off." />
          <Step n={6} title="You walk away if you want" body="If something doesn't look right, don't switch. Your old database is untouched. Free, no obligation." />
        </div>
      </Section>

      <Section alt>
        <SectionHead
          eyebrow="Supported sources"
          title="Coming from a specific provider?"
          subtitle="Each guide is written for the exact dashboard you're starting from, with screenshots and the connection-string menu path."
        />
        <div className="m-grid m-grid-2">
          {SOURCES.map((s) => (
            <Link key={s.slug} href={`/${s.slug}`} className="m-card m-card-hover" style={{ display: "block", color: "inherit" }}>
              <div className="m-row m-row-tight">
                <span className="m-feature-icon" style={{ marginBottom: 0 }}><MigrateIcon size={20} /></span>
                <span style={{ fontSize: 18, fontWeight: 680, color: "var(--m-text-strong)" }}>From {s.label}</span>
                <ArrowRightIcon size={16} style={{ marginLeft: "auto", color: "var(--m-text-brand)" }} />
              </div>
              <p className="m-feature-body m-mt-3">{s.blurb}</p>
            </Link>
          ))}
        </div>

        <div className="m-section-head m-mt-7 m-mb-4">
          <h3 style={{ fontSize: 20 }}>Also supported</h3>
          <p>Any standard PostgreSQL provider with a connection string works. If it speaks libpq, we can migrate it.</p>
        </div>
        <div className="m-grid m-grid-4">
          {SUPPORTED.map((p) => (
            <div key={p} className="m-card" style={{ padding: 14, textAlign: "center" }}>
              <span style={{ fontWeight: 650, color: "var(--m-text-strong)", fontSize: 14 }}>{p}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead
          eyebrow="Things to know"
          title="The honest version"
        />
        <div className="m-grid m-grid-3">
          <FeatureCard icon={<ClockIcon size={22} />} title="Pick a quiet hour" body="Your source database isn't touched, but your app needs an environment-variable swap and a restart. Aim for low-traffic time." />
          <FeatureCard icon={<BackupIcon size={22} />} title="Big databases take longer" body="Under 5 GB: typically 2–5 minutes. 5–50 GB: 10–45 minutes. Over 50 GB: email us and we'll plan it together." />
          <FeatureCard icon={<ShieldIcon size={22} />} title="Extensions matter" body="Common ones migrate cleanly. If you use something unusual (custom procedures, MySQL syntax), ask us first." />
        </div>
      </Section>

      <FAQSection title="Migration FAQ" items={FAQ} />

      <CTASection
        title="Start a migration — free until you switch."
        subtitle="Paste a connection string. Watch the progress bar. Get a new URL. Walk away anytime, no charge."
        primary={{ label: "Start a migration", href: "/signup" }}
        secondary={{ label: "Talk to us first", href: "/about" }}
      />
    </MarketingShell>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="m-card">
      <div className="m-row m-row-tight">
        <span style={{
          width: 30, height: 30, borderRadius: 9,
          background: "var(--m-gradient-cta)", color: "white",
          display: "inline-grid", placeItems: "center",
          fontWeight: 800, fontSize: 13,
          boxShadow: "0 6px 16px rgba(109,94,246,.4)",
        }}>{n}</span>
        <span style={{ fontWeight: 680, color: "var(--m-text-strong)", fontSize: 15 }}>{title}</span>
      </div>
      <p className="m-feature-body m-mt-3">{body}</p>
    </div>
  );
}
