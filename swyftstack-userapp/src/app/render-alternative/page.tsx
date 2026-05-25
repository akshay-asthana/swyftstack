// /render-alternative - content from MARKETING_PAGES_CONTENT.md §19.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Render alternative for your database: PostgreSQL deployed in seconds, daily backups, one-click restore, and object storage included.";

export const metadata: Metadata = {
  title: "Render alternative - faster database deploys | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/render-alternative` },
  openGraph: { title: "Swyftstack vs Render", description: DESCRIPTION, url: `${SITE_URL}/render-alternative`, type: "article" },
};

export default function RenderAlternativePage() {
  return (
    <MarketingTemplate
      eyebrow="Render alternative"
      headline="Looking for a Render alternative"
      headlineAccent="for your database?"
      subheadline="Render is a broad PaaS. Swyftstack is the faster, more focused choice when the production database and storage layer are what you need to upgrade."
      primaryCta={{ label: "Start with Swyftstack", href: "/signup" }}
      secondaryCta={{ label: "Start a migration", href: "/migrate" }}
      whenLists={{
        left: {
          title: "Where Render can be more than you need",
          items: [
            "You want web services, workers, cron, static sites, and databases inside one broad PaaS",
            "You are moving off Heroku and want a similar all-in-one platform model",
            "You need private networking between Render-hosted services more than a dedicated database workflow",
          ],
        },
        right: {
          title: "Why teams choose Swyftstack",
          items: [
            "PostgreSQL deployed in seconds with the connection string ready to paste",
            "Backups, restore, migration, object storage, and usage controls built into the core workflow",
            "A faster, cleaner dashboard for the data layer instead of a full PaaS console",
            "Works with Render app hosting, Vercel, Netlify, Fly, or any app runtime you already prefer",
          ],
        },
      }}
      comparison={{
        eyebrow: "Why Swyftstack wins",
        title: "Render Starter PG vs Swyftstack Starter",
        columns: [
          { label: "Feature" },
          { label: "Render Starter PG" },
          { label: "Swyftstack Starter", highlight: true },
        ],
        rows: [
          { label: "Monthly price",          cells: ["", "$7 limited database", "$19 production data platform"] },
          { label: "Launch price (2 mo)",    cells: ["", "-", "$9"] },
          { label: "Storage",                cells: ["", "1 GB", "10 GB"] },
          { label: "Backups",                cells: ["", "Daily, 7 days", "Daily, 7 days with restore workflow"] },
          { label: "One-click restore",      cells: ["", "Manual", "One click"] },
          { label: "One-click migration in", cells: ["", false, true] },
          { label: "Deploy time",            cells: ["", "Several minutes", "Under a minute"] },
          { label: "Object storage",         cells: ["", false, "100 GB included"] },
        ],
      }}
      faq={{
        items: [
          { q: "Can I host my app on Render and use Swyftstack for the database?", a: "Yes - that's a strong pattern. Keep Render for app hosting if you like it, then put production data on Swyftstack for faster database operations." },
          { q: "Is migrating from Render easy?", a: "Paste your Render Postgres connection string into Swyftstack's migration tool. Three clicks, source database untouched, verified with checksums." },
        ],
      }}
      finalCta={{
        title: "Upgrade the data layer without moving the whole app.",
        primary: { label: "Try Swyftstack", href: "/signup" },
        secondary: { label: "Start a migration", href: "/migrate" },
      }}
    />
  );
}
