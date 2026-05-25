// /database-for-v0 - content from MARKETING_PAGES_CONTENT.md §8.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Connect a real PostgreSQL database to your v0 app in 5 minutes. The same DATABASE_URL works in v0 preview, local dev, and Vercel production.";

export const metadata: Metadata = {
  title: "Database for v0 apps - managed PostgreSQL | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/database-for-v0` },
  openGraph: { title: "Database for v0 - Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/database-for-v0`, type: "article" },
};

export default function V0Page() {
  return (
    <MarketingTemplate
      eyebrow="For v0 apps"
      headline="Connect a real database to your v0 app"
      headlineAccent="in 5 minutes."
      subheadline="v0 generates the UI. Swyftstack adds the missing piece - a managed PostgreSQL database your app can actually save data to."
      primaryCta={{ label: "Get a database", href: "/signup" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      steps={{
        eyebrow: "Walkthrough",
        title: "Wire v0 to a real database",
        items: [
          { n: 1, title: "Create the database",     body: "Sign up. Click \"Create database\". 47 seconds. Copy the connection string." },
          { n: 2, title: "Add to v0 and Vercel",     body: "In v0 chat: \"Use process.env.DATABASE_URL for database access.\" In Vercel: Project settings → Environment Variables → add DATABASE_URL." },
          { n: 3, title: "Ask v0 to wire it up",     body: "\"Use Prisma with DATABASE_URL to add a real database to this app. Replace mock data with database queries.\" v0 generates the schema, client, and updates components." },
          { n: 4, title: "Deploy",                    body: "Push to GitHub. Vercel deploys your front end. Swyftstack hosts your database. They talk over the encrypted connection string." },
        ],
      }}
      faq={{
        items: [
          { q: "Will my v0-generated server actions work?", a: "Yes - server actions run in the Node.js runtime by default, where Prisma/Drizzle/pg work normally." },
          { q: "What about the v0 preview environment?", a: "Same DATABASE_URL works in v0 preview, your local terminal, and Vercel production. Add it in each environment." },
          { q: "Do I need a separate Vercel Postgres add-on?", a: "No. Swyftstack replaces it. We're a standard Postgres host." },
        ],
      }}
      finalCta={{
        title: "Make your v0 UI actually save data.",
        subtitle: "Launch offer: $9/mo for 2 months, then $19/mo.",
        primary: { label: "Get a database", href: "/signup" },
        secondary: { label: "Other AI tools", href: "/backend-for-vibe-coded-apps" },
      }}
    />
  );
}
