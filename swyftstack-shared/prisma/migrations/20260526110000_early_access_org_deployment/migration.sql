ALTER TABLE "organizations"
  ADD COLUMN IF NOT EXISTS "enable_app_deployment" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "early_access_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "company" TEXT,
  "role" TEXT,
  "country" TEXT,
  "phone" TEXT,
  "ip_address" TEXT,
  "ip_country" TEXT,
  "ip_region" TEXT,
  "ip_city" TEXT,
  "ip_timezone" TEXT,
  "ip_latitude" TEXT,
  "ip_longitude" TEXT,
  "user_agent" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "early_access_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "early_access_requests_email_idx"
  ON "early_access_requests"("email");

CREATE INDEX IF NOT EXISTS "early_access_requests_created_at_idx"
  ON "early_access_requests"("created_at");
