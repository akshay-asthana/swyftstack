// /laravel-database - content from MARKETING_PAGES_CONTENT.md §22.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";
import { SHARED_DB_FAQ, WHY_SWYFTSTACK_BULLETS, competitorWhenList, complementWith } from "@/lib/solutions-content";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Managed PostgreSQL for Laravel. SSL by default, daily backups. S3-compatible disk works out of the box with Storage::disk().";

export const metadata: Metadata = {
  title: "PostgreSQL database for Laravel - ready in minutes | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/laravel-database` },
  openGraph: { title: "Laravel database - Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/laravel-database`, type: "article" },
};

export default function LaravelDatabasePage() {
  return (
    <MarketingTemplate
      eyebrow="Laravel + Swyftstack"
      headline="PostgreSQL for Laravel,"
      headlineAccent="ready in minutes."
      subheadline="A managed PostgreSQL Laravel will be happy with, including SSL, backups, and a copyable connection string under a minute."
      primaryCta={{ label: "Deploy a database", href: "/signup" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      complement={complementWith({
        partner: "Laravel Forge / Vapor",
        partnerCovers: "your PHP runtime",
        partnerBody: "Forge provisions the VPS your Laravel app runs on. Vapor pushes it to Lambda. We don't replace either — we replace the bare-metal Postgres line item with a managed connection string.",
        title: "Forge ships your Laravel app. Swyftstack ships its data.",
        subtitle: "Whether you're on Forge, Vapor, Ploi, or your own server, Swyftstack is just a DATABASE_URL away. config/database.php and config/filesystems.php stay otherwise untouched.",
      })}
      whenLists={competitorWhenList({
        competitor: "Forge / DigitalOcean Postgres",
        whenCompetitor: [
          "You're already running every other service on a managed VPS and want the database next to your app.",
          "You want raw `psql` superuser to install your own extensions.",
          "Your team has the appetite to run pg_basebackup, WAL retention, and certificate rotation in-house.",
        ],
        whenSwyftstack: [
          "You want SSL, backups, retention, and pooling configured correctly without reading three docs sites.",
          "You'd rather pay one bill for db + S3 + egress instead of three different invoices.",
          "You want to give a junior dev a connection string and have them productive in 5 minutes.",
          "You want a real human to reply when something breaks at midnight.",
        ],
      })}
      steps={{
        eyebrow: "Setup",
        title: "From `composer create-project laravel/laravel` to deployed",
        items: [
          { n: 1, title: "Deploy a database", body: "Click \"Create database\" in the Swyftstack console. Copy the DATABASE_URL." },
          { n: 2, title: "Set .env", body: "Map DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD, and DB_SSLMODE=require." },
          { n: 3, title: "Add S3 disk", body: "Add a `swyftstack` disk in config/filesystems.php pointing at storage.swyftstack.com." },
          { n: 4, title: "Migrate & ship", body: "`php artisan migrate` and deploy your app to Forge, Vapor, Render, or your own server - DATABASE_URL is the only variable that changes." },
        ],
      }}
      snippets={{
        eyebrow: "Setup",
        title: ".env, config, php artisan migrate",
        subtitle: "Standard Laravel idioms - nothing exotic.",
        snippets: [
          { name: ".env", language: "sh", code: `DB_CONNECTION=pgsql
DB_HOST=your.swyftstack.host
DB_PORT=5432
DB_DATABASE=your_db
DB_USERNAME=your_user
DB_PASSWORD=your_pass
DB_SSLMODE=require` },
          { name: "config/database.php", language: "php", code: `'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST'),
    'port' => env('DB_PORT', 5432),
    'database' => env('DB_DATABASE'),
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
    'sslmode' => env('DB_SSLMODE', 'prefer'),
],` },
          { name: "config/filesystems.php", language: "php", code: `'disks' => [
    'swyftstack' => [
        'driver' => 's3',
        'key' => env('SWYFTSTACK_ACCESS_KEY'),
        'secret' => env('SWYFTSTACK_SECRET_KEY'),
        'region' => 'auto',
        'bucket' => 'my-uploads',
        'endpoint' => 'https://storage.swyftstack.com',
        'use_path_style_endpoint' => true,
    ],
],` },
          { name: "Migrate", language: "sh", code: `php artisan migrate` },
        ],
      }}
      bullets={{
        eyebrow: "Why Laravel teams choose us",
        title: "What you get on day one",
        subtitle: "Every Swyftstack plan ships with the database, storage, backups, and observability you'd otherwise stitch together.",
        items: WHY_SWYFTSTACK_BULLETS,
      }}
      faq={{
        items: [
          { q: "Will Eloquent work without changes?", a: "Yes. Standard PostgreSQL via pdo_pgsql - every Eloquent feature works." },
          { q: "Can I use queue jobs / Horizon?", a: "Yes. Queue drivers (database, redis) are independent of the primary database connection." },
          { q: "Coming from MySQL?", a: "Most Laravel apps move cleanly. Watch for case-sensitive identifiers and a few function-name differences. We can advise during migration." },
          { q: "Does Storage::disk('swyftstack') just work?", a: "Yes - the disk is a normal S3 driver pointed at our endpoint with use_path_style_endpoint enabled. Storage::disk('swyftstack')->put(...) is all you write." },
          ...SHARED_DB_FAQ,
        ],
      }}
      finalCta={{
        title: "Deploy a database for your Laravel app.",
        subtitle: "Launch offer: Starter at $9/mo for 2 months, then $19/mo.",
        primary: { label: "Deploy a database", href: "/signup" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
