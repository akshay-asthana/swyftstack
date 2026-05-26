// /migrate-from-heroku - content from MARKETING_PAGES_CONTENT.md §14.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Migrate from Heroku Postgres to Swyftstack in three clicks. Starter is $19/mo. Same SQL, same tooling, modern dashboard.";

export const metadata: Metadata = {
  title: "Migrate from Heroku Postgres to Swyftstack | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/migrate-from-heroku` },
  openGraph: { title: "Migrate from Heroku Postgres - Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/migrate-from-heroku`, type: "article" },
};

export default function FromHerokuPage() {
  return (
    <MarketingTemplate
      eyebrow="From Heroku Postgres"
      headline="Migrate from Heroku Postgres to Swyftstack"
      headlineAccent="in three clicks."
      subheadline="Move from Heroku Standard-0 to Swyftstack Starter at $19/mo. Same Postgres, same tooling, modern dashboard."
      primaryCta={{ label: "Start migration", href: "/signup" }}
      secondaryCta={{ label: "Compare to Heroku", href: "/heroku-postgres-alternative" }}
      steps={{
        eyebrow: "How",
        title: "Four steps with the Heroku CLI",
        items: [
          { n: 1, title: "Get your Heroku connection string", body: "heroku config -a your-app-name → copy DATABASE_URL." },
          { n: 2, title: "Paste into Swyftstack",              body: "Dashboard → Migrate → \"From Heroku\". Paste, click Start." },
          { n: 3, title: "Wait for the progress bar",          body: "Most Heroku databases (under 5 GB) take 2-5 minutes." },
          { n: 4, title: "Update DATABASE_URL",                body: "Set DATABASE_URL to the new connection string during your normal release window." },
        ],
      }}
      comparison={{
        eyebrow: "Side-by-side",
        title: "Heroku Standard-0 vs Swyftstack Starter",
        columns: [
          { label: "Feature" },
          { label: "Heroku Standard-0" },
          { label: "Swyftstack Starter", highlight: true },
        ],
        rows: [
          { label: "Monthly price",       cells: ["", "$50", "$19"] },
          { label: "Daily backups",       cells: ["", true, true] },
          { label: "One-click restore",   cells: ["", "Manual", "One click"] },
          { label: "Modern dashboard",    cells: ["", false, true] },
          { label: "Object storage",      cells: ["", false, "100 GB"] },
        ],
      }}
      faq={{
        items: [
          { q: "Does pg_dump-shaped data restore cleanly?", a: "Yes. We use the same pg_dump / pg_restore internally, so anything Heroku could dump, we can restore." },
          { q: "What about Heroku Connect or other add-ons?", a: "We only migrate the database. Other Heroku add-ons stay on Heroku, or you replace them - happy to advise." },
          { q: "Can I do a dry run?", a: "Yes. Migration is free until you switch DATABASE_URL. Run it, inspect the result, walk away if anything looks off." },
        ],
      }}
      finalCta={{
        title: "Cut your bill by more than half.",
        primary: { label: "Start migration", href: "/signup" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
