// /database-for-cursor — content from MARKETING_PAGES_CONTENT.md §7.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Managed PostgreSQL for your Cursor projects. One copyable connection string — no AWS console, no setup, no yak shaving.";

export const metadata: Metadata = {
  title: "Database for Cursor projects — PostgreSQL in seconds | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/database-for-cursor` },
  openGraph: { title: "Database for Cursor — Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/database-for-cursor`, type: "article" },
};

export default function CursorPage() {
  return (
    <MarketingTemplate
      eyebrow="For Cursor projects"
      headline="PostgreSQL for your Cursor projects,"
      headlineAccent="ready in seconds."
      subheadline="A copyable connection string. No AWS console, no setup, no yak shaving."
      primaryCta={{ label: "Deploy a database", href: "/signup" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      snippets={{
        eyebrow: "Setup",
        title: "Three lines and you're shipping",
        snippets: [
          { name: ".env.local", language: "sh", code: `DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"` },
          { name: "Ask Cursor", language: "ts", code: `// Prompt Cursor:
// "Set up Prisma to use DATABASE_URL. Create models for [your domain]
//  and run the initial migration."` },
          { name: "Verify", language: "sh", code: `psql $DATABASE_URL -c "SELECT version();"` },
        ],
      }}
      bullets={{
        eyebrow: "What Cursor users typically build",
        title: "Common Cursor + Swyftstack projects",
        items: [
          { title: "SaaS prototypes",   body: "Next.js + PostgreSQL + S3 storage, fully working before you commit to a stack." },
          { title: "Internal tools",    body: "Quick admin dashboards backed by a real database." },
          { title: "Side projects",     body: "The ones that might be a business one day — they deserve a real backend." },
        ],
      }}
      faq={{
        items: [
          { q: "Can I open prisma studio against my Swyftstack database?", a: "Yes. We're a standard Postgres host; prisma studio connects normally." },
          { q: "What about staging vs production?", a: "Spin up a second database. Same plan covers up to 3 databases on Starter — separate environments without separate accounts." },
          { q: "Can I run psql in Cursor's terminal?", a: "Yes. Standard psql works against our connection string." },
        ],
      }}
      finalCta={{
        title: "Deploy a database for your Cursor project.",
        subtitle: "Launch offer: Starter at $9/mo for 2 months, then $19/mo. Includes 3 databases for dev / staging / prod.",
        primary: { label: "Deploy a database", href: "/signup" },
        secondary: { label: "See platform", href: "/platform" },
      }}
    />
  );
}
