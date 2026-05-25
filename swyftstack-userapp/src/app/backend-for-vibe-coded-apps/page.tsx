// /backend-for-vibe-coded-apps — content from MARKETING_PAGES_CONTENT.md §4.
// Friendlier copy than the dev-focused pages; targets vibe coders who built
// their first app with an AI tool.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Built an app with Lovable, Bolt, Cursor, or v0? Add a real PostgreSQL database and S3-compatible storage in a few clicks. Walkthrough, no jargon.";

export const metadata: Metadata = {
  title: "Backend for AI-built apps — Lovable, Bolt, Cursor, v0 | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/backend-for-vibe-coded-apps` },
  openGraph: { title: "Backend for AI-built apps — Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/backend-for-vibe-coded-apps`, type: "article" },
};

export default function VibeCodedPage() {
  return (
    <MarketingTemplate
      eyebrow="For AI-built apps"
      headline="You built an app."
      headlineAccent="Here's what makes it real."
      subheadline="Lovable, Bolt, Cursor, v0 — your AI tool built it. Now connect a real database and storage."
      primaryCta={{ label: "Deploy my first backend", href: "/signup" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={{
        left: {
          title: "What \"backend\" actually means",
          items: [
            "Database — where user accounts and content live so they don't disappear when the tab closes",
            "Storage — where uploaded files (photos, PDFs) live so they're accessible later",
            "Connection string — one line of text you paste into your AI tool to wire them up",
          ],
        },
        right: {
          title: "Why Swyftstack works for vibe coders",
          items: [
            "One dashboard, one bill, two products — nothing else to learn",
            "A connection string you can copy in 47 seconds",
            "Daily backups so a mistaken delete isn't fatal",
            "A real human who answers your emails when you get stuck",
          ],
        },
      }}
      steps={{
        eyebrow: "Step by step",
        title: "Connect a real backend in five minutes",
        items: [
          { n: 1, title: "Sign up at swyftstack.com", body: "30 seconds. No credit card to try the dashboard." },
          { n: 2, title: "Click \"Create database\"", body: "Wait ~47 seconds for it to provision." },
          { n: 3, title: "Copy your connection string", body: "It looks like postgresql://user:pass@host:5432/db." },
          { n: 4, title: "Paste into your AI tool's env vars", body: "Find the Environment Variables / Secrets section. Add DATABASE_URL." },
          { n: 5, title: "Tell your AI to use it", body: "\"Use DATABASE_URL to save user accounts. Create the tables you need.\"" },
          { n: 6, title: "Test by signing up as a user", body: "Close the tab, reopen, log in. If your account is still there, you're done." },
        ],
      }}
      bullets={{
        eyebrow: "Tool-specific guides",
        title: "Each AI builder has a step-by-step walkthrough",
        items: [
          { title: "Lovable",  body: "Where the Environment Variables menu lives, what to prompt." },
          { title: "Bolt.new", body: "How to add a .env file and tell Bolt to use it." },
          { title: "Cursor",   body: "Adding .env.local, telling Cursor about Prisma / Drizzle." },
          { title: "v0",       body: "Wiring DATABASE_URL into Vercel env vars after deploy." },
        ],
      }}
      faq={{
        items: [
          { q: "Do I need to know how to code?", a: "You need to know how to copy and paste. Your AI tool does the rest." },
          { q: "What if my app outgrows the Starter plan?", a: "Click upgrade. Same database, same connection string, more headroom." },
          { q: "Is my data safe?", a: "SSL on by default. Encrypted backups. Two-factor authentication on your account. Same security as the big players." },
          { q: "Can I move to a different provider later?", a: "Yes. PostgreSQL is the standard — you can move anytime, ever, with no lock-in. We'll help you export." },
        ],
      }}
      finalCta={{
        title: "You built it. Now ship it.",
        subtitle: "Launch offer: Starter at $9/mo for 2 months, then $19/mo. Includes a database, storage, and a custom domain.",
        primary: { label: "Deploy my first backend", href: "/signup" },
        secondary: { label: "See tool-specific guides", href: "/database-for-lovable" },
      }}
    />
  );
}
