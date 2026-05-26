// Shared "style guide" content for the solutions and comparison pages.
//
// The goal here is consistency: every solutions page (nextjs-database,
// django-database, laravel-database, nodejs-database, AI-coded-app pages)
// gets the same five-block structure - hero, when/when, steps, snippets,
// bullets, FAQ, final CTA - and the comparison pages all reuse the same
// "what you actually pay for / what you don't" block plus a real feature
// comparison row set so each page reads consistently.
//
// Update common copy once here and it lands on every page that imports it.

import type { Faq, WhenList } from "@/components/marketing/marketing-template";
import type { ComparisonColumn, ComparisonRow } from "@/components/marketing/comparison-table";

/* ============================================================
 * Why-Swyftstack bullets shared by every solutions page.
 * Drop into `MarketingTemplate.bullets.items`.
 * ============================================================ */

export const WHY_SWYFTSTACK_BULLETS: { title: string; body: string }[] = [
  {
    title: "Real Postgres, no fork",
    body: "PostgreSQL 16 straight from postgresql.org. No custom protocol, no proprietary driver. Whatever your ORM expects, just works.",
  },
  {
    title: "S3-compatible storage included",
    body: "Use the AWS SDK you already use. Same endpoint, same signing, same multipart uploads. Public buckets get a CDN URL automatically.",
  },
  {
    title: "47-second provisioning",
    body: "Click \"Create database\". Get a connection string with SSL by default. No waiting room, no provisioning queue, no DNS to set up first.",
  },
  {
    title: "Daily backups, tested restores",
    body: "Encrypted daily backups with 7- or 30-day retention. Weekly automated restore drills - because untested backups aren't backups.",
  },
  {
    title: "One bill, one platform",
    body: "Database, storage, backups, and egress on a single invoice. No three-vendor accounting at the end of the quarter.",
  },
  {
    title: "No vendor lock-in",
    body: "Open standards on both ends. pg_dump and S3 export are first-class, even on the free tier. Move on whenever you want.",
  },
];

/* ============================================================
 * Shared FAQ chunks. Compose per-page lists like
 *   faq: { items: [...SHARED_DB_FAQ, ...frameworkFaq] }
 * to keep answers consistent and editable in one place.
 * ============================================================ */

export const SHARED_DB_FAQ: Faq[] = [
  {
    q: "Is this real PostgreSQL or a fork?",
    a: "Real PostgreSQL 16, straight from postgresql.org. We don't fork or modify the engine. pg_dump, psql, and any standard client work normally.",
  },
  {
    q: "Where is my data stored?",
    a: "US or EU - you pick at signup. Encrypted in transit and at rest. Backups are encrypted with separate keys.",
  },
  {
    q: "Can I move off Swyftstack later?",
    a: "Yes. PostgreSQL and S3-compatible storage are open standards. Take a pg_dump or export your buckets anytime - we'll even help.",
  },
  {
    q: "What happens if I outgrow the Starter plan?",
    a: "Click upgrade. Same database, same connection string, more capacity. No downtime, no migration.",
  },
  {
    q: "Do I need to manage SSL myself?",
    a: "No. SSL is on by default, certificates are managed and auto-renewed. Standard rejectUnauthorized: true works out of the box.",
  },
];

/* ============================================================
 * "When competitor / when us" lists for comparison pages.
 * Tweak per-page if you want competitor-specific framing, but
 * keep the same shape so the layout stays predictable.
 * ============================================================ */

export function competitorWhenList(opts: {
  competitor: string;
  whenCompetitor: string[];
  whenSwyftstack: string[];
}): { left: WhenList; right: WhenList } {
  return {
    left: {
      title: `When ${opts.competitor} is the right tool`,
      items: opts.whenCompetitor,
    },
    right: {
      title: "When Swyftstack is the obvious choice",
      items: opts.whenSwyftstack,
    },
  };
}

/* ============================================================
 * Generic comparison columns + a reusable row set for the
 * comparison pages. Each page can append/replace rows but the
 * shared set ensures every comparison page covers the same
 * decision criteria: price, provisioning, lock-in, support.
 * ============================================================ */

export function makeComparisonColumns(competitor: string): ComparisonColumn[] {
  return [
    { label: competitor },
    { label: "Swyftstack", highlight: true },
  ];
}

/**
 * Build the shared comparison row set, parameterised by what the competitor
 * offers for each capability. The Swyftstack column is the same on every
 * comparison page; the competitor column is page-specific to keep the
 * "obvious choice" framing honest.
 */
export function makeSharedComparisonRows(competitor: {
  pgFork: string;
  ssl: string;
  provisioning: string;
  storage: string;
  backups: string;
  invoice: string;
  lockin: string;
  pricing: string;
  support: string;
}): ComparisonRow[] {
  return [
    {
      label: "Real PostgreSQL (no fork, no proxy)",
      cells: [competitor.pgFork, "PG 16, unmodified"],
    },
    {
      label: "SSL on by default",
      cells: [competitor.ssl, "Required, managed certs"],
    },
    {
      label: "Provisioning time",
      cells: [competitor.provisioning, "47 seconds"],
    },
    {
      label: "S3-compatible storage included",
      cells: [competitor.storage, "Included, same dashboard"],
    },
    {
      label: "Daily backups + tested restores",
      cells: [competitor.backups, "Daily + weekly restore drills"],
    },
    {
      label: "Single invoice for db + storage + egress",
      cells: [competitor.invoice, "One invoice"],
    },
    {
      label: "Vendor lock-in",
      cells: [competitor.lockin, "Standard PG + S3, pg_dump-friendly"],
    },
    {
      label: "Launch pricing (first 2 months)",
      cells: [competitor.pricing, "$9/mo Starter, $49/mo Growth"],
    },
    {
      label: "Real human support email",
      cells: [competitor.support, "Founder replies on Pro"],
    },
  ];
}

/* ============================================================
 * "What you actually pay for / what you don't" - reusable bullet
 * block for comparison pages.
 * ============================================================ */

export const PAY_FOR_BULLETS = [
  { title: "What you pay for", body: "Storage, egress, and compute that you actually use. Predictable monthly plan price; overage prices published, not hidden." },
  { title: "What you don't pay for", body: "Per-seat fees. Per-database fees. \"Read replica\" fees. Backup storage fees. Bandwidth surprise fees in a different units page." },
  { title: "What you never pay for", body: "Migrating off. pg_dump and S3 export work the same as on any standard host. We'll even help you cut over." },
];

/* ============================================================
 * Solutions-page hero trust strip - consistent four-item set.
 * ============================================================ */

export const SOLUTIONS_HERO_TRUST = [
  "47-second deploys",
  "SSL on by default",
  "Daily backups",
  "S3-compatible storage included",
];
