// /supabase-alternative — high-volume commercial SEO page. Content from
// MARKETING_PAGES_CONTENT.md §16 (Page 16). Targets keywords:
// "supabase alternative", "alternatives to supabase", "supabase competitor".
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const TITLE = "Supabase alternative — managed PostgreSQL & S3 storage | Swyftstack";
const DESCRIPTION = "Looking for a Supabase alternative? Honest comparison: when Supabase is the right choice and when Swyftstack — managed PostgreSQL, S3-compatible storage, predictable pricing — is.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/supabase-alternative` },
  openGraph: {
    title: "Swyftstack vs Supabase — honest comparison",
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
      headlineAccent="Honest comparison."
      subheadline="We'll tell you when Supabase is the right choice — and when Swyftstack is."
      primaryCta={{ label: "Migrate from Supabase", href: "/migrate-from-supabase" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={{
        left: {
          title: "When Supabase is the right choice",
          items: [
            "You want auth, database, storage, edge functions, realtime, and vector search from one provider",
            "You like auto-generated APIs over your tables",
            "You configure row-level security in the dashboard",
            "You're happy trading some simplicity for breadth of features",
          ],
        },
        right: {
          title: "When Swyftstack is the right choice",
          items: [
            "You want managed PostgreSQL and storage — and nothing else",
            "You want a flat, predictable monthly bill",
            "You bring your own auth (NextAuth, Clerk, Auth0)",
            "You want a dashboard that loads instantly because it isn't trying to do ten things",
            "You're building with Lovable, Bolt, Cursor, or v0",
          ],
        },
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
          { label: "Monthly price",         cells: ["", "$25", "$19"] },
          { label: "Launch price (2 mo)",   cells: ["", "—", "$9"] },
          { label: "Database storage",      cells: ["", "8 GB", "10 GB"] },
          { label: "Object storage",        cells: ["", "100 GB", "100 GB"] },
          { label: "Egress included",       cells: ["", "250 GB", "500 GB"] },
          { label: "Daily backups",         cells: ["", true, true] },
          { label: "One-click restore",     cells: ["", "Manual", "One click"] },
          { label: "Auth service",          cells: ["", true, "Bring your own"] },
          { label: "Edge functions",        cells: ["", true, false] },
          { label: "Realtime",              cells: ["", true, false] },
          { label: "Auto-generated APIs",   cells: ["", true, false] },
          { label: "Static site hosting",   cells: ["", false, "Unlimited"] },
          { label: "Annual discount",       cells: ["", "Limited", "21% off"] },
        ],
      }}
      faq={{
        title: "Supabase alternative FAQ",
        items: [
          { q: "Will my Supabase data migrate cleanly?", a: "Yes. We migrate Postgres schema, data, indexes, and common extensions byte-for-byte. Supabase Auth users and Edge Functions stay where they are — see /migrate-from-supabase for the full plan." },
          { q: "Can I keep Supabase Auth?", a: "Yes. Auth and database can live on different platforms. Point Supabase Auth at your Swyftstack connection string and it works. Or move auth to NextAuth, Clerk, or Auth0." },
          { q: "What about Realtime?", a: "Use PostgreSQL LISTEN/NOTIFY directly, or keep Supabase Realtime pointed at your Swyftstack database." },
          { q: "Is Swyftstack cheaper at scale?", a: "Pricing is more predictable. Starter is $19/mo flat (down from $9 during launch) for 10 GB and 500 GB egress; Pro is $99/mo for 100 GB and 5 TB egress. Read the table above for a tier-by-tier breakdown." },
        ],
      }}
      finalCta={{
        title: "Supabase isn't the only option.",
        subtitle: "Migrate in three clicks — free until you switch your DATABASE_URL.",
        primary: { label: "Migrate from Supabase", href: "/migrate-from-supabase" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
