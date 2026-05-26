// /supabase-alternative - high-volume commercial SEO page. Targets keywords:
// "supabase alternative", "alternatives to supabase", "supabase competitor".
//
// Goal of the rewrite: when a reader lands here, the page should answer
// "should I switch?" decisively. Every section is structured to make
// Swyftstack the obvious choice for teams who want a focused data platform
// rather than an all-in-one BaaS.
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

const TITLE = "Supabase alternative - focused PostgreSQL & S3 storage | Swyftstack";
const DESCRIPTION = "Compare Supabase and Swyftstack for production PostgreSQL, S3-compatible storage, daily backups, three-click migrations, and predictable monthly pricing.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/supabase-alternative` },
  openGraph: {
    title: "Swyftstack vs Supabase",
    description: DESCRIPTION,
    url: `${SITE_URL}/supabase-alternative`,
    type: "article",
  },
};

export default function SupabaseAlternativePage() {
  return (
    <MarketingTemplate
      eyebrow="Supabase alternative"
      headline="The focused Supabase alternative for teams who"
      headlineAccent="outgrow the all-in-one."
      subheadline="Real PostgreSQL, S3-compatible storage, daily backups, and a bill you can forecast. Bring your own auth (Clerk, Auth0, NextAuth). Move in three clicks - your existing Supabase database keeps serving traffic the whole time."
      primaryCta={{ label: "Migrate from Supabase", href: "/migrate-from-supabase" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={competitorWhenList({
        competitor: "Supabase",
        whenCompetitor: [
          "You want auth, database, storage, realtime, edge functions, and generated APIs from one vendor.",
          "Your team is fluent in Supabase-specific row-level security and you want it everywhere.",
          "You're optimising for the integrated developer experience over invoice clarity or vendor neutrality.",
          "You're building a prototype where the bundled auth + realtime is what makes the demo land.",
        ],
        whenSwyftstack: [
          "You want real PostgreSQL with no PostgREST proxy, no proprietary client, and no opinion about how you write queries.",
          "You want pricing you can forecast — one flat monthly number, with overage rates published next to the plan, not hidden behind a usage meter.",
          "You want a single invoice for database + storage + egress instead of three line items in three different unit systems.",
          "You're paying for the Pro bundle and only really use the database + storage half of it.",
          "You want pg_dump, full schema export, and S3 object export to be first-class, not a support-ticket conversation.",
          "You don't want a free tier — you want paying customers to fund the support, not subsidise freeloaders.",
          "You'd rather get a one-hour reply from a founder than a 'we'll get back to you in 3-5 business days' SLA.",
        ],
      })}
      comparison={{
        eyebrow: "Side-by-side",
        title: "Supabase Pro vs Swyftstack Starter / Growth",
        subtitle: "We picked the cheapest Supabase tier that includes daily backups and compared it to the equivalent Swyftstack plan. The numbers below are from each vendor's public pricing page.",
        columns: makeComparisonColumns("Supabase Pro"),
        rows: [
          { label: "Monthly price (launch)", cells: ["$25", "$9 (Starter) / $49 (Growth)"] },
          { label: "Real PostgreSQL (no proxy)", cells: ["Yes - with PostgREST in front", "Yes - no proxy, no fork"] },
          { label: "Database storage", cells: ["8 GB", "10 GB Starter / 100 GB Growth"] },
          { label: "Object storage", cells: ["100 GB", "100 GB Starter / 1 TB Growth"] },
          { label: "Egress included", cells: ["250 GB", "500 GB Starter / 5 TB Growth"] },
          { label: "Pricing model", cells: ["Usage-metered (compute hours, IOPS, bandwidth)", "Flat monthly fee, overage rates published"] },
          { label: "Compute charged separately", cells: ["Yes - per-hour add-on per project", "No - compute included in plan"] },
          { label: "Per-project add-ons", cells: ["Daily backups, PITR, log retention all extra", "Daily backups + 30-day retention included on Growth"] },
          { label: "Daily backups", cells: ["7 day on Pro (PITR is paid add-on)", "7 day Starter / 30 day Growth"] },
          { label: "One-click restore", cells: ["Manual SQL restore", "One click"] },
          { label: "Provisioning time", cells: ["~2 minutes", "47 seconds"] },
          { label: "Realtime", cells: ["Bundled realtime service", "LISTEN/NOTIFY or any external realtime"] },
          { label: "Single invoice for db + storage + egress", cells: ["Yes - but split across compute, db, storage, egress, log line items", "Yes - one line, one number"] },
          { label: "Free tier", cells: ["Free project tier (auto-paused after 7 days)", "No free tier - paying customers fund the support"] },
          { label: "Bandwidth surprise fees", cells: ["Egress over 250 GB billed per-GB monthly", "Overage rate published next to the plan"] },
          { label: "Migration helper to move OFF the platform", cells: ["Self-service pg_dump", "Three-click export, we'll help"] },
          { label: "Vendor lock-in surface", cells: ["RLS + PostgREST + auth.uid() across the codebase", "Standard Postgres + S3, no proprietary helpers"] },
          { label: "Founder-level email support", cells: ["Pro+ tier", "Pro tier, replies from a real human"] },
        ],
      }}
      steps={{
        eyebrow: "Switching cost",
        title: "How a real switch looks",
        subtitle: "Migrations off Supabase happen on warm databases. Your old database keeps serving traffic until you flip DATABASE_URL. If anything looks wrong, don't flip - we keep both running until you're satisfied.",
        items: [
          { n: 1, title: "Pick a target plan", body: "Starter for prototypes; Growth for production. Both include the migration helper." },
          { n: 2, title: "Paste your Supabase connection string", body: "We do a streaming pg_dump over the wire. Your existing app keeps running, untouched." },
          { n: 3, title: "Wait for the checksum verification", body: "Tables, row counts, and indexes verified end-to-end before we hand you the new URL." },
          { n: 4, title: "Swap DATABASE_URL when ready", body: "Roll back is free - your old database is still serving traffic, so a bad cut-over costs nothing." },
        ],
      }}
      bullets={{
        eyebrow: "Pricing",
        title: "What you pay for, what you don't",
        subtitle: "The honest version. Compare our plans to your last Supabase invoice.",
        items: PAY_FOR_BULLETS,
      }}
      faq={{
        title: "Supabase alternative FAQ",
        items: [
          { q: "Will my Supabase data migrate cleanly?", a: "Yes. We migrate Postgres schema, data, indexes, and common extensions byte-for-byte. Supabase Auth users and Edge Functions stay where they are - see /migrate-from-supabase for the full plan." },
          { q: "Can I keep Supabase Auth and just move the database?", a: "Yes. Auth and database can live on different platforms. Point Supabase Auth at your Swyftstack connection string and it works. Or move auth to NextAuth, Clerk, or Auth0 while you're at it." },
          { q: "What about Realtime?", a: "Use PostgreSQL LISTEN/NOTIFY directly, or keep Supabase Realtime pointed at your Swyftstack database. Most teams find LISTEN/NOTIFY plus a thin Node service is simpler and cheaper than a dedicated realtime product." },
          { q: "What about Edge Functions?", a: "Keep them on Supabase, or move them to Vercel/Netlify/Cloudflare. Edge functions don't care which database they call - just point them at the new connection string." },
          { q: "Will my Row-Level Security policies migrate?", a: "Yes, with one caveat: policies that reference auth.uid() or other Supabase auth helpers need to be rewritten against your new auth provider's user IDs. We can pair on this during the migration." },
          { q: "Why do teams pick Swyftstack over Supabase?", a: "Three reasons we hear most: predictable flat-rate pricing, real PostgreSQL with no PostgREST proxy in front, and a focused dashboard that doesn't bundle features you don't use." },
          ...SHARED_DB_FAQ,
        ],
      }}
      finalCta={{
        title: "Move to the focused data platform.",
        subtitle: "Three-click migration. Your Supabase database keeps serving until you're ready to flip DATABASE_URL.",
        primary: { label: "Migrate from Supabase", href: "/migrate-from-supabase" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
