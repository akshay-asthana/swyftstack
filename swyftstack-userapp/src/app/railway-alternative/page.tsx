// /railway-alternative - commercial comparison page. Rewritten to make
// Swyftstack the obvious choice for teams whose Railway bill is dominated
// by the database + storage portion of the stack.
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

const DESCRIPTION = "Railway alternative for production data: flat monthly billing, daily backups, included S3-compatible storage, three-click migration, and a focused dashboard.";

export const metadata: Metadata = {
  title: "Railway alternative - predictable database pricing | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/railway-alternative` },
  openGraph: { title: "Swyftstack vs Railway", description: DESCRIPTION, url: `${SITE_URL}/railway-alternative`, type: "article" },
};

export default function RailwayAlternativePage() {
  return (
    <MarketingTemplate
      eyebrow="Railway alternative"
      headline="Keep Railway for apps. Move the database to"
      headlineAccent="something predictable."
      subheadline="Railway is a great place to run app containers. The database tier - billed by the GB-hour - is where most Railway invoices get noisy. Swyftstack is the focused PostgreSQL + S3 layer that you point your Railway services at."
      primaryCta={{ label: "Migrate from Railway", href: "/migrate-from-railway" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={competitorWhenList({
        competitor: "Railway",
        whenCompetitor: [
          "You run several containerised services and you like Railway's project orchestration.",
          "Your monthly Railway bill is mostly compute, not data, and the database tier is fine.",
          "You're prototyping and the database is throwaway - usage-meter pricing is cheap for that.",
          "You want your app and database in the same dashboard for an early-stage team.",
        ],
        whenSwyftstack: [
          "Your Railway invoice is dominated by Postgres GB-hours and egress, and you want a flat number.",
          "You want daily backups configured for you instead of bolting on a cron job.",
          "You want S3-compatible storage on the same bill instead of stitching in R2 or B2.",
          "You want a one-click restore button, not a manual pg_restore drill at 2am.",
          "You'd rather email a human than file a ticket and wait.",
        ],
      })}
      comparison={{
        eyebrow: "Side-by-side",
        title: "Railway Hobby vs Swyftstack Starter / Growth",
        subtitle: "Comparing the data-tier specifically - what you actually get for the database half of the bill.",
        columns: makeComparisonColumns("Railway Hobby"),
        rows: [
          { label: "Monthly price (data tier)", cells: ["$5 base + GB-hour usage", "$9 Starter (launch) / $49 Growth"] },
          { label: "Predictable monthly bill", cells: ["No - varies with usage", "Yes - flat per tier"] },
          { label: "Real PostgreSQL (no proxy)", cells: ["Yes", "Yes - PG 16 unmodified"] },
          { label: "Database storage included", cells: ["5 GB included, then metered", "10 GB Starter / 100 GB Growth"] },
          { label: "Object storage included", cells: ["Not included", "100 GB Starter / 1 TB Growth"] },
          { label: "Egress included", cells: ["Metered, $0.05/GB after 100 GB", "500 GB Starter / 5 TB Growth"] },
          { label: "Daily backups", cells: ["Manual setup / DIY cron", "Automatic, encrypted, 7-30 day retention"] },
          { label: "One-click restore", cells: ["Manual pg_restore", "One click"] },
          { label: "Migration tool", cells: ["Self-service pg_dump", "Three-click hosted migration"] },
          { label: "Provisioning time", cells: ["~2 minutes", "47 seconds"] },
          { label: "Single invoice for db + storage + egress", cells: ["Yes (within Railway)", "Yes"] },
          { label: "Vendor lock-in", cells: ["Low - standard PG", "Low - standard PG + S3"] },
        ],
      }}
      steps={{
        eyebrow: "Switching cost",
        title: "Keep Railway. Just move the database.",
        subtitle: "You don't have to leave Railway to take the database off the usage meter. Run your app where it is; change one env var.",
        items: [
          { n: 1, title: "Spin up a Swyftstack database", body: "47 seconds. Copy the connection string." },
          { n: 2, title: "Run a hosted migration", body: "Paste your Railway Postgres URL. We pg_dump over the wire while your app keeps running." },
          { n: 3, title: "Update Railway env vars", body: "Change DATABASE_URL on your Railway service. Redeploy." },
          { n: 4, title: "Turn off the Railway database", body: "Only after you're satisfied - the old database stays warm so rollback is free." },
        ],
      }}
      bullets={{
        eyebrow: "Pricing",
        title: "What you pay for, what you don't",
        subtitle: "If your Railway database tier is over $30/mo, the math almost always works in our favour. Bring last month's invoice and we'll do the comparison with you.",
        items: PAY_FOR_BULLETS,
      }}
      faq={{
        items: [
          { q: "Can I keep Railway and use Swyftstack only for the database?", a: "Yes - that's the most common pattern. Keep your Railway app services exactly where they are; point DATABASE_URL at Swyftstack. The migration tool handles the cut-over." },
          { q: "How does Swyftstack make database spend easier to forecast?", a: "Starter is $9/mo (launch) flat - storage, backups, restore, and 500 GB egress included. You know the database number before the month starts." },
          { q: "Will my Railway Postgres data migrate cleanly?", a: "Yes. We migrate the schema, data, and indexes byte-for-byte. Connection-string-level cut-over - your Railway app code doesn't change." },
          { q: "Does the migration cause downtime?", a: "No. The source database keeps serving traffic during the migration. You only swap DATABASE_URL when verification passes and you're ready." },
          { q: "What if I also need object storage?", a: "Included on every plan - same S3-compatible API as AWS. You can drop Railway's volume mounts or B2/R2 buckets and consolidate the invoice." },
          ...SHARED_DB_FAQ,
        ],
      }}
      finalCta={{
        title: "Make the database bill predictable.",
        subtitle: "Three-click migration. Your Railway app stays where it is. Roll back free until you're sure.",
        primary: { label: "Migrate from Railway", href: "/migrate-from-railway" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
