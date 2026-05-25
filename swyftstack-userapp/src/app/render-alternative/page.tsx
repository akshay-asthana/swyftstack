// /render-alternative — content from MARKETING_PAGES_CONTENT.md §19.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Render alternative for your database: PostgreSQL deployed in seconds, daily backups, one-click restore, and object storage included.";

export const metadata: Metadata = {
  title: "Render alternative — faster database deploys | Swyftstack",
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
      subheadline="Render is a solid PaaS. If you only need the database — faster, cheaper, with one-click migration in — we're the fit."
      primaryCta={{ label: "Start with Swyftstack", href: "/signup" }}
      secondaryCta={{ label: "Start a migration", href: "/migrate" }}
      whenLists={{
        left: {
          title: "When Render is the right choice",
          items: [
            "You want a full PaaS (web services, workers, cron, static sites, databases) from one provider",
            "You're moving off Heroku and want a similar mental model",
            "You need private networking between services",
          ],
        },
        right: {
          title: "When Swyftstack is the right choice",
          items: [
            "You want PostgreSQL deployed in seconds, not minutes",
            "You want backups and restore as first-class features, not extras",
            "You want a faster, friendlier dashboard",
            "You're happy hosting your app elsewhere",
          ],
        },
      }}
      comparison={{
        eyebrow: "Side-by-side",
        title: "Render Starter PG vs Swyftstack Starter",
        columns: [
          { label: "Feature" },
          { label: "Render Starter PG" },
          { label: "Swyftstack Starter", highlight: true },
        ],
        rows: [
          { label: "Monthly price",          cells: ["", "$7 (limited)", "$19"] },
          { label: "Launch price (2 mo)",    cells: ["", "—", "$9"] },
          { label: "Storage",                cells: ["", "1 GB", "10 GB"] },
          { label: "Backups",                cells: ["", "Daily, 7 days", "Daily, 7 days"] },
          { label: "One-click restore",      cells: ["", "Manual", "One click"] },
          { label: "One-click migration in", cells: ["", false, true] },
          { label: "Deploy time",            cells: ["", "Several minutes", "Under a minute"] },
          { label: "Object storage",         cells: ["", false, "100 GB"] },
        ],
      }}
      faq={{
        items: [
          { q: "Can I host my app on Render and use Swyftstack for the database?", a: "Yes — that's a common pattern. Add Swyftstack's DATABASE_URL to your Render env vars and you're done." },
          { q: "Is migrating from Render easy?", a: "Paste your Render Postgres connection string into Swyftstack's migration tool. Three clicks, source database untouched, verified with checksums." },
        ],
      }}
      finalCta={{
        title: "Faster deploys. Included backups. Modern dashboard.",
        primary: { label: "Try Swyftstack", href: "/signup" },
        secondary: { label: "Start a migration", href: "/migrate" },
      }}
    />
  );
}
