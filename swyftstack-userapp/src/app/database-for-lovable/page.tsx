// /database-for-lovable - content from MARKETING_PAGES_CONTENT.md §5.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Add a real PostgreSQL database to your Lovable app in 5 minutes. Step-by-step walkthrough with the exact menus to click and prompts to type.";

export const metadata: Metadata = {
  title: "Database for Lovable apps - 5-minute setup | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/database-for-lovable` },
  openGraph: { title: "Database for Lovable - Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/database-for-lovable`, type: "article" },
};

export default function LovablePage() {
  return (
    <MarketingTemplate
      eyebrow="For Lovable apps"
      headline="Add a real database to your Lovable app"
      headlineAccent="in 5 minutes."
      subheadline="Lovable builds the app. Swyftstack gives it a real PostgreSQL backend that remembers users between visits."
      primaryCta={{ label: "Get a database", href: "/signup" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      steps={{
        eyebrow: "Walkthrough",
        title: "Four steps. Lovable does most of the work.",
        items: [
          { n: 1, title: "Create a Swyftstack account",   body: "30 seconds. Click \"Create database\". Wait ~47 seconds. Copy the connection string." },
          { n: 2, title: "Open your Lovable project",     body: "Click Settings (gear icon) → Environment Variables / Secrets. Add DATABASE_URL." },
          { n: 3, title: "Tell Lovable to use it",         body: "\"Connect to the database using DATABASE_URL. Create tables for users and [whatever your app stores]. Save data to the database instead of in-memory storage.\"" },
          { n: 4, title: "Test it",                        body: "Sign up as a user in your own app. Close the tab. Reopen. Log back in. If your account is still there, you're done." },
        ],
      }}
      bullets={{
        eyebrow: "Common patterns",
        title: "Patterns Lovable apps reach for",
        items: [
          { title: "User accounts",     body: "\"Add email/password auth and store users in the database.\" Lovable scaffolds it." },
          { title: "File uploads",      body: "\"Use the connected S3 storage to handle uploads. Save URLs in the database.\"" },
          { title: "Real-time-ish",     body: "Either PostgreSQL LISTEN/NOTIFY, or poll every few seconds. Lovable can wire either." },
        ],
      }}
      faq={{
        items: [
          { q: "What if Lovable says my code has errors after connecting?", a: "Ask Lovable to fix them: \"There are errors after connecting the database. Please fix them and make sure the code runs.\" It usually resolves in one or two iterations." },
          { q: "My data isn't saving - what now?", a: "Ask Lovable: \"Add console logs to confirm data is being saved to the database. Also confirm the table exists.\" Then watch the logs." },
          { q: "Can I move my Lovable app to Vercel later?", a: "Yes. The same DATABASE_URL works wherever Lovable lets you deploy. We're a standard Postgres host." },
        ],
      }}
      finalCta={{
        title: "Make your Lovable app remember things.",
        subtitle: "Launch offer: $9/mo for 2 months, then $19/mo. Includes a database, file storage, and a custom domain.",
        primary: { label: "Get a database", href: "/signup" },
        secondary: { label: "Other AI tools", href: "/backend-for-vibe-coded-apps" },
      }}
    />
  );
}
