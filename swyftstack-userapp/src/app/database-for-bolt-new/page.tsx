// /database-for-bolt-new - content from MARKETING_PAGES_CONTENT.md §6.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Add a real PostgreSQL database to your Bolt.new app. Connection survives restarts, refreshes, and redeploys. 5-minute walkthrough.";

export const metadata: Metadata = {
  title: "Database for Bolt.new apps - persistent PostgreSQL | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/database-for-bolt-new` },
  openGraph: { title: "Database for Bolt.new - Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/database-for-bolt-new`, type: "article" },
};

export default function BoltPage() {
  return (
    <MarketingTemplate
      eyebrow="For Bolt.new apps"
      headline="Add a PostgreSQL database to your Bolt.new app"
      headlineAccent="in 5 minutes."
      subheadline="Bolt sandboxes wipe data between sessions. A connected Swyftstack database is permanent."
      primaryCta={{ label: "Get a database", href: "/signup" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      steps={{
        eyebrow: "Walkthrough",
        title: "Persist your Bolt app's data in four steps",
        items: [
          { n: 1, title: "Create a Swyftstack database",   body: "47 seconds. Copy the connection string." },
          { n: 2, title: "Add it to Bolt",                  body: "In the file explorer, create or open .env in the root. Add DATABASE_URL=<paste>." },
          { n: 3, title: "Tell Bolt to use it",             body: "\"Use the DATABASE_URL env to connect to a PostgreSQL database. Replace any in-memory or SQLite storage with this database. Create the tables.\"" },
          { n: 4, title: "Verify it persists",              body: "Restart the Bolt environment. Reopen. Your data should still be there." },
        ],
      }}
      bullets={{
        eyebrow: "Working with the common Bolt stacks",
        title: "Prisma, Drizzle, and the deploy step",
        items: [
          { title: "Prisma",        body: "Update schema.prisma to provider postgresql, url env(\"DATABASE_URL\"). Then npx prisma db push." },
          { title: "Drizzle",        body: "Drizzle reads process.env.DATABASE_URL. Ask Bolt to confirm the client is wired up." },
          { title: "Deploy outside Bolt", body: "Copy the same DATABASE_URL into Vercel/Netlify/anywhere. The database doesn't care where the app is hosted." },
        ],
      }}
      faq={{
        items: [
          { q: "Do I need to commit my .env to Bolt's repo?", a: "No - Bolt has a separate Secrets / Env Variables section. Use that, not committed files." },
          { q: "Will Bolt's free tier work with this?", a: "Yes. The database is external; Bolt only needs to connect to it." },
          { q: "My data still resets - why?", a: "Make sure Bolt's generated code reads from DATABASE_URL and isn't falling back to SQLite or in-memory. Tell Bolt: \"Don't fall back to local storage; require DATABASE_URL.\"" },
        ],
      }}
      finalCta={{
        title: "Make your Bolt app stop forgetting users.",
        subtitle: "Launch offer: $9/mo for 2 months, then $19/mo.",
        primary: { label: "Get a database", href: "/signup" },
        secondary: { label: "Other AI tools", href: "/backend-for-vibe-coded-apps" },
      }}
    />
  );
}
