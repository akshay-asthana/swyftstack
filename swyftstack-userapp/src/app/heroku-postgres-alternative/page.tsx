// /heroku-postgres-alternative — content from MARKETING_PAGES_CONTENT.md §18.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Heroku Postgres alternative: $19/mo Starter ($9/mo at launch) with backups, restore, and object storage — vs $50/mo Standard-0. Cheaper, faster, modern dashboard.";

export const metadata: Metadata = {
  title: "Heroku Postgres alternative — cheaper, faster | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/heroku-postgres-alternative` },
  openGraph: { title: "Swyftstack vs Heroku Postgres", description: DESCRIPTION, url: `${SITE_URL}/heroku-postgres-alternative`, type: "article" },
};

export default function HerokuPostgresAlternativePage() {
  return (
    <MarketingTemplate
      eyebrow="Heroku Postgres alternative"
      headline="A cheaper, faster Heroku Postgres alternative."
      headlineAccent=""
      subheadline="Heroku Standard-0 is $50/mo. Swyftstack Starter is $19 (or $9 during launch) — with backups, restore, and object storage."
      primaryCta={{ label: "Migrate from Heroku", href: "/migrate-from-heroku" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={{
        left: {
          title: "Why people leave Heroku Postgres",
          items: [
            "Standard-0 is $50/mo even for tiny apps",
            "The free Hobby tier is gone; Mini at $5/mo is too restrictive for real work",
            "The dashboard hasn't been seriously updated in years",
            "Tooling around it feels frozen in 2015",
          ],
        },
        right: {
          title: "What Swyftstack ships in 2026",
          items: [
            "Modern, instant dashboard",
            "Daily encrypted backups with one-click restore — included",
            "Object storage on every plan (Heroku has none)",
            "Three-click migration from your current Heroku database",
            "Flat $19/mo with $9 launch pricing for two months",
          ],
        },
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
          { label: "Launch price (2 mo)", cells: ["", "—", "$9"] },
          { label: "Database storage",    cells: ["", "64 GB", "10 GB *"] },
          { label: "Daily backups",       cells: ["", true, true] },
          { label: "One-click restore",   cells: ["", "Manual", "One click"] },
          { label: "Object storage",      cells: ["", false, "100 GB"] },
          { label: "Modern dashboard",    cells: ["", false, true] },
          { label: "Annual discount",     cells: ["", false, "21% off"] },
        ],
        subtitle: "* Need more than 10 GB? Growth at $49/mo (then $99) gets 100 GB — still cheaper than Heroku's higher tiers.",
      }}
      faq={{
        items: [
          { q: "Can I migrate without downtime?", a: "Effectively — yes. Your Heroku database stays untouched until you swap DATABASE_URL on your app. The actual app downtime is the few seconds it takes to restart with the new env var." },
          { q: "Does pg_dump from Heroku work?", a: "Yes. We use standard PostgreSQL tooling internally. Whatever Heroku gave you, we can restore." },
          { q: "What about Heroku Connect or other add-ons?", a: "We only migrate the database. Other add-ons stay on Heroku, or you replace them — talk to us if you want help mapping options." },
        ],
      }}
      finalCta={{
        title: "Cut your bill by more than half.",
        subtitle: "Real PostgreSQL. Standard tooling. A modern dashboard. Same data.",
        primary: { label: "Migrate from Heroku", href: "/migrate-from-heroku" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
