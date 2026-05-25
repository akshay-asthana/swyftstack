// /railway-alternative — content from MARKETING_PAGES_CONTENT.md §17.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Railway alternative: flat monthly billing, included daily backups, and one-click migration in. Honest comparison of Railway Hobby vs Swyftstack Starter.";

export const metadata: Metadata = {
  title: "Railway alternative — predictable database pricing | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/railway-alternative` },
  openGraph: { title: "Swyftstack vs Railway", description: DESCRIPTION, url: `${SITE_URL}/railway-alternative`, type: "article" },
};

export default function RailwayAlternativePage() {
  return (
    <MarketingTemplate
      eyebrow="Railway alternative"
      headline="Looking for a Railway alternative?"
      headlineAccent="Here's where we differ."
      subheadline="Railway is great at hosting your whole app. We're great at hosting your database."
      primaryCta={{ label: "Migrate from Railway", href: "/migrate-from-railway" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={{
        left: {
          title: "When Railway is the right choice",
          items: [
            "You want one place to host your app, database, background workers, and cron",
            "You like infrastructure-as-code workflows",
            "You're comfortable with usage-based billing for the flexibility",
            "You want to deploy your entire stack with one config",
          ],
        },
        right: {
          title: "When Swyftstack is the right choice",
          items: [
            "You only need a managed database and storage — not the rest of the platform",
            "You want a flat monthly bill instead of a usage meter",
            "You want backups, restore, and one-click migration as first-class features",
            "You're hosting your app on Vercel, Netlify, Fly, or a VPS and just need data infrastructure",
          ],
        },
      }}
      comparison={{
        eyebrow: "Side-by-side",
        title: "Railway Hobby vs Swyftstack Starter",
        columns: [
          { label: "Feature" },
          { label: "Railway Hobby" },
          { label: "Swyftstack Starter", highlight: true },
        ],
        rows: [
          { label: "Monthly price",       cells: ["", "$5 + usage", "$19 flat"] },
          { label: "Launch price (2 mo)", cells: ["", "—", "$9"] },
          { label: "Predictable bill",    cells: ["", false, true] },
          { label: "Database storage",    cells: ["", "5 GB included", "10 GB"] },
          { label: "Object storage",      cells: ["", false, "100 GB"] },
          { label: "Daily backups",       cells: ["", "Manual setup", "Automatic"] },
          { label: "One-click restore",   cells: ["", false, true] },
          { label: "Migration tool",      cells: ["", false, true] },
          { label: "App hosting",         cells: ["", true, false] },
          { label: "Static hosting",      cells: ["", "Limited", "Unlimited"] },
        ],
      }}
      faq={{
        items: [
          { q: "Can I keep Railway for my app and use Swyftstack for the database?", a: "Yes — many teams do exactly that. Different tools for different jobs. Drop your Swyftstack DATABASE_URL into Railway's env vars and you're done." },
          { q: "Is Swyftstack always cheaper than Railway?", a: "It depends on your usage. Railway can be cheaper for tiny apps; Swyftstack wins on predictability — same number every month, no usage anxiety." },
          { q: "How does the migration work?", a: "Copy your Railway Postgres connection string, paste it into Swyftstack, wait for the progress bar. Source database is untouched the whole time." },
        ],
      }}
      finalCta={{
        title: "Predictable bills, included backups.",
        subtitle: "Migrate in three clicks — free until you switch your DATABASE_URL.",
        primary: { label: "Migrate from Railway", href: "/migrate-from-railway" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
