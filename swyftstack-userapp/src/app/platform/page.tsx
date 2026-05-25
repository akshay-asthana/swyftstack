// Platform overview - ties Managed PostgreSQL, object storage, static
// hosting, migration, and backups together as a single platform story.
// Static (not CMS-backed) per the spec - the marketing content lives in
// code so designers and engineers can iterate together.
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import {
  Section, SectionHead, FAQSection, CTASection, FeatureCard,
} from "@/components/marketing/sections";
import { InfrastructureVisual } from "@/components/marketing/infra-visual";
import { HeroBackgroundAnimation } from "@/components/marketing/hero-background";
import { HeroOrchestratorVisual } from "@/components/marketing/hero-orchestrator";
import {
  ArrowRightIcon, BackupIcon, BoltIcon, BucketIcon, ClockIcon,
  GaugeIcon, GlobeIcon, LockIcon, MigrateIcon, PostgresIcon,
  ShieldIcon, TeamIcon, TerminalIcon, CodeIcon,
} from "@/components/marketing/icons";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform - Swyftstack",
  description: "Managed PostgreSQL, S3-compatible storage, static site hosting, backups, migration, and usage controls - one platform, one dashboard, one bill.",
  alternates: { canonical: `${SITE_URL}/platform` },
};

const FAQ_ITEMS = [
  { q: "How are products billed together?", a: "One plan covers your databases, storage, egress, backups, and static sites. One invoice per month, predictable line items, no separate services to reconcile." },
  { q: "Can I use only PostgreSQL?", a: "Yes. Every product on the platform is independently usable. Many teams start with just a database and add storage when they need it." },
  { q: "Is the platform multi-region?", a: "Today: US-East, US-West, EU-Central. Choose a region at project creation; all your databases and buckets for that project live there." },
  { q: "Do you run on shared or dedicated infrastructure?", a: "Pro and Enterprise plans run on dedicated PostgreSQL CPU. Starter shares compute on isolated instances with strict resource quotas." },
];

export default function PlatformPage() {
  return (
    <MarketingShell>
      <section className="m-hero">
        <HeroBackgroundAnimation />
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />One platform for your whole backend</div>
          <h1>Everything you need to ship. Nothing you don&rsquo;t.</h1>
          <p className="m-hero-lead">
            Managed PostgreSQL, S3 storage, backups, and migration on one premium platform.
          </p>
          <div className="m-hero-ctas">
            <Link className="m-btn m-btn-primary m-btn-lg" href="/signup">
              Start building <ArrowRightIcon size={16} />
            </Link>
            <Link className="m-btn m-btn-secondary m-btn-lg" href="/pricing">See pricing</Link>
          </div>
          <div className="m-hero-visual">
            <HeroOrchestratorVisual />
          </div>
        </div>
      </section>

      {/* --- Anchor cards (jump to product) --- */}
      <Section tight borderTop>
        <div className="m-grid m-grid-4">
          <AnchorCard icon={<PostgresIcon size={20} />} title="Managed PostgreSQL" href="/postgres" />
          <AnchorCard icon={<BucketIcon size={20} />} title="Object storage" href="/storage" />
          <AnchorCard icon={<GlobeIcon size={20} />} title="Static hosting" href="/static-sites" />
          <AnchorCard icon={<MigrateIcon size={20} />} title="Migration" href="/migrate" />
        </div>
      </Section>

      {/* --- Managed PostgreSQL --- */}
      <Section id="postgres">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 56, alignItems: "center" }} className="m-section-grid-2">
          <div>
            <div className="m-eyebrow m-mb-4"><span className="m-eyebrow-dot" />Managed PostgreSQL</div>
            <h2>Real PostgreSQL 16. Provisioned in 47 seconds.</h2>
            <p className="m-feature-body m-mt-4">
              Not a fork. Not a re-implementation. Standard PostgreSQL with SSL on by default,
              PgBouncer pooling, common extensions preloaded, and daily encrypted backups.
              Connects to every PostgreSQL client and ORM you already use.
            </p>
            <ul className="m-plan-list m-mt-5">
              {[
                "PostgreSQL 16 (17 in preview)",
                "Up to 500 connections; PgBouncer included",
                "uuid-ossp, pgcrypto, pg_trgm, citext, PostGIS, pgvector",
                "Daily encrypted backups, 7-30 day retention",
                "Connection IP allowlisting",
                "Per-database roles and scoped credentials",
              ].map((it, i) => (
                <li key={i}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-ok)" }}><path d="M5 12l5 5L20 7" /></svg>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <Link href="/postgres" className="m-btn m-btn-secondary m-mt-5">
              Managed PostgreSQL details <ArrowRightIcon size={14} />
            </Link>
          </div>
          <InfrastructureVisual />
        </div>
      </Section>

      {/* --- Object storage --- */}
      <Section alt id="storage">
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 56, alignItems: "center" }} className="m-section-grid-2">
          <div className="m-card" style={{ padding: 28 }}>
            <div className="m-row m-row-tight" style={{ marginBottom: 14 }}>
              <span className="m-feature-icon" style={{ marginBottom: 0 }}><BucketIcon size={20} /></span>
              <div>
                <div className="m-strong" style={{ fontWeight: 680 }}>user-uploads</div>
                <div className="m-mini m-muted">s3-compatible · public · CDN-fronted</div>
              </div>
              <div className="m-tag m-tag-ok" style={{ marginLeft: "auto" }}>online</div>
            </div>
            <div className="m-divider" />
            <pre style={{
              margin: 0, padding: 14, borderRadius: "var(--m-r-sm)",
              background: "var(--m-bg-2)", border: "1px solid var(--m-border)",
              color: "var(--m-text-2)", fontFamily: "var(--m-font-mono)",
              fontSize: 12.5, lineHeight: 1.6, overflow: "auto",
            }}>{`s3.send(new PutObjectCommand({
  Bucket: "user-uploads",
  Key: "users/123/avatar.png",
  Body: fileBuffer,
  ContentType: "image/png",
}));`}</pre>
            <div className="m-row m-mt-5" style={{ gap: 18, fontSize: 13, color: "var(--m-text-muted)" }}>
              <span>Endpoint: <code style={{ color: "var(--m-accent)" }}>storage.swyftstack.com</code></span>
              <span>Region: <code style={{ color: "var(--m-accent)" }}>auto</code></span>
            </div>
          </div>
          <div>
            <div className="m-eyebrow m-mb-4"><span className="m-eyebrow-dot" />Object storage</div>
            <h2>S3 API. Without the AWS bill or console.</h2>
            <p className="m-feature-body m-mt-4">
              PutObject, GetObject, presigned URLs - every standard S3 operation works. Every SDK in
              every language already speaks it. Public buckets get permanent CDN URLs at no extra cost;
              private buckets use signed URLs generated from your app.
            </p>
            <ul className="m-plan-list m-mt-5">
              {[
                "AWS S3-compatible API",
                "Public buckets CDN-fronted automatically",
                "Configurable CORS per bucket - no XML",
                "Signed URLs with custom expiry",
                "Per-bucket access keys",
                "100 GB on Starter · 1 TB on Pro",
              ].map((it, i) => (
                <li key={i}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-ok)" }}><path d="M5 12l5 5L20 7" /></svg>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <Link href="/storage" className="m-btn m-btn-secondary m-mt-5">
              Object storage details <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
      </Section>

      {/* --- Static sites --- */}
      <Section id="static-sites">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 56, alignItems: "center" }} className="m-section-grid-2">
          <div>
            <div className="m-eyebrow m-mb-4"><span className="m-eyebrow-dot" />Static site hosting</div>
            <h2>Free, forever. Custom domains. Automatic HTTPS.</h2>
            <p className="m-feature-body m-mt-4">
              Drag a folder. Push to Git. Either way, your site is live in seconds with HTTPS - no
              bandwidth cap, no build minute limit, no "free until we change our mind."
            </p>
            <ul className="m-plan-list m-mt-5">
              {[
                "Custom domains + auto-renewed certificates",
                "Deploy from GitHub or GitLab, or drag-and-drop",
                "Unmetered bandwidth and build minutes",
                "5 sites on Starter · unlimited on Pro",
                "Works with Next.js (export), Astro, Hugo, Eleventy, SvelteKit, VitePress, Docusaurus, Nuxt, Gatsby, plain HTML",
              ].map((it, i) => (
                <li key={i}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--m-ok)" }}><path d="M5 12l5 5L20 7" /></svg>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <Link href="/static-sites" className="m-btn m-btn-secondary m-mt-5">
              Static hosting details <ArrowRightIcon size={14} />
            </Link>
          </div>
          <div className="m-card" style={{ padding: 24 }}>
            <div className="m-row m-row-tight">
              <span className="m-feature-icon" style={{ marginBottom: 0 }}><GlobeIcon size={20} /></span>
              <div>
                <div className="m-strong" style={{ fontWeight: 680 }}>marketing.acme.com</div>
                <div className="m-mini m-muted">Linked to GitHub · automatic deploys on push</div>
              </div>
              <span className="m-tag m-tag-ok" style={{ marginLeft: "auto" }}>live</span>
            </div>
            <div className="m-divider" />
            <div className="m-grid m-grid-2" style={{ gap: 14 }}>
              <Mini title="Last deploy" body="3m ago · main@a7f2c81" />
              <Mini title="Build time" body="42s" />
              <Mini title="Bandwidth" body="Unmetered" />
              <Mini title="HTTPS" body="Auto, renewed monthly" />
            </div>
          </div>
        </div>
      </Section>

      {/* --- The operations layer --- */}
      <Section alt>
        <SectionHead
          eyebrow="The operations layer"
          title="The platform pieces between products"
          subtitle="Things you'd otherwise hand-wire yourself: migration, backups, alerts, audit trail, team roles, and live usage."
        />
        <div className="m-grid m-grid-3">
          <FeatureCard icon={<MigrateIcon size={22} />} title="Migration in three clicks" body="Paste a connection string, watch the progress bar, copy the new URL. Source database is never touched." href="/migrate" />
          <FeatureCard icon={<BackupIcon size={22} />} title="Verified daily backups" body="Encrypted, retention 7-30 days, restorable in one click. Weekly restore drills - untested backups aren't backups." />
          <FeatureCard icon={<GaugeIcon size={22} />} title="Live usage metering" body="Storage, egress, vCPU-hours, connection count - updated every minute. Alerts at 80% and 95%." href="/pricing" />
          <FeatureCard icon={<TeamIcon size={22} />} title="Team workspaces" body="Up to 10 members on Pro. Project-level roles, scoped credentials, audit trail of every change." />
          <FeatureCard icon={<LockIcon size={22} />} title="Encrypted secrets" body="API keys, connection strings, env vars - encrypted at rest, masked in the UI, revealable with explicit action." />
          <FeatureCard icon={<TerminalIcon size={22} />} title="Audit logs" body="Every dashboard action - actor, IP, target, before/after - recorded and exportable on Pro and above." />
        </div>
      </Section>

      {/* --- Developer experience --- */}
      <Section>
        <SectionHead
          eyebrow="Developer experience"
          title="No special clients. No protocol surprises."
          subtitle="Connect with the standard tools you already know - psql, pg_dump, boto3, AWS SDK v3, Prisma, Drizzle. We don't ship a custom layer."
        />
        <div className="m-grid m-grid-3">
          <FeatureCard icon={<CodeIcon size={22} />} title="ORM-friendly" body="Prisma, Drizzle, TypeORM, SQLAlchemy, Sequelize, Eloquent. If it speaks PostgreSQL, it speaks Swyftstack." />
          <FeatureCard icon={<TerminalIcon size={22} />} title="CLI-friendly" body="psql, pg_dump, pg_restore, prisma migrate - all standard tooling works unmodified against your databases." />
          <FeatureCard icon={<BoltIcon size={22} />} title="Connection strings, ready to paste" body="Pooled and direct URLs both available. Rotate credentials in one click; old URLs gracefully drain." />
        </div>
      </Section>

      <FAQSection title="Platform FAQ" items={FAQ_ITEMS} />

      <CTASection
        title="One platform. The whole backend."
        subtitle="Spin up a project in 47 seconds. Add databases, buckets, and static sites as you need them."
      />
    </MarketingShell>
  );
}

function AnchorCard({ icon, title, href }: { icon: React.ReactNode; title: string; href: string }) {
  return (
    <Link href={href} className="m-card m-card-hover" style={{ display: "block", color: "inherit" }}>
      <div className="m-row m-row-tight" style={{ alignItems: "center" }}>
        <span className="m-feature-icon" style={{ marginBottom: 0, width: 36, height: 36 }}>{icon}</span>
        <span style={{ fontWeight: 680, color: "var(--m-text-strong)" }}>{title}</span>
      </div>
      <div className="m-row m-row-tight m-mt-3" style={{ color: "var(--m-text-brand)", fontSize: 13, fontWeight: 600 }}>
        Learn more <ArrowRightIcon size={13} />
      </div>
    </Link>
  );
}

function Mini({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: "var(--m-r-sm)", background: "var(--m-bg-2)", border: "1px solid var(--m-border)" }}>
      <div className="m-mini m-muted" style={{ textTransform: "uppercase", letterSpacing: ".08em" }}>{title}</div>
      <div style={{ fontWeight: 650, color: "var(--m-text-strong)", marginTop: 4, fontSize: 13.5 }}>{body}</div>
    </div>
  );
}
