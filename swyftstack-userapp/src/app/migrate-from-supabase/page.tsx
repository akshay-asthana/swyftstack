// /migrate-from-supabase - content from MARKETING_PAGES_CONTENT.md §12.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Migrate from Supabase to Swyftstack in three clicks. Paste your Supabase connection string, watch the progress bar, copy your new DATABASE_URL. Source database untouched.";

export const metadata: Metadata = {
  title: "Migrate from Supabase to Swyftstack - three clicks | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/migrate-from-supabase` },
  openGraph: { title: "Migrate from Supabase - Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/migrate-from-supabase`, type: "article" },
};

export default function FromSupabasePage() {
  return (
    <MarketingTemplate
      eyebrow="From Supabase"
      headline="Migrate from Supabase to Swyftstack"
      headlineAccent="in three clicks."
      subheadline="Paste your Supabase connection string. We do the rest. Your source database is never touched."
      primaryCta={{ label: "Start migration", href: "/signup" }}
      secondaryCta={{ label: "See Supabase comparison", href: "/supabase-alternative" }}
      whenLists={{
        left: {
          title: "Why people leave Supabase",
          items: [
            "The bill is harder to predict as the product expands",
            "The dashboard is getting slower as features pile up",
            "They want PostgreSQL without the platform layered on top",
            "They use their own auth (NextAuth, Clerk, Auth0)",
            "They want fewer moving parts",
          ],
        },
        right: {
          title: "What Swyftstack ships instead",
          items: [
            "Flat $19/mo Starter ($9 launch price), $99/mo Growth ($49 launch)",
            "Instant dashboard with masked connection strings",
            "Bring your own auth, no Supabase Auth lock-in",
            "Daily encrypted backups + one-click restore",
            "Three-click migration in, with checksum verification",
          ],
        },
      }}
      steps={{
        eyebrow: "How",
        title: "Four steps. Most of them take seconds.",
        items: [
          { n: 1, title: "Get your Supabase connection string", body: "Supabase dashboard → Project Settings → Database → Connection string (URI format). Copy the full URI." },
          { n: 2, title: "Paste into Swyftstack",                body: "Swyftstack dashboard → Migrate → \"From Supabase\". Paste, click Start." },
          { n: 3, title: "Wait for the progress bar",            body: "Usually 2-5 minutes for projects under 5 GB. Larger databases scale with size." },
          { n: 4, title: "Update DATABASE_URL in your app",      body: "Swap in the new connection string and redeploy. Your old Supabase project is untouched until you decide to delete it." },
        ],
      }}
      bullets={{
        eyebrow: "What migrates",
        title: "Everything Postgres",
        items: [
          { title: "Schema & data",        body: "Tables, indexes, constraints, foreign keys, sequences - byte-for-byte verified." },
          { title: "Common extensions",     body: "uuid-ossp, pgcrypto, pg_trgm, citext, PostGIS, pgvector - all preserved." },
          { title: "RLS policies (optional)", body: "We can copy them, or skip them if you're moving to app-level authorization. Your call." },
        ],
      }}
      comparison={{
        eyebrow: "Side-by-side",
        title: "Supabase Pro vs Swyftstack Starter",
        columns: [
          { label: "Feature" },
          { label: "Supabase Pro" },
          { label: "Swyftstack Starter", highlight: true },
        ],
        rows: [
          { label: "Monthly price",       cells: ["", "$25", "$19"] },
          { label: "Launch price (2 mo)", cells: ["", "-", "$9"] },
          { label: "Database storage",    cells: ["", "8 GB", "10 GB"] },
          { label: "Object storage",      cells: ["", "100 GB", "100 GB"] },
          { label: "Egress included",     cells: ["", "250 GB", "500 GB"] },
          { label: "Daily backups",       cells: ["", true, true] },
          { label: "Annual discount",     cells: ["", "Limited", "21% off"] },
          { label: "Auth service",        cells: ["", true, "Bring your own"] },
        ],
      }}
      faq={{
        items: [
          { q: "What about Supabase Auth users?", a: "Auth is a separate Supabase service. Keep Supabase Auth pointed at your Swyftstack connection string (it works), or move to NextAuth, Clerk, or Auth0." },
          { q: "What about Supabase Storage files?", a: "Use the storage migration tool - both Swyftstack Storage and Supabase Storage are S3-compatible, so the move is straightforward." },
          { q: "Will my app go down?", a: "Only for the seconds it takes to swap DATABASE_URL and restart your app." },
          { q: "Can I roll back?", a: "Yes. Your Supabase database is untouched. Until you change DATABASE_URL, your old database is still serving traffic." },
        ],
      }}
      finalCta={{
        title: "Migrate from Supabase - free until you switch.",
        primary: { label: "Start migration", href: "/signup" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
