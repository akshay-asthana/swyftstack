// /railway-alternative - content from MARKETING_PAGES_CONTENT.md §17.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Railway alternative for production data: flat monthly billing, included daily backups, one-click migration, object storage, and a focused Swyftstack dashboard.";

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
      headline="Looking for a Railway alternative?"
      headlineAccent="Choose predictable data infrastructure."
      subheadline="Railway is a broad app platform. Swyftstack is purpose-built for the database and storage layer teams need to run in production."
      primaryCta={{ label: "Migrate from Railway", href: "/migrate-from-railway" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={{
        left: {
          title: "Where Railway can get noisy",
          items: [
            "Your database, app hosting, workers, cron, and deploy config all live in one broad product surface",
            "Database operations share attention with app deploys and usage-based infrastructure decisions",
            "Your monthly spend can move with runtime, service, and traffic changes",
            "You want one config for your entire stack, even if the database is the only part you need to improve",
          ],
        },
        right: {
          title: "Why teams choose Swyftstack",
          items: [
            "Focused managed PostgreSQL and S3-compatible storage for teams already happy with their app host",
            "Flat monthly plans instead of database spend tied to a usage meter",
            "Backups, restore, migration, usage alerts, and team controls as first-class workflows",
            "Works cleanly with Vercel, Netlify, Fly, a VPS, or Railway app hosting if you want to keep it",
          ],
        },
      }}
      comparison={{
        eyebrow: "Why Swyftstack wins",
        title: "Railway Hobby vs Swyftstack Starter",
        columns: [
          { label: "Feature" },
          { label: "Railway Hobby" },
          { label: "Swyftstack Starter", highlight: true },
        ],
        rows: [
          { label: "Monthly price",       cells: ["", "$5 base + usage", "$19 flat"] },
          { label: "Launch price (2 mo)", cells: ["", "-", "$9"] },
          { label: "Predictable bill",    cells: ["", false, true] },
          { label: "Database storage",    cells: ["", "5 GB included", "10 GB"] },
          { label: "Object storage",      cells: ["", false, "100 GB"] },
          { label: "Daily backups",       cells: ["", "Manual setup", "Automatic"] },
          { label: "One-click restore",   cells: ["", false, true] },
          { label: "Migration tool",      cells: ["", false, true] },
          { label: "Platform focus",      cells: ["", "Full app platform", "Dedicated data platform"] },
          { label: "App hosting",         cells: ["", true, "Use your preferred host"] },
          { label: "Static hosting",      cells: ["", "Limited", "Unlimited"] },
        ],
      }}
      faq={{
        items: [
          { q: "Can I keep Railway for my app and use Swyftstack for the database?", a: "Yes - many teams do exactly that. Keep Railway where it works for app hosting, then put production data on Swyftstack for a calmer database workflow." },
          { q: "How does Swyftstack make database spend easier to forecast?", a: "Starter is a flat $19/month with database storage, object storage, backups, restore, and 500 GB egress included. You know the database number before the month starts." },
          { q: "How does the migration work?", a: "Copy your Railway Postgres connection string, paste it into Swyftstack, wait for the progress bar. Source database is untouched the whole time." },
        ],
      }}
      finalCta={{
        title: "Make the database bill predictable.",
        subtitle: "Migrate in three clicks - free until you switch your DATABASE_URL.",
        primary: { label: "Migrate from Railway", href: "/migrate-from-railway" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
