// /render-alternative - comparison page. Rewritten to frame Swyftstack as
// the obvious upgrade for Render teams whose database tier has outgrown the
// $7 entry plan but doesn't justify the jump to a larger Render PG tier.
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

const DESCRIPTION = "Render alternative for your database layer: PostgreSQL provisioned in seconds, daily backups, one-click restore, included S3-compatible storage, and three-click migration.";

export const metadata: Metadata = {
  title: "Render alternative - focused data layer | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/render-alternative` },
  openGraph: { title: "Swyftstack vs Render", description: DESCRIPTION, url: `${SITE_URL}/render-alternative`, type: "article" },
};

export default function RenderAlternativePage() {
  return (
    <MarketingTemplate
      eyebrow="Render alternative"
      headline="Keep Render for services. Move the database to a"
      headlineAccent="focused data platform."
      subheadline="Render's Starter Postgres ($7, 1 GB) is great for prototypes. The jump to Standard ($90+, 10 GB) is the cliff most teams notice. Swyftstack Starter is $9/mo (launch) with 10 GB Postgres, 100 GB S3-compatible storage, daily backups, and a one-click restore button."
      primaryCta={{ label: "Start with Swyftstack", href: "/signup" }}
      secondaryCta={{ label: "Start a migration", href: "/migrate" }}
      whenLists={competitorWhenList({
        competitor: "Render",
        whenCompetitor: [
          "You run several web services on Render and you want the database next to them in the same dashboard.",
          "You need Render's private networking for service-to-service traffic.",
          "Your database is genuinely under 1 GB and the Starter tier covers you.",
          "You want a single vendor for app + database and accept the database-tier cliff.",
        ],
        whenSwyftstack: [
          "You've outgrown Render Starter Postgres (1 GB) but Standard ($90/mo) is overkill.",
          "You want S3-compatible storage on the same bill instead of pointing at AWS or Backblaze.",
          "You want a one-click restore button instead of a manual pg_restore.",
          "You want database provisioning to take 47 seconds, not 3-5 minutes.",
          "Your Render Postgres bill is the line item your CFO keeps asking about.",
        ],
      })}
      comparison={{
        eyebrow: "Side-by-side",
        title: "Render Starter Postgres vs Swyftstack Starter / Growth",
        subtitle: "Numbers from each vendor's public pricing page. Render's next tier (Standard) is ~$90/mo for 10 GB - that's the real apples-to-apples comparison.",
        columns: makeComparisonColumns("Render Starter Postgres"),
        rows: [
          { label: "Monthly price (launch)", cells: ["$7", "$9 Starter / $49 Growth"] },
          { label: "Database storage", cells: ["1 GB", "10 GB Starter / 100 GB Growth"] },
          { label: "Real PostgreSQL", cells: ["Yes - PG 15/16", "Yes - PG 16, unmodified"] },
          { label: "Daily backups", cells: ["7 days", "7 day Starter / 30 day Growth"] },
          { label: "One-click restore", cells: ["Manual", "One click"] },
          { label: "Provisioning time", cells: ["3-5 minutes", "47 seconds"] },
          { label: "Object storage included", cells: ["No - separate add-on", "100 GB Starter / 1 TB Growth"] },
          { label: "Three-click migration in", cells: ["No", "Yes"] },
          { label: "PgBouncer pooling", cells: ["Manual setup", "Configured for you"] },
          { label: "Live usage metering", cells: ["Basic", "Per-minute storage + egress"] },
          { label: "Single invoice for db + storage + egress", cells: ["No - need extra vendor", "Yes"] },
        ],
      }}
      steps={{
        eyebrow: "Switching cost",
        title: "Keep Render. Just move the database.",
        subtitle: "Connection-string-level cut-over. Your Render web services don't need to change.",
        items: [
          { n: 1, title: "Provision a Swyftstack database", body: "47 seconds, US or EU region. Copy the DATABASE_URL." },
          { n: 2, title: "Run a hosted migration", body: "Paste your Render Postgres URL. We pg_dump over the wire; Render database keeps serving." },
          { n: 3, title: "Update Render env vars", body: "Change DATABASE_URL on your Render service. Render redeploys automatically." },
          { n: 4, title: "Decommission Render Postgres", body: "Only after you're happy. The old database is warm so rollback is free." },
        ],
      }}
      bullets={{
        eyebrow: "Pricing",
        title: "What you pay for, what you don't",
        subtitle: "If your Render Postgres line is over $30/mo, the math almost always works in Swyftstack's favour - especially when you fold in the storage line.",
        items: PAY_FOR_BULLETS,
      }}
      faq={{
        items: [
          { q: "Can I keep Render and use Swyftstack only for the database?", a: "Yes. That's the most common pattern. Render runs your web services; Swyftstack runs the data. One env var changes." },
          { q: "Is migrating from Render easy?", a: "Paste your Render Postgres connection string into Swyftstack's migration tool. Three clicks, source database untouched, verified with checksums." },
          { q: "Will my SSL configuration work?", a: "Yes - both Render and Swyftstack require SSL by default. Standard sslmode=require in the connection string is all you need." },
          { q: "What if I also need object storage?", a: "Included on every Swyftstack plan with the standard S3 API. You can drop Render's disks or your separate B2/R2 bucket and consolidate the invoice." },
          ...SHARED_DB_FAQ,
        ],
      }}
      finalCta={{
        title: "Upgrade the data layer without moving the whole app.",
        subtitle: "Three-click migration. Render keeps running your services. Roll back free until you're satisfied.",
        primary: { label: "Try Swyftstack", href: "/signup" },
        secondary: { label: "Start a migration", href: "/migrate" },
      }}
    />
  );
}
