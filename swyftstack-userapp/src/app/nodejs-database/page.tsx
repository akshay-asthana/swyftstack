// /nodejs-database - content from MARKETING_PAGES_CONTENT.md §23.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";
import { SHARED_DB_FAQ, WHY_SWYFTSTACK_BULLETS, competitorWhenList } from "@/lib/solutions-content";

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
      subheadline="Express, Fastify, Hono, Nest. pg, Prisma, and Drizzle all work as-is."
      primaryCta={{ label: "Deploy a database", href: "/signup" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      whenLists={competitorWhenList({
        competitor: "Self-hosted Postgres + Minio",
        whenCompetitor: [
          "You have a dedicated platform engineer and time to maintain both.",
          "Your compliance posture requires the database to live inside your own VPC.",
          "You want to fork Postgres extensions or recompile Minio with custom builds.",
        ],
        whenSwyftstack: [
          "You're shipping a Node app and you want the database half done for you.",
          "You're tired of three dashboards, three invoices, and three on-call rotations.",
          "You want PgBouncer pooling configured correctly without reading another docs site.",
          "You'd rather email a human than file a ticket and wait 72 hours.",
        ],
      })}
      steps={{
        eyebrow: "Setup",
        title: "Three minutes from npm init to a SELECT 1",
        items: [
          { n: 1, title: "Deploy a database", body: "Click \"Create database\" in the console. 47 seconds later you have a DATABASE_URL." },
          { n: 2, title: "Install your client", body: "pg for raw queries, Prisma for an ORM, Drizzle for a SQL-first ORM. Pick one - all three work." },
          { n: 3, title: "Wire SSL", body: "Pass ssl: { rejectUnauthorized: true } in the Pool options. Or just use sslmode=require in the URL." },
          { n: 4, title: "Ship", body: "Deploy your app anywhere - Vercel, Render, Fly, Railway, your own server - DATABASE_URL is the only thing they need to know." },
        ],
      }}
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
      bullets={{
        eyebrow: "Why Node teams pick us",
        title: "What you get on day one",
        subtitle: "Every Swyftstack plan ships with the database, storage, backups, and observability you'd otherwise stitch together.",
        items: WHY_SWYFTSTACK_BULLETS,
      }}
      faq={{
        items: [
          { q: "Does pgbouncer / connection pooling matter?", a: "Yes for serverless. Swyftstack ships PgBouncer in front of every database; toggle session or transaction mode in the dashboard." },
          { q: "Can I use it from Bun or Deno?", a: "Yes. They both speak the Postgres wire protocol via standard libraries (postgres, deno-postgres)." },
          { q: "What about edge runtimes (Cloudflare Workers, Vercel Edge)?", a: "Use an HTTP-based driver (e.g. @neondatabase/serverless) or a pg-over-HTTP proxy. Native TCP isn't available in those runtimes." },
          { q: "Does it work with NestJS / TypeORM?", a: "Yes. Use the postgres driver with TypeORM's standard config. Mikro-ORM, Sequelize, Knex, Kysely - all work." },
          ...SHARED_DB_FAQ,
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
