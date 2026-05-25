// /django-database - content from MARKETING_PAGES_CONTENT.md §21.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Managed PostgreSQL for Django: dj-database-url + psycopg, SSL on by default, daily backups. django-storages-compatible S3 storage included.";

export const metadata: Metadata = {
  title: "PostgreSQL database for Django - ready in minutes | Swyftstack",
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/django-database` },
  openGraph: { title: "Django database - Swyftstack", description: DESCRIPTION, url: `${SITE_URL}/django-database`, type: "article" },
};

export default function DjangoDatabasePage() {
  return (
    <MarketingTemplate
      eyebrow="Django + Swyftstack"
      headline="PostgreSQL for Django,"
      headlineAccent="ready in minutes."
      subheadline="dj-database-url + psycopg, SSL by default, daily backups. django-storages-compatible S3 included."
      primaryCta={{ label: "Deploy a database", href: "/signup" }}
      secondaryCta={{ label: "See pricing", href: "/pricing" }}
      snippets={{
        eyebrow: "Setup",
        title: "settings.py is the whole story",
        subtitle: "dj-database-url for the connection, django-storages for uploads. Both included.",
        snippets: [
          { name: "Install", language: "sh", code: `pip install dj-database-url psycopg[binary] django-storages[boto3]` },
          { name: "settings.py · DB", language: "py", code: `import os
import dj_database_url

DATABASES = {
    "default": dj_database_url.config(
        default=os.environ["DATABASE_URL"],
        conn_max_age=600,
        ssl_require=True,
    ),
}` },
          { name: "settings.py · Storage", language: "py", code: `STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "endpoint_url": "https://storage.swyftstack.com",
            "access_key": os.environ["SWYFTSTACK_ACCESS_KEY"],
            "secret_key": os.environ["SWYFTSTACK_SECRET_KEY"],
            "bucket_name": "my-uploads",
            "region_name": "auto",
        },
    },
}` },
          { name: "Run migrations", language: "sh", code: `python manage.py migrate
python manage.py collectstatic --noinput` },
        ],
      }}
      faq={{
        items: [
          { q: "Does ImageField / FileField just work?", a: "Yes. Configure the storages backend above and Django's media handling writes straight to Swyftstack Storage." },
          { q: "Can I use connection pooling?", a: "Use conn_max_age (above) for persistent connections, or pgbouncer-flavoured drivers like django-db-geventpool for high concurrency." },
          { q: "What about PostGIS, pgvector, pg_trgm?", a: "Available. Most extensions you'd expect are enabled or enable-able on request." },
        ],
      }}
      finalCta={{
        title: "Deploy a database for your Django app.",
        subtitle: "Launch offer: Starter at $9/mo for 2 months, then $19/mo.",
        primary: { label: "Deploy a database", href: "/signup" },
        secondary: { label: "See pricing", href: "/pricing" },
      }}
    />
  );
}
