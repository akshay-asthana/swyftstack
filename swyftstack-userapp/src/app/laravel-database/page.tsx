// /laravel-database - content from MARKETING_PAGES_CONTENT.md §22.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

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
      faq={{
        items: [
          { q: "Will Eloquent work without changes?", a: "Yes. Standard PostgreSQL via pdo_pgsql - every Eloquent feature works." },
          { q: "Can I use queue jobs / Horizon?", a: "Yes. Queue drivers (database, redis) are independent of the primary database connection." },
          { q: "Coming from MySQL?", a: "Most Laravel apps move cleanly. Watch for case-sensitive identifiers and a few function-name differences. We can advise during migration." },
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
