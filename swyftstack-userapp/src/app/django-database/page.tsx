// /django-database - content from MARKETING_PAGES_CONTENT.md §21.
import type { Metadata } from "next";
import { MarketingTemplate } from "@/components/marketing/marketing-template";
import { SITE_URL } from "@/components/marketing/jsonld";
import { SHARED_DB_FAQ, WHY_SWYFTSTACK_BULLETS, competitorWhenList } from "@/lib/solutions-content";

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
      whenLists={competitorWhenList({
        competitor: "Self-managed Postgres on a VPS",
        whenCompetitor: [
          "You want full superuser, custom extensions, custom postgresql.conf.",
          "You enjoy running pg_basebackup, WAL archiving, and certificate rotation yourself.",
          "Your infosec team requires the database to live inside your own VPC.",
        ],
        whenSwyftstack: [
          "You'd rather ship features than configure pg_hba.conf and Certbot.",
          "You want SSL, backups, retention, and pooling configured correctly out of the box.",
          "You're on Render/Heroku/Fly and the database tier is the single most expensive line item.",
          "You're paying for two products (database + S3) and want one invoice instead.",
        ],
      })}
      steps={{
        eyebrow: "Setup",
        title: "Four steps from `django-admin startproject` to production",
        items: [
          { n: 1, title: "Deploy a Swyftstack database", body: "One click, 47 seconds. Copy the connection string from the dashboard." },
          { n: 2, title: "Install the libraries", body: "pip install dj-database-url psycopg[binary] django-storages[boto3]. Pin them in requirements.txt." },
          { n: 3, title: "Wire settings.py", body: "DATABASES from dj_database_url.config(...) with ssl_require=True; STORAGES for media uploads." },
          { n: 4, title: "Run migrate + deploy", body: "python manage.py migrate && python manage.py collectstatic. Push the env vars to your host of choice." },
        ],
      }}
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
      bullets={{
        eyebrow: "Why Django teams pick us",
        title: "What you get on day one",
        subtitle: "Every Swyftstack plan ships with the database, storage, backups, and observability you'd otherwise stitch together.",
        items: WHY_SWYFTSTACK_BULLETS,
      }}
      faq={{
        items: [
          { q: "Does ImageField / FileField just work?", a: "Yes. Configure the storages backend above and Django's media handling writes straight to Swyftstack Storage." },
          { q: "Can I use connection pooling?", a: "Use conn_max_age (above) for persistent connections, or pgbouncer-flavoured drivers like django-db-geventpool for high concurrency." },
          { q: "What about PostGIS, pgvector, pg_trgm?", a: "Available. Most extensions you'd expect are enabled or enable-able on request." },
          { q: "Can I host my Django app on Swyftstack too?", a: "App deployment is rolling out by invite. For now, host the app on your runtime of choice (Render, Fly, Railway, your own server) and point DATABASE_URL at Swyftstack." },
          ...SHARED_DB_FAQ,
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
