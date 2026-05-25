// /heroku-postgres-alternative - content from MARKETING_PAGES_CONTENT.md §18.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Heroku Postgres alternative: $19/mo Starter ($9/mo at launch) with backups, restore, object storage, fast provisioning, and a modern Swyftstack dashboard.";

export const metadata: Metadata = {
  title: "Heroku Postgres alternative - cheaper, faster | Swyftstack",
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
      subheadline="Heroku Standard-0 is $50/mo. Swyftstack Starter is $19, or $9 during launch, with backups, restore, object storage, and a dashboard built for modern teams."
      primaryCta={{ label: "Migrate from Heroku", href: "/migrate-from-heroku" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={{
        left: {
          title: "Where Heroku Postgres feels expensive",
          items: [
            "Standard-0 starts at $50/mo even when most apps only need a fraction of that capacity",
            "Mini is inexpensive, but too restrictive for serious production work",
            "Database operations still feel tied to an older platform workflow",
            "Teams often need extra services for storage, usage visibility, and modern migration flow",
          ],
        },
        right: {
          title: "Why teams choose Swyftstack",
          items: [
            "Modern dashboard with database, storage, backup, usage, and team controls in one place",
            "Daily encrypted backups with one-click restore included",
            "100 GB object storage on Starter, without bolting on another provider",
            "Three-click migration from your current Heroku database with the source left untouched",
            "Flat $19/mo Starter with $9 launch pricing for two months",
          ],
        },
      }}
      comparison={{
        eyebrow: "Why Swyftstack wins",
        title: "Heroku Standard-0 vs Swyftstack Starter",
        columns: [
          { label: "Feature" },
          { label: "Heroku Standard-0" },
          { label: "Swyftstack Starter", highlight: true },
        ],
        rows: [
          { label: "Monthly price",       cells: ["", "$50", "$19"] },
          { label: "Launch price (2 mo)", cells: ["", "-", "$9"] },
          { label: "Right-sized starter storage", cells: ["", "64 GB minimum tier", "10 GB included, Growth supports 100 GB"] },
          { label: "Daily backups",       cells: ["", true, true] },
          { label: "One-click restore",   cells: ["", "Manual", "One click"] },
          { label: "Object storage",      cells: ["", false, "100 GB"] },
          { label: "Modern dashboard",    cells: ["", false, true] },
          { label: "Annual discount",     cells: ["", false, "21% off"] },
        ],
        subtitle: "* Need more than 10 GB? Growth at $49/mo during launch, then $99, includes 100 GB and still keeps the modern Swyftstack workflow.",
      }}
      faq={{
        items: [
          { q: "Can I migrate without downtime?", a: "Yes for the database move. Your Heroku database stays untouched until you swap DATABASE_URL on your app. The only app interruption is the restart after the env var change." },
          { q: "Does pg_dump from Heroku work?", a: "Yes. We use standard PostgreSQL tooling internally. Whatever Heroku gave you, we can restore." },
          { q: "What about Heroku Connect or other add-ons?", a: "Swyftstack focuses on the database and storage layer. Keep Heroku add-ons where needed, or replace them with best-in-class tools while Swyftstack runs your production data." },
        ],
      }}
      finalCta={{
        title: "Cut the Heroku database bill and modernize the workflow.",
        subtitle: "Real PostgreSQL. Standard tooling. A modern dashboard. Same data.",
        primary: { label: "Migrate from Heroku", href: "/migrate-from-heroku" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
