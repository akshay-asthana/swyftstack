// /migrate-from-railway — content from MARKETING_PAGES_CONTENT.md §13.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Migrate your Postgres database from Railway to Swyftstack in three clicks. Predictable flat pricing, included daily backups. Free until you switch DATABASE_URL.";

export const metadata: Metadata = {
  title: "Migrate from Railway to Swyftstack | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/migrate-from-railway` },
  openGraph: { title: "Migrate from Railway — Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/migrate-from-railway`, type: "article" },
};

export default function FromRailwayPage() {
  return (
    <MarketingTemplate
      eyebrow="From Railway"
      headline="Migrate from Railway to Swyftstack"
      headlineAccent="in three clicks."
      subheadline="Keep Railway for app hosting if you like. We just take the database — flat bill, included backups."
      primaryCta={{ label: "Start migration", href: "/signup" }}
      secondaryCta={{ label: "Compare to Railway", href: "/railway-alternative" }}
      steps={{
        eyebrow: "How",
        title: "Four steps",
        items: [
          { n: 1, title: "Get your Railway Postgres connection string", body: "Railway dashboard → your Postgres service → Connect → copy the \"Postgres Connection URL\"." },
          { n: 2, title: "Paste into Swyftstack",                        body: "Swyftstack dashboard → Migrate → \"From Railway\". Paste, click Start." },
          { n: 3, title: "Wait for the progress bar",                     body: "Usually 2–5 minutes for under 5 GB. Larger databases scale with size." },
          { n: 4, title: "Update DATABASE_URL on your app",                body: "Whether your app runs on Railway, Vercel, Fly, or your own VPS — swap the env var and redeploy." },
        ],
      }}
      faq={{
        items: [
          { q: "Can I keep my Railway app and just use Swyftstack for the database?", a: "Yes — this is exactly what most migrants do. Drop the Swyftstack DATABASE_URL into your Railway service's env vars." },
          { q: "Does Railway's Postgres image have anything custom?", a: "It's stock Postgres. Standard pg_dump/pg_restore handle it cleanly." },
          { q: "Will my Railway service downtime?", a: "Only during the env-var swap and restart. Otherwise no — your old database keeps serving until you switch." },
        ],
      }}
      finalCta={{
        title: "Predictable bills. Included backups.",
        subtitle: "Migration is free. You start paying when you switch DATABASE_URL.",
        primary: { label: "Start migration", href: "/signup" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
