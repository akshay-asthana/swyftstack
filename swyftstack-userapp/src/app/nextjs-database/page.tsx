// /nextjs-database - solution page targeting "nextjs database", "nextjs
// postgres", "postgresql for nextjs". Content from
// MARKETING_PAGES_CONTENT.md §20 (Page 20).
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";
import { SHARED_DB_FAQ, WHY_SWYFTSTACK_BULLETS, competitorWhenList, complementWith } from "@/lib/solutions-content";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Managed PostgreSQL for Next.js, ready in seconds. Prisma, Drizzle, raw pg - drop in a DATABASE_URL and you're done. S3-compatible storage for uploads included.";

export const metadata: Metadata = {
  title: "PostgreSQL database for Next.js - ready in seconds | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/nextjs-database` },
  openGraph: { title: "Next.js database - Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/nextjs-database`, type: "article" },
};

export default function NextjsDatabasePage() {
  return (
    <MarketingTemplate
      eyebrow="Next.js + Swyftstack"
      headline="PostgreSQL for your Next.js app,"
      headlineAccent="ready in minutes."
      subheadline="Managed PostgreSQL and S3 storage, wired into your Next.js app in less time than npm install."
      primaryCta={{ label: "Deploy a database", href: "/signup" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      complement={complementWith({
        partner: "Vercel",
        partnerCovers: "your frontend + edge",
        partnerBody: "Vercel serves your Next.js pages, runs your server actions and route handlers, and ships your static assets to the edge. It's where your app code lives.",
      })}
      whenLists={competitorWhenList({
        competitor: "Vercel Postgres / Supabase",
        whenCompetitor: [
          "You're 100% on Vercel and want the database in the same dashboard.",
          "You want a full BaaS (auth + edge functions + realtime) and you're happy with the trade-offs.",
          "You're optimising for the integrated developer experience over invoice clarity.",
        ],
        whenSwyftstack: [
          "You want real Postgres - not a fork, not a proxy - that any client speaks normally.",
          "You'd rather pick your own auth (NextAuth, Clerk, Auth0) and keep the database neutral.",
          "You want predictable monthly pricing instead of usage-meter surprises at the end of the month.",
          "You also want S3-compatible storage on the same bill, not as a separate vendor.",
        ],
      })}
      steps={{
        eyebrow: "Setup",
        title: "Three steps. The Vercel deploy is the slowest part.",
        items: [
          { n: 1, title: "Deploy a Swyftstack database",  body: "One click, 47 seconds. Copy the connection string." },
          { n: 2, title: "Add to .env.local",              body: 'DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"' },
          { n: 3, title: "Pick your data layer",           body: "Prisma, Drizzle, or raw pg - your conventions, no special drivers." },
          { n: 4, title: "Deploy",                          body: "Set DATABASE_URL in Vercel/Netlify project env vars. Push. Done." },
        ],
      }}
      snippets={{
        eyebrow: "Code",
        title: "Three ways to wire it up",
        subtitle: "Same database, your choice of client.",
        snippets: [
          { name: "Prisma", language: "prisma", code: `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}` },
          { name: "Drizzle", language: "ts", code: `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);` },
          { name: "Raw pg", language: "ts", code: `import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});` },
          { name: "S3 uploads", language: "ts", code: `import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: "https://storage.swyftstack.com",
  region: "auto",
  credentials: {
    accessKeyId: process.env.SWYFTSTACK_ACCESS_KEY!,
    secretAccessKey: process.env.SWYFTSTACK_SECRET_KEY!,
  },
});

await s3.send(new PutObjectCommand({
  Bucket: "my-uploads",
  Key: "user/avatar.png",
  Body: buffer,
}));` },
        ],
      }}
      bullets={{
        eyebrow: "Why Next.js teams choose us",
        title: "What you get on day one",
        subtitle: "Every Swyftstack plan ships with the database, storage, backups, and observability you'd otherwise stitch together.",
        items: WHY_SWYFTSTACK_BULLETS,
      }}
      faq={{
        items: [
          { q: "Does it work with App Router and Pages Router?", a: "Both. The database client doesn't care about your router; whatever framework you choose for queries works the same in either." },
          { q: "Where should I run my queries - server components, route handlers, server actions?", a: "Any of them. Server components and server actions both run in the Node.js runtime by default, where pg/Prisma/Drizzle work natively." },
          { q: "What about edge runtime?", a: "Use a serverless-friendly driver like @neondatabase/serverless or pg over HTTP. We're a standard Postgres host; whatever the driver supports, we support." },
          { q: "Does it work with NextAuth, Clerk, Auth0?", a: "Yes. We don't ship auth - bring whatever you like. NextAuth's Postgres adapter, Clerk's webhooks, Auth0's user sync - all work normally." },
          ...SHARED_DB_FAQ,
        ],
      }}
      finalCta={{
        title: "Ship the Next.js app you've been prototyping.",
        subtitle: "Launch offer: Starter at $9/mo for 2 months, then $19/mo.",
        primary: { label: "Deploy a database", href: "/signup" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
