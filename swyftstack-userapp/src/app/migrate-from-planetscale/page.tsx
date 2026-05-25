// /migrate-from-planetscale - content from MARKETING_PAGES_CONTENT.md §15.
// Includes the honest MySQL → PostgreSQL caveat.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Migrate from PlanetScale to Swyftstack. Honest disclosure: PlanetScale is MySQL, Swyftstack is PostgreSQL - most ORM-based apps move cleanly; some apps need schema work.";

export const metadata: Metadata = {
  title: "Migrate from PlanetScale to Swyftstack | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/migrate-from-planetscale` },
  openGraph: { title: "Migrate from PlanetScale - Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/migrate-from-planetscale`, type: "article" },
};

export default function FromPlanetScalePage() {
  return (
    <MarketingTemplate
      eyebrow="From PlanetScale"
      headline="Migrate from PlanetScale to Swyftstack."
      headlineAccent=""
      subheadline="One caveat up front: PlanetScale is MySQL, Swyftstack is PostgreSQL. We tell you when it's clean and when it's not."
      primaryCta={{ label: "Talk to us about migration", href: "/about" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={{
        left: {
          title: "This is usually painless if…",
          items: [
            "Your app uses an ORM (Prisma, Drizzle, TypeORM, Sequelize, Knex)",
            "Your schema uses standard SQL types",
            "You don't depend on MySQL-specific syntax",
          ],
        },
        right: {
          title: "This requires more work if…",
          items: [
            "You have stored procedures or triggers written for MySQL",
            "You use MySQL-specific functions in queries",
            "You depend on PlanetScale's branching workflow extensively",
          ],
        },
      }}
      steps={{
        eyebrow: "How",
        title: "How a PlanetScale → Swyftstack migration works",
        items: [
          { n: 1, title: "Export PlanetScale schema and data",  body: "Via PlanetScale's tools, or our migration helper." },
          { n: 2, title: "We convert MySQL types to PostgreSQL", body: "Most types map directly. We flag anything that doesn't and ask you to confirm." },
          { n: 3, title: "We restore onto Swyftstack PostgreSQL", body: "Tables, indexes, sequences - verified end-to-end." },
          { n: 4, title: "You update your app",                   body: "Change the database driver, swap provider = \"mysql\" for \"postgresql\" if you're on Prisma, regenerate, redeploy." },
        ],
      }}
      faq={{
        items: [
          { q: "Why no MySQL on Swyftstack?", a: "V1 is PostgreSQL-only. PostgreSQL has stronger transactional guarantees and richer extensions for the workloads we care about most." },
          { q: "Will my Prisma schema convert cleanly?", a: "Usually yes. Booleans, enums, indexes, foreign keys all translate. We'll flag types that don't have a one-to-one PostgreSQL equivalent." },
          { q: "Should I rewrite my queries?", a: "Most ORM queries don't change. Raw SQL using MySQL-specific syntax (e.g. backtick identifiers, MySQL string functions) needs minor edits." },
        ],
      }}
      finalCta={{
        title: "Switch from MySQL to PostgreSQL - with eyes open.",
        subtitle: "Talk to us before you start. We'll tell you honestly if your app is a one-day migration or a one-week one.",
        primary: { label: "Talk to us", href: "/about" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
