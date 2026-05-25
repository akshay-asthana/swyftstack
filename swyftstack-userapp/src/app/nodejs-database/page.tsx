// /nodejs-database - content from MARKETING_PAGES_CONTENT.md §23.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Managed PostgreSQL for Node.js: Express, Fastify, Hono, Nest. pg, Prisma, Drizzle - all work without changes. S3-compatible storage for uploads included.";

export const metadata: Metadata = {
  title: "PostgreSQL for Node.js - Express, Fastify, Hono, Nest | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/nodejs-database` },
  openGraph: { title: "Node.js database - Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/nodejs-database`, type: "article" },
};

export default function NodejsDatabasePage() {
  return (
    <MarketingTemplate
      eyebrow="Node.js + Swyftstack"
      headline="PostgreSQL for Node.js,"
      headlineAccent="ready in minutes."
      subheadline="Express, Fastify, Hono, Nest. pg, Prisma, Drizzle - all work as-is."
      primaryCta={{ label: "Deploy a database", href: "/signup" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      snippets={{
        eyebrow: "Setup",
        title: "Your favourite client - same connection string",
        snippets: [
          { name: "pg", language: "ts", code: `import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

const { rows } = await pool.query("SELECT now()");` },
          { name: "Prisma", language: "ts", code: `import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();

// schema.prisma
// datasource db {
//   provider = "postgresql"
//   url      = env("DATABASE_URL")
// }` },
          { name: "Drizzle", language: "ts", code: `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);` },
          { name: "Express + multer + S3", language: "ts", code: `import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: "https://storage.swyftstack.com",
  region: "auto",
  credentials: {
    accessKeyId: process.env.SWYFTSTACK_ACCESS_KEY!,
    secretAccessKey: process.env.SWYFTSTACK_SECRET_KEY!,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload", upload.single("file"), async (req, res) => {
  await s3.send(new PutObjectCommand({
    Bucket: "my-uploads",
    Key: req.file.originalname,
    Body: req.file.buffer,
  }));
  res.json({ ok: true });
});` },
        ],
      }}
      faq={{
        items: [
          { q: "Does pgbouncer / connection pooling matter?", a: "Yes for serverless. Swyftstack ships PgBouncer in front of every database; toggle session or transaction mode in the dashboard." },
          { q: "Can I use it from Bun or Deno?", a: "Yes. They both speak the Postgres wire protocol via standard libraries (postgres, deno-postgres)." },
          { q: "What about edge runtimes (Cloudflare Workers, Vercel Edge)?", a: "Use an HTTP-based driver (e.g. @neondatabase/serverless) or a pg-over-HTTP proxy. Native TCP isn't available in those runtimes." },
        ],
      }}
      finalCta={{
        title: "Deploy a database for your Node app.",
        subtitle: "Launch offer: Starter at $9/mo for 2 months, then $19/mo.",
        primary: { label: "Deploy a database", href: "/signup" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
