// Managed PostgreSQL product page. Detailed specs, snippets for every
// common language/client, and an honest FAQ. Static content from
// MARKETING_PAGES_CONTENT.md, broadened slightly to fit teams of all sizes.
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/shell";
import { Section, SectionHead, CTASection, FAQSection, FeatureCard, CheckList } from "@/components/marketing/sections";
import { CodeSnippet } from "@/components/marketing/code-snippet";
import { InfrastructureVisual } from "@/components/marketing/infra-visual";
import { HeroBackgroundAnimation } from "@/components/marketing/hero-background";
import { BackupTimeline, DatabaseTableVisual } from "@/components/marketing/product-visuals";
import {
  ArrowRightIcon, BackupIcon, BoltIcon, ClockIcon, GaugeIcon,
  LockIcon, MigrateIcon, PostgresIcon, ShieldIcon, TerminalIcon,
} from "@/components/marketing/icons";
import { FaqJsonLd, SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Managed PostgreSQL - deployed in seconds | Swyftstack",
  description: "PostgreSQL 16 with SSL by default, daily backups, one-click restore, PgBouncer pooling, and a connection string ready to paste in under a minute.",
  alternates: { canonical: `${SITE_URL}/postgres` },
};

const FAQ = [
  { q: "Is this real PostgreSQL or a fork?", a: "Real PostgreSQL. Same binaries from postgresql.org. We don't fork or modify the engine." },
  { q: "Can I run pg_dump against my Swyftstack database?", a: "Yes. We don't restrict standard PostgreSQL tooling. psql, pg_dump, pg_restore, prisma migrate, alembic - all work normally." },
  { q: "Do you support read replicas?", a: "On the roadmap for V1.1. If you need it sooner, email us and we'll move it up." },
  { q: "Do you offer point-in-time recovery?", a: "Available on Enterprise. We'll tell you honestly if your use case needs it or not." },
  { q: "Can I bring my own SSL certificate?", a: "On Enterprise. Default certificates are managed by us and auto-renewed." },
  { q: "Can I IP-allowlist connections?", a: "Yes - connection rules in the dashboard. Default is open with strong auth; restrict to specific IPs or CIDR ranges as needed." },
  { q: "Is the database actually dedicated?", a: "Pro and Enterprise plans run on dedicated PostgreSQL CPU. Starter runs on shared compute with isolation and strict quotas." },
];

const SNIPPETS = [
  { name: "psql", language: "sh" as const, code: `psql "postgresql://user:pass@host.swyftstack.com:5432/dbname?sslmode=require"` },
  { name: "Node (pg)", language: "ts" as const, code: `import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});` },
  { name: "Python (psycopg)", language: "py" as const, code: `import os, psycopg

conn = psycopg.connect(
  os.environ["DATABASE_URL"],
  sslmode="require",
)` },
  { name: "Prisma", language: "prisma" as const, code: `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}` },
  { name: "Drizzle", language: "ts" as const, code: `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);` },
];

export default function PostgresPage() {
  return (
    <MarketingShell>
      <FaqJsonLd items={FAQ} />

      <section className="m-hero">
        <HeroBackgroundAnimation />
        <div className="m-container m-hero-inner">
          <div className="m-eyebrow"><span className="m-eyebrow-dot" />Managed PostgreSQL</div>
          <h1>Managed PostgreSQL, <span className="m-text-grad">deployed in seconds</span>.</h1>
          <p className="m-hero-lead">
            PostgreSQL 16 with SSL, daily backups, and a connection string ready to paste in under a minute.
          </p>
          <div className="m-hero-ctas">
            <Link className="m-btn m-btn-primary m-btn-lg" href="/signup">
              Deploy a database <ArrowRightIcon size={16} />
            </Link>
            <Link className="m-btn m-btn-secondary m-btn-lg" href="/migrate">Migrate from your provider</Link>
          </div>
          <div className="m-hero-trust">
            <span className="m-hero-trust-item"><ClockIcon size={14} /> 47-second average provisioning</span>
            <span className="m-hero-trust-item"><LockIcon size={14} /> SSL required by default</span>
            <span className="m-hero-trust-item"><BackupIcon size={14} /> Daily encrypted backups</span>
            <span className="m-hero-trust-item"><ShieldIcon size={14} /> Up to 99.95% SLA</span>
          </div>
        </div>
      </section>

      {/* --- Specs --- */}
      <Section borderTop>
        <SectionHead
          eyebrow="Specs"
          title="The part you actually came here for"
          subtitle="Standard PostgreSQL, the way you'd self-host it - minus the YAML, the firewall rules, and the 3 AM alerts."
        />
        <div className="m-grid m-grid-3">
          <SpecCard title="PostgreSQL version" body="16 (with 17 in preview)" />
          <SpecCard title="Connections" body="Up to 100 on Starter, 500 on Pro, custom on Enterprise" />
          <SpecCard title="Connection pooling" body="PgBouncer included, configured automatically" />
          <SpecCard title="Extensions enabled by default" body="uuid-ossp, pgcrypto, pg_trgm, citext, hstore, unaccent, btree_gin, btree_gist" />
          <SpecCard title="Other extensions available" body="PostGIS, pg_stat_statements, pg_cron, pgvector, full list in docs" />
          <SpecCard title="SSL" body="Required by default, not optional" />
          <SpecCard title="Backups" body="Daily, encrypted, 7-day (Starter) or 30-day (Pro) retention" />
          <SpecCard title="Restore" body="Any backup, one click, into a new database or replacing the existing one" />
          <SpecCard title="Regions" body="US-East, US-West, EU-Central (more coming)" />
          <SpecCard title="Hardware" body="NVMe SSD, dedicated CPU on Pro and above" />
          <SpecCard title="Monitoring" body="CPU, memory, disk I/O, connections, query rate - slow query log on Pro" />
          <SpecCard title="Logs" body="Last 7 days (Starter) or 30 days (Pro). Streaming to external logging providers on Pro+" />
        </div>
      </Section>

      {/* --- 47-second story --- */}
      <Section alt>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 56, alignItems: "center" }} className="m-section-grid-2">
          <div>
            <div className="m-eyebrow m-mb-4"><span className="m-eyebrow-dot" />47 seconds</div>
            <h2>From click to connection string.</h2>
            <p className="m-feature-body m-mt-4">
              That&rsquo;s a fully provisioned PostgreSQL 16 database with SSL enabled, backups
              configured, and a copyable connection string. We publish the unedited recording so you
              can verify it yourself.
            </p>
            <p className="m-feature-body m-mt-3">
              Two reasons this matters. First, you can spin up throwaway databases for testing, demos,
              and branches without losing your flow. Second: if provisioning is fast, everything else
              is probably fast too.
            </p>
          </div>
          <InfrastructureVisual />
        </div>
      </Section>

      {/* --- Migration --- */}
      <Section>
        <SectionHead
          eyebrow="Migrate from anywhere"
          title="Paste a connection string. We do the rest."
          subtitle="We use standard PostgreSQL tooling internally (pg_dump / pg_restore), verify every table and row count with checksums, and hand you a new connection string when it's done. Your source database is never modified."
        />
        <div className="m-grid m-grid-4">
          {[
            "Supabase", "Railway", "Heroku Postgres", "PlanetScale", "Render", "Neon", "AWS RDS", "Google Cloud SQL",
          ].map((p) => (
            <div key={p} className="m-card" style={{ textAlign: "center", padding: 16 }}>
              <span style={{ fontWeight: 650, color: "var(--m-text-strong)" }}>{p}</span>
            </div>
          ))}
        </div>
        <div className="m-text-center m-mt-7">
          <Link href="/migrate" className="m-btn m-btn-primary m-btn-lg">
            Start a migration <ArrowRightIcon size={16} />
          </Link>
        </div>
      </Section>

      {/* --- Backup timeline + database table visual --- */}
      <Section alt>
        <SectionHead
          eyebrow="Backups & restore"
          title="Daily, encrypted, tested. The way backups should work."
          subtitle="Each backup is checksummed, encrypted, and restorable in one click. We run weekly restore drills internally because untested backups aren't backups."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "stretch" }} className="m-section-grid-2">
          <BackupTimeline />
          <DatabaseTableVisual />
        </div>
      </Section>

      {/* --- Connection examples --- */}
      <Section>
        <SectionHead
          eyebrow="Connection examples"
          title="Standard PostgreSQL. Standard clients."
          subtitle="Every client you'd reach for already speaks Swyftstack."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 36, alignItems: "start" }} className="m-section-grid-2">
          <CodeSnippet snippets={SNIPPETS} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Mini icon={<TerminalIcon size={18} />} title="GUI clients" body="TablePlus, DBeaver, pgAdmin, DataGrip - all connect normally." />
            <Mini icon={<BoltIcon size={18} />} title="Connection pooling" body="PgBouncer included. Choose transaction or session mode per app." />
            <Mini icon={<MigrateIcon size={18} />} title="Schema migrations" body="prisma migrate, drizzle-kit, alembic, Active Record migrations - all work." />
          </div>
        </div>
      </Section>

      {/* --- Operations --- */}
      <Section>
        <SectionHead
          eyebrow="Operational details"
          title="The boring parts done well"
        />
        <div className="m-grid m-grid-3">
          <FeatureCard icon={<GaugeIcon size={22} />} title="Monitoring" body="CPU, memory, disk I/O, active connections, query rate - all visible on the dashboard. Slow query log on Pro and above." />
          <FeatureCard icon={<ShieldIcon size={22} />} title="Alerting" body="Email alerts at 80% and 95% of any resource limit. Webhook alerts on Pro." />
          <FeatureCard icon={<ClockIcon size={22} />} title="Maintenance windows" body="Security patches within 24 hours of upstream release. Major version upgrades are opt-in with rollback windows." />
        </div>
      </Section>

      {/* --- Pricing teaser --- */}
      <Section alt>
        <div className="m-card m-card-glow" style={{ padding: 36, textAlign: "center" }}>
          <h2 style={{ marginBottom: 12 }}>Launch offer · $9 / month</h2>
          <p className="m-feature-body" style={{ maxWidth: 580, margin: "0 auto" }}>
            First 500 customers get Starter at $9/mo (then $19/mo) or Growth at $49/mo (then $99/mo)
            for the first two months. Both include daily backups, one-click restore, and the full feature set.
          </p>
          <div className="m-row m-mt-5" style={{ justifyContent: "center" }}>
            <Link className="m-btn m-btn-primary m-btn-lg" href="/pricing">
              See pricing <ArrowRightIcon size={16} />
            </Link>
            <Link className="m-btn m-btn-secondary m-btn-lg" href="/signup">Deploy a database</Link>
          </div>
        </div>
      </Section>

      <FAQSection title="Common questions" items={FAQ} />

      <CTASection
        title="Deploy a database. Cancel in one click."
        subtitle="The full PostgreSQL feature set, ready in 47 seconds. Standard SQL, standard tooling, no platform lock-in."
        primary={{ label: "Deploy a database - $19/mo", href: "/signup" }}
        secondary={{ label: "Compare to your provider", href: "/migrate" }}
      />
    </MarketingShell>
  );
}

function SpecCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="m-card">
      <div className="m-mini m-muted" style={{ textTransform: "uppercase", letterSpacing: ".09em", fontWeight: 700 }}>{title}</div>
      <div className="m-mt-3" style={{ fontWeight: 650, color: "var(--m-text-strong)", fontSize: 14.5, lineHeight: 1.5 }}>{body}</div>
    </div>
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
