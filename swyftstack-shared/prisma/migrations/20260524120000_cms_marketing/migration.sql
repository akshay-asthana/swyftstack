-- CMS marketing pages (§15). Single table for v1 — assets live in the
-- platform bucket and only their URLs are stored in metadata / content_json.
CREATE TABLE IF NOT EXISTS "cms_marketing_pages" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "type"            TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'draft',
  "title"           TEXT NOT NULL,
  "slug"            TEXT NOT NULL,
  "excerpt"         TEXT,
  "content_json"    JSONB NOT NULL DEFAULT '{}'::jsonb,
  "content_html"    TEXT,
  "seo_title"       TEXT,
  "seo_description" TEXT,
  "og_image_url"    TEXT,
  "canonical_url"   TEXT,
  "author_id"       UUID,
  "published_at"    TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "metadata"        JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "cms_marketing_pages_type_slug_unique" UNIQUE ("type", "slug")
);

CREATE INDEX IF NOT EXISTS "cms_marketing_pages_status_idx" ON "cms_marketing_pages" ("status");
CREATE INDEX IF NOT EXISTS "cms_marketing_pages_type_idx" ON "cms_marketing_pages" ("type");
CREATE INDEX IF NOT EXISTS "cms_marketing_pages_published_at_idx" ON "cms_marketing_pages" ("published_at");
CREATE INDEX IF NOT EXISTS "cms_marketing_pages_slug_idx" ON "cms_marketing_pages" ("slug");

-- Platform bucket admin settings — keys are upserted on first save by the
-- admin Settings page. We don't seed a row here; absence means "not set".
