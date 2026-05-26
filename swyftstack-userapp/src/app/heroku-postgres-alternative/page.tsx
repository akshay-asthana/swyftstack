// /heroku-postgres-alternative - comparison page. Rewritten to frame
// Swyftstack as the obvious choice for teams who'd otherwise jump straight
// from the entry tier ($50 Standard-0) into a much larger Heroku invoice.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";
import {
  competitorWhenList,
  makeComparisonColumns,
  PAY_FOR_BULLETS,
  SHARED_DB_FAQ,
} from "@/lib/solutions-content";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Heroku Postgres alternative for teams who want a modern workflow: $9/mo Starter with backups, restore, S3-compatible storage, fast provisioning, and three-click migration.";

export const metadata: Metadata = {
  title: "Heroku Postgres alternative - modern workflow | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/heroku-postgres-alternative` },
  openGraph: { title: "Swyftstack vs Heroku Postgres", description: DESCRIPTION, url: `${SITE_URL}/heroku-postgres-alternative`, type: "article" },
};

export default function HerokuPostgresAlternativePage() {
  return (
    <MarketingTemplate
      eyebrow="Heroku Postgres alternative"
      headline="The modern Heroku Postgres alternative for teams who"
      headlineAccent="don't need a 64 GB minimum."
      subheadline="Heroku Postgres is proven and mature - and the Standard-0 tier starts at $50/mo with a 64 GB minimum. Swyftstack Starter is $9/mo (launch) with daily backups, one-click restore, included S3-compatible storage, and a dashboard built for how teams actually work."
      primaryCta={{ label: "Migrate from Heroku", href: "/migrate-from-heroku" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={competitorWhenList({
        competitor: "Heroku Postgres",
        whenCompetitor: [
          "Your team is already deep in the Heroku ecosystem and uses several add-ons.",
          "You depend on Heroku-specific tooling (pg:psql CLI, fork/follow, dataclips).",
          "Your current Heroku database is stable and budget isn't the constraint.",
          "Your infra is policy-locked to Salesforce-owned services.",
        ],
        whenSwyftstack: [
          "Your database is under 64 GB and the Standard-0 minimum feels like a tax.",
          "You want a one-click restore button, not a manual pg:backups:restore + pg:promote dance.",
          "You want S3-compatible storage on the same invoice instead of bolting on Bucketeer or AWS.",
          "You want a modern dashboard that shows live usage, scoped credentials, and audit logs.",
          "You're paying for hobby tier and you've hit the row limit.",
        ],
      })}
      comparison={{
        eyebrow: "Side-by-side",
        title: "Heroku Standard-0 vs Swyftstack Starter / Growth",
        subtitle: "Heroku's lowest production tier compared to Swyftstack's two paid tiers. All numbers from the vendors' public pricing pages.",
        columns: makeComparisonColumns("Heroku Standard-0"),
        rows: [
          { label: "Monthly price (launch)", cells: ["$50", "$9 Starter / $49 Growth"] },
          { label: "Minimum database storage", cells: ["64 GB minimum tier", "No minimum"] },
          { label: "Real PostgreSQL", cells: ["Yes - PG 14/15/16", "Yes - PG 16, unmodified"] },
          { label: "Daily backups", cells: ["Yes - manual config", "Automatic, encrypted"] },
          { label: "One-click restore", cells: ["Manual pg:backups:restore", "One click"] },
          { label: "Provisioning time", cells: ["~2-3 minutes", "47 seconds"] },
          { label: "Object storage included", cells: ["No - add Bucketeer", "100 GB Starter / 1 TB Growth"] },
          { label: "Egress included", cells: ["Per-dyno bandwidth", "500 GB Starter / 5 TB Growth"] },
          { label: "Modern dashboard", cells: ["Classic Heroku UI", "Live metering, scoped creds, audit logs"] },
          { label: "Migration helper", cells: ["pg:copy / pg:backups", "Three-click hosted migration"] },
          { label: "Annual discount", cells: ["No", "21% off"] },
        ],
      }}
      steps={{
        eyebrow: "Switching cost",
        title: "From Standard-0 to a real bill in a weekend",
        subtitle: "The migration is connection-string-level. Your Heroku app code doesn't change; you swap DATABASE_URL when ready.",
        items: [
          { n: 1, title: "Create a Swyftstack database", body: "Pick US or EU region. Copy the DATABASE_URL." },
          { n: 2, title: "Run the migration", body: "Paste your Heroku DATABASE_URL into Swyftstack. We pg_dump over the wire while your Heroku app keeps running." },
          { n: 3, title: "Swap the env var", body: "heroku config:set DATABASE_URL=...swyftstack.com. heroku restart. Done." },
          { n: 4, title: "Decommission the Heroku DB", body: "Only after you're satisfied. We keep your old database warm so rollback is free." },
        ],
      }}
      bullets={{
        eyebrow: "Pricing",
        title: "What you pay for, what you don't",
        subtitle: "Bring last month's Heroku invoice. We'll do the line-by-line math with you.",
        items: PAY_FOR_BULLETS,
      }}
      faq={{
        items: [
          { q: "Can I migrate without downtime?", a: "Yes for the database move itself. Your Heroku database stays untouched until you swap DATABASE_URL on your app. The only app interruption is the restart after the env var change - a few seconds." },
          { q: "Does pg_dump from Heroku work?", a: "Yes. We use standard PostgreSQL tooling internally. Whatever Heroku's pg_dump produces, we can restore." },
          { q: "What about Heroku Connect or other add-ons?", a: "Swyftstack focuses on the database and storage layer. Keep Heroku add-ons where you need them, or replace them with best-in-class tools while Swyftstack runs your production data." },
          { q: "I'm on Heroku Hobby ($9). Why move?", a: "Hobby has a 10K row limit and no daily backups. Swyftstack Starter is the same $9 (launch) with no row limit, daily encrypted backups, and 100 GB of object storage you don't get on Heroku at all." },
          { q: "Can I keep my Heroku app and just move the database?", a: "Yes. That's the most common pattern. heroku config:set is the entire app-side change." },
          ...SHARED_DB_FAQ,
        ],
      }}
      finalCta={{
        title: "Cut the Heroku database bill. Keep the workflow you like.",
        subtitle: "Real PostgreSQL, modern dashboard, standard tooling. Same data. Friendlier invoice.",
        primary: { label: "Migrate from Heroku", href: "/migrate-from-heroku" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
