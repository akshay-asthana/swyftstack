// /supabase-alternative - high-volume commercial SEO page. Content from
// MARKETING_PAGES_CONTENT.md §16 (Page 16). Targets keywords:
// "supabase alternative", "alternatives to supabase", "supabase competitor".
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const TITLE = "Supabase alternative - focused PostgreSQL & S3 storage | Swyftstack";
const DESCRIPTION = "Looking for a Supabase alternative? See why teams choose Swyftstack for production PostgreSQL, S3-compatible storage, faster operations, and predictable pricing.";

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
      headline="Looking for a Supabase alternative?"
      headlineAccent="Choose the focused data platform."
      subheadline="Supabase is broad. Swyftstack is the faster path when your team wants managed PostgreSQL, S3-compatible storage, backups, migrations, and a bill you can forecast."
      primaryCta={{ label: "Migrate from Supabase", href: "/migrate-from-supabase" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={{
        left: {
          title: "Where Supabase can add overhead",
          items: [
            "You only need one bundled provider for auth, database, storage, edge functions, realtime, and generated APIs",
            "Your team is comfortable adopting Supabase-specific workflows across the backend",
            "You want dashboard-managed row-level security and generated APIs to shape your app architecture",
            "You accept a wider product surface even when you only need durable data infrastructure",
          ],
        },
        right: {
          title: "Why teams choose Swyftstack",
          items: [
            "Purpose-built managed PostgreSQL and S3-compatible storage without platform sprawl",
            "Flat, predictable plans with more included egress on Starter",
            "Bring best-in-class auth such as Clerk, Auth0, NextAuth, or your own system",
            "A cleaner operations dashboard for backups, restore, migration, usage, and team control",
            "A production backend that pairs naturally with Lovable, Bolt, Cursor, v0, Vercel, and Netlify",
          ],
        },
      }}
      comparison={{
        eyebrow: "Why Swyftstack wins",
        title: "Supabase Pro vs Swyftstack Starter",
        columns: [
          { label: "Feature" },
          { label: "Supabase Pro" },
          { label: "Swyftstack Starter", highlight: true },
        ],
        rows: [
          { label: "Monthly price",         cells: ["", "$25", "$19"] },
          { label: "Launch price (2 mo)",   cells: ["", "-", "$9"] },
          { label: "Database storage",      cells: ["", "8 GB", "10 GB"] },
          { label: "Object storage",        cells: ["", "100 GB", "100 GB"] },
          { label: "Egress included",       cells: ["", "250 GB", "500 GB"] },
          { label: "Daily backups",         cells: ["", true, true] },
          { label: "One-click restore",     cells: ["", "Manual", "One click"] },
          { label: "Auth strategy",         cells: ["", "Bundled Supabase Auth", "Choose Clerk, Auth0, NextAuth, or your own"] },
          { label: "Edge logic",            cells: ["", "Bundled edge functions", "Run in your app stack"] },
          { label: "Realtime",              cells: ["", "Bundled realtime service", "Postgres-native or dedicated realtime service"] },
          { label: "API layer",             cells: ["", "Auto-generated APIs", "Application-owned API"] },
          { label: "Static site hosting",   cells: ["", false, "Unlimited"] },
          { label: "Annual discount",       cells: ["", "Limited", "21% off"] },
        ],
      }}
      faq={{
        title: "Supabase alternative FAQ",
        items: [
          { q: "Will my Supabase data migrate cleanly?", a: "Yes. We migrate Postgres schema, data, indexes, and common extensions byte-for-byte. Supabase Auth users and Edge Functions stay where they are - see /migrate-from-supabase for the full plan." },
          { q: "Can I keep Supabase Auth?", a: "Yes. Auth and database can live on different platforms. Point Supabase Auth at your Swyftstack connection string and it works. Or move auth to NextAuth, Clerk, or Auth0." },
          { q: "What about Realtime?", a: "Use PostgreSQL LISTEN/NOTIFY directly, or keep Supabase Realtime pointed at your Swyftstack database." },
          { q: "Why do teams pick Swyftstack over Supabase?", a: "They want the operational parts of a production backend handled cleanly: PostgreSQL, object storage, backups, restore, migration, usage, and team controls. Swyftstack keeps that surface fast, predictable, and focused." },
        ],
      }}
      finalCta={{
        title: "Move to the data platform that stays focused.",
        subtitle: "Migrate in three clicks - free until you switch your DATABASE_URL.",
        primary: { label: "Migrate from Supabase", href: "/migrate-from-supabase" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
