// Public marketing homepage. Premium dark-theme layout. Server-rendered for
// SEO; only animation components are client-side. Content is sourced from
// `RESOURCES_FOR_REFERENCE/MARKETING_PAGES_CONTENT.md` and lives inline here
// so design and copy stay in sync.
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import { Section, SectionHead, FAQSection, CTASection, FeatureCard } from "@/components/marketing/sections";
import { MigrationInViewAnimation } from "@/components/marketing/migration-in-view";
import { HeroBackgroundAnimation } from "@/components/marketing/hero-background";
import { HeroOrchestratorVisual } from "@/components/marketing/hero-orchestrator";
import { InfrastructureVisual } from "@/components/marketing/infra-visual";
import { CodeSnippet } from "@/components/marketing/code-snippet";
import {
  ArrowRightIcon, BackupIcon, BoltIcon, BucketIcon, ClockIcon,
  CodeIcon, GaugeIcon, GlobeIcon, LockIcon, MigrateIcon, PostgresIcon,
  ShieldIcon, SparkleIcon, TeamIcon, TerminalIcon,
} from "@/components/marketing/icons";
import { OrganizationJsonLd, SoftwareApplicationJsonLd, FaqJsonLd, SITE_URL } from "@/components/marketing/jsonld";
import { currentUser } from "@/lib/auth";

// Dynamic because the navbar/CTAs vary based on auth cookie. Without auth,
// crawlers see the signed-out variant - exactly what we want for SEO.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Swyftstack - Deploy production-ready database and storage in seconds",
  description:
    "Managed PostgreSQL, S3-compatible object storage, backups and migrations on one platform - built for modern teams shipping on Vercel, Netlify and beyond.",
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    title: "Swyftstack - Production-ready backend in seconds",
    description: "Managed PostgreSQL, object storage, backups and migrations on one premium developer platform.",
    url: `${SITE_URL}/`,
    type: "website",
    siteName: "Swyftstack",
  },
  twitter: {
    card: "summary_large_image",
    title: "Swyftstack",
    description: "Production-ready database and storage for your apps, in seconds.",
  },
};

const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: "Why no free tier?", a: "Free tiers force every paying customer to subsidize freeloaders. We'd rather charge a fair price and give every customer real infrastructure with a real human answering support emails." },
  { q: "Can I bring my own auth?", a: "Yes. Most customers run NextAuth, Clerk, Auth0, or Supabase Auth alongside Swyftstack. We focus on database and storage; you pick your auth." },
  { q: "Where is my data stored?", a: "US or EU - you pick at signup. Encrypted in transit and at rest. Backups are encrypted too." },
  { q: "What if my app outgrows the Starter plan?", a: "Click upgrade. Same database, same connection string, more headroom - no downtime." },
  { q: "Is this real PostgreSQL or a fork?", a: "Real PostgreSQL 16, straight from postgresql.org. We don't fork or modify the engine. pg_dump, psql, and any standard client work normally." },
  { q: "Can I move off Swyftstack later?", a: "Yes. PostgreSQL and S3-compatible storage are open standards. You can take a pg_dump or export your buckets anytime - we'll even help." },
];

const QUICKSTART = [
  {
    name: "Node.js",
    language: "ts" as const,
    code: `import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

const { rows } = await pool.query("SELECT now()");`,
  },
  {
    name: "Python",
    language: "py" as const,
    code: `import os, psycopg

conn = psycopg.connect(
  os.environ["DATABASE_URL"],
  sslmode="require",
)
with conn.cursor() as cur:
  cur.execute("SELECT now()")
  print(cur.fetchone())`,
  },
  {
    name: "Prisma",
    language: "prisma" as const,
    code: `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}`,
  },
  {
    name: "S3 SDK",
    language: "ts" as const,
    code: `import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: "https://storage.swyftstack.com",
  region: "auto",
  credentials: {
    accessKeyId: process.env.SWYFTSTACK_ACCESS_KEY!,
    secretAccessKey: process.env.SWYFTSTACK_SECRET_KEY!,
  },
});`,
  },
];

const WORKFLOW = [
  "Vercel", "Netlify", "Railway", "Render", "Cloudflare", "Fly.io", "Any Postgres client",
];

export default async function Homepage() {
  const user = await currentUser();
  const signedIn = !!user;

  return (
    <MarketingShell>
      <OrganizationJsonLd />
      <SoftwareApplicationJsonLd />
      <FaqJsonLd items={FAQ_ITEMS} />

      {/* --- Hero --- */}
      <section className="m-hero m-hero-home">
        <HeroBackgroundAnimation variant="homeNet" />
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow">
            <span className="m-eyebrow-dot" />
            Now with first-class team workspaces and audit logs
          </div>
          <h1>
            Deploy production-ready database and storage <span className="m-text-grad">in seconds</span>.
          </h1>
          <p className="m-hero-lead">
            Managed PostgreSQL, S3 storage, and verified backups - on one premium developer platform.
          </p>
          <div className="m-hero-ctas">
            <Link className="m-btn m-btn-primary m-btn-lg" href={signedIn ? "/console" : "/signup"}>
              {signedIn ? "Open console" : "Deploy your first database"} <ArrowRightIcon size={16} />
            </Link>
            <Link className="m-btn m-btn-secondary m-btn-lg" href="/migrate">
              Migrate from Supabase, Railway, or Heroku
            </Link>
          </div>
          <div className="m-hero-trust">
            <span className="m-hero-trust-item"><LockIcon size={14} /> SSL on by default</span>
            <span className="m-hero-trust-item"><BackupIcon size={14} /> Daily backups</span>
            <span className="m-hero-trust-item"><ClockIcon size={14} /> 47-second provisioning</span>
            <span className="m-hero-trust-item"><ShieldIcon size={14} /> 99.9% uptime SLA</span>
          </div>
          <div className="m-hero-visual">
            <HeroOrchestratorVisual />
          </div>
        </div>
      </section>

      {/* --- Trusted workflow strip --- */}
      <Section tight borderTop>
        <div className="m-text-center" style={{ color: "var(--m-text-muted)", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 650, marginBottom: 18 }}>
          Works with the stack you already ship
        </div>
        <div className="m-row" style={{ justifyContent: "center", gap: 12 }}>
          {WORKFLOW.map((w) => (
            <span
              key={w}
              style={{
                padding: "8px 14px",
                borderRadius: "var(--m-r-pill)",
                background: "var(--m-surface-glass-strong)",
                border: "1px solid var(--m-border)",
                color: "var(--m-text-2)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {w}
            </span>
          ))}
        </div>
      </Section>

      {/* --- Backend essentials section --- */}
      <Section alt>
        <SectionHead
          eyebrow="Backend essentials"
          title="One platform. The whole backend."
          subtitle="Each product is a first-class citizen of the dashboard - wired together, individually metered, separately addressable."
        />
        <div className="m-grid m-grid-3">
          <FeatureCard
            icon={<PostgresIcon size={22} />}
            title="Managed PostgreSQL"
            body="PostgreSQL 16 with SSL by default, daily backups, one-click restore, and PgBouncer pooling. Deploy in 47 seconds."
            href="/postgres"
          />
          <FeatureCard
            icon={<BucketIcon size={22} />}
            title="Object storage"
            body="S3-compatible API. Every SDK already speaks it. Public buckets get instant CDN URLs; private buckets use signed URLs."
            href="/storage"
          />
          <FeatureCard
            icon={<MigrateIcon size={22} />}
            title="Three-click migration"
            body="Paste a connection string. We pg_dump, restore, verify with checksums, hand you a fresh URL. Source database is never touched."
            href="/migrate"
          />
          <FeatureCard
            icon={<BackupIcon size={22} />}
            title="Backups & restore"
            body="Encrypted daily backups with 7- or 30-day retention. Restore in one click, into a new database or replacing the existing one."
            href="/security"
          />
          <FeatureCard
            icon={<GaugeIcon size={22} />}
            title="Usage controls"
            body="Plans, limits, and overrides per project. Real-time dashboards. Email alerts at 80% and 95% so bills never surprise you."
            href="/pricing"
          />
          <FeatureCard
            icon={<TeamIcon size={22} />}
            title="Teams, projects & roles"
            body="Up to 10 team members on Pro, unlimited on Enterprise. Scoped credentials, audit logs, and project-level ownership."
            href="/platform"
          />
        </div>
      </Section>

      {/* --- Orchestration / Infra story --- */}
      <Section>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 56, alignItems: "center" }} className="m-section-grid-2">
          <div>
            <div className="m-eyebrow m-mb-4">
              <span className="m-eyebrow-dot" />
              The whole project in one view
            </div>
            <h2>Your database, bucket, backup, and usage - together.</h2>
            <p className="m-hero-lead m-mt-4" style={{ textAlign: "left", margin: "16px 0 0", maxWidth: "none" }}>
              No three-account scavenger hunt. Spin up a project, get a Postgres instance, a bucket,
              a backup schedule, and live usage metering - all addressable from one dashboard and
              billed on a single invoice.
            </p>
            <div className="m-grid m-grid-2 m-mt-5" style={{ gap: 14 }}>
              <Mini icon={<TerminalIcon size={18} />} title="Connection strings, ready to paste" body="Auto-rotated, masked in the UI, copyable everywhere." />
              <Mini icon={<LockIcon size={18} />} title="Scoped credentials" body="Per-bucket access keys. Per-database roles. No shared admin." />
              <Mini icon={<GaugeIcon size={18} />} title="Live metering" body="Storage, egress, vCPU-hours updated every minute." />
              <Mini icon={<BoltIcon size={18} />} title="Provisioning in seconds" body="No queue, no waiting room. Click, copy, ship." />
            </div>
          </div>
          <InfrastructureVisual />
        </div>
      </Section>

      {/* --- Migration section (animation triggers on scroll) --- */}
      <Section alt>
        <SectionHead
          eyebrow="Move your database in three clicks"
          title="Migrate in minutes, not a wasted Saturday."
          subtitle="Already on Supabase, Railway, Heroku, or PlanetScale? Paste your connection string. We pg_dump, restore, verify with checksums - your source database keeps serving production the whole time."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 36, alignItems: "center" }} className="m-section-grid-2">
          <MigrationInViewAnimation />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Mini icon={<MigrateIcon size={18} />} title="Read-only on your source" body="We pg_dump over the wire. Your existing app keeps running, untouched." />
            <Mini icon={<ShieldIcon size={18} />} title="Checksum-verified" body="Tables, row counts, indexes - verified end-to-end before we hand you the new URL." />
            <Mini icon={<ClockIcon size={18} />} title="Minutes, not weekends" body="Under 5 GB: 2-5 minutes. 5-50 GB: ~30 minutes. Bigger? We plan it with you." />
            <Mini icon={<BackupIcon size={18} />} title="Rollback is free" body="If anything looks wrong, don't switch your DATABASE_URL - your old database is still serving traffic." />
          </div>
        </div>
        <div className="m-text-center m-mt-7">
          <Link className="m-btn m-btn-primary m-btn-lg" href="/migrate">
            See the migration hub <ArrowRightIcon size={16} />
          </Link>
        </div>
      </Section>

      {/* --- Developer experience --- */}
      <Section>
        <SectionHead
          eyebrow="Developer experience"
          title="Standard PostgreSQL. Any framework. Zero adapters."
          subtitle="Connect with the tools you already use. We don't ship a special client or a custom protocol - your existing snippets just work."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 36, alignItems: "start" }} className="m-section-grid-2">
          <CodeSnippet snippets={QUICKSTART} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Mini icon={<CodeIcon size={18} />} title="Prisma, Drizzle, raw pg, SQLAlchemy" body="No special drivers. Your ORM, your conventions." />
            <Mini icon={<TerminalIcon size={18} />} title="psql, pg_dump, TablePlus, DBeaver" body="All standard PostgreSQL tooling works unmodified." />
            <Mini icon={<BoltIcon size={18} />} title="Connection pooling included" body="PgBouncer configured for you. Toggle transaction or session mode." />
            <Mini icon={<GlobeIcon size={18} />} title="S3-compatible storage SDK" body="boto3, AWS SDK v3, Minio client - change the endpoint, leave the rest." />
          </div>
        </div>
      </Section>

      {/* --- Reliability --- */}
      <Section alt>
        <SectionHead
          eyebrow="Security & reliability"
          title="What we promise. What we measure."
          subtitle="The boring parts done well: encrypted everywhere, restorable always, observable in real time."
        />
        <div className="m-grid m-grid-3">
          <FeatureCard icon={<ShieldIcon size={22} />} title="Encryption everywhere" body="SSL/TLS on every connection, AES-256 at rest, encrypted backups and bucket objects." />
          <FeatureCard icon={<BackupIcon size={22} />} title="Tested restores" body="Daily backups, retention up to 30 days, and weekly restore drills. Untested backups aren't backups." />
          <FeatureCard icon={<LockIcon size={22} />} title="Scoped credentials" body="Per-bucket keys. Per-database roles. Connection IP allowlisting. SSO via SAML on Enterprise." />
          <FeatureCard icon={<GaugeIcon size={22} />} title="Usage limits, not bill shocks" body="Email alerts at 80% and 95% of any limit. Webhook alerts on Pro. No surprise overages." />
          <FeatureCard icon={<ClockIcon size={22} />} title="Honest status & postmortems" body="Live status page, automated incident detection, public postmortems within 7 days." />
          <FeatureCard icon={<TerminalIcon size={22} />} title="Audit logs" body="Every state change in the dashboard recorded with actor, IP, and target. Exportable on Pro." />
        </div>
      </Section>

      {/* --- Teams & scale --- */}
      <Section>
        <SectionHead
          eyebrow="Built to scale with your team"
          title="From solo founder to platform team."
          subtitle="Swyftstack scales as your org grows. Project-level roles, audit logs, SSO on Enterprise, and predictable bills that finance can actually forecast."
        />
        <div className="m-stat-row">
          <Stat val="47s" label="Average database deploy" />
          <Stat val="99.95%" label="Uptime on Pro" />
          <Stat val="30d" label="Backup retention on Pro" />
          <Stat val="10+" label="Team members per workspace" />
        </div>
        <div className="m-grid m-grid-4 m-mt-7">
          <ScaleCard label="Solo founders" body="Ship the prototype your investors keep asking about. $9/mo with the launch offer." />
          <ScaleCard label="Startups" body="One platform, one bill. Less to explain at your next due-diligence call." />
          <ScaleCard label="Agencies" body="Spin up a new project per client. Bill it through, or hand off ownership cleanly." />
          <ScaleCard label="Engineering teams" body="Audit logs, scoped credentials, SSO via SAML on Enterprise. Real human support." />
        </div>
      </Section>

      {/* --- Pricing teaser --- */}
      <Section alt>
        <SectionHead
          eyebrow="Pricing"
          title="Honest, simple, no surprises"
          subtitle="One price per plan. Predictable invoices. Upgrade or cancel in one click."
        />
        <div className="m-grid m-grid-3">
          <PriceTeaser
            name="Starter"
            price="$9"
            standard="$19"
            tagline="For solo founders, freelancers, and first launches."
            points={["3 PostgreSQL databases", "10 GB database storage", "100 GB object storage", "500 GB egress", "Daily backups, 7-day retention"]}
          />
          <PriceTeaser
            name="Growth"
            price="$49"
            standard="$99"
            tagline="For agencies, growing teams, and apps doing real numbers."
            popular
            points={["20 PostgreSQL databases", "100 GB database storage", "1 TB object storage", "5 TB egress", "Email support, 24h response", "10 team members"]}
          />
          <PriceTeaser
            name="Enterprise"
            price="Custom"
            tagline="When uptime is the whole business."
            points={["Unlimited everything", "99.99% uptime SLA", "Dedicated Slack channel", "Custom DPA & security review", "SSO via SAML"]}
          />
        </div>
        <div className="m-text-center m-mt-7">
          <Link href="/pricing" className="m-btn m-btn-primary m-btn-lg">
            See full pricing <ArrowRightIcon size={16} />
          </Link>
        </div>
      </Section>

      {/* --- FAQ --- */}
      <FAQSection title="Common questions" items={FAQ_ITEMS} />

      {/* --- Final CTA --- */}
      <CTASection
        signedIn={signedIn}
        title="Ready in minutes. Cancel in one click."
        subtitle="Two minutes to sign up. 47 seconds to deploy. Backed by a real human who answers your emails."
      />
    </MarketingShell>
  );
}

function Mini({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 12, alignItems: "start" }}>
      <span className="m-feature-icon" style={{ width: 36, height: 36, marginBottom: 0 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 680, color: "var(--m-text-strong)", fontSize: 14.5 }}>{title}</div>
        <div style={{ color: "var(--m-text-muted)", fontSize: 13.5, marginTop: 2, lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  );
}

function Stat({ val, label }: { val: string; label: string }) {
  return (
    <div className="m-stat">
      <div className="m-stat-val">{val}</div>
      <div className="m-stat-label">{label}</div>
    </div>
  );
}

function ScaleCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="m-card">
      <div className="m-tag m-mb-3">{label}</div>
      <p className="m-feature-body">{body}</p>
    </div>
  );
}

function PriceTeaser({
  name, price, standard, tagline, points, popular,
}: { name: string; price: string; standard?: string; tagline: string; points: string[]; popular?: boolean }) {
  const isCustom = price === "Custom";
  return (
    <div className={`m-plan ${popular ? "m-plan-popular" : ""}`}>
      <div className="m-plan-name">{name}</div>
      <div className="m-plan-desc">{tagline}</div>
      <div className="m-plan-price">
        {price}
        {!isCustom && <small>/mo</small>}
        {standard && <span className="m-plan-old">{standard}/mo</span>}
      </div>
      {!isCustom && (
        <div className="m-plan-launch">Launch offer · first 2 months</div>
      )}
      <ul className="m-plan-list">
        {points.map((p, i) => (
          <li key={i}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <Link href="/pricing" className={`m-btn ${popular ? "m-btn-primary" : "m-btn-secondary"} m-btn-block`}>
        {isCustom ? "Talk to us" : `Start with ${name}`}
      </Link>
    </div>
  );
}
