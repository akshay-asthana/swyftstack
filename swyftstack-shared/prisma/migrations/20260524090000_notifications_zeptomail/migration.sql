-- Notifications, usage-threshold idempotency, and transactional email providers.

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "organization_id" UUID,
  "project_id" UUID,
  "resource_type" TEXT,
  "resource_id" UUID,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "action_label" TEXT,
  "action_url" TEXT,
  "idempotency_key" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "read_at" TIMESTAMPTZ,
  "dismissed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_idempotency_key_key"
  ON "notifications"("idempotency_key");
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_at_created_at_idx"
  ON "notifications"("user_id", "read_at", "created_at");
CREATE INDEX IF NOT EXISTS "notifications_organization_id_created_at_idx"
  ON "notifications"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "notifications_project_id_created_at_idx"
  ON "notifications"("project_id", "created_at");
CREATE INDEX IF NOT EXISTS "notifications_type_created_at_idx"
  ON "notifications"("type", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_organization_id_fkey') THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_project_id_fkey') THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "notification_id" UUID NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "provider" TEXT,
  "provider_message_id" TEXT,
  "error_message" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notification_deliveries_notification_id_idx"
  ON "notification_deliveries"("notification_id");
CREATE INDEX IF NOT EXISTS "notification_deliveries_channel_status_created_at_idx"
  ON "notification_deliveries"("channel", "status", "created_at");
CREATE INDEX IF NOT EXISTS "notification_deliveries_provider_status_idx"
  ON "notification_deliveries"("provider", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_deliveries_notification_id_fkey'
  ) THEN
    ALTER TABLE "notification_deliveries"
      ADD CONSTRAINT "notification_deliveries_notification_id_fkey"
      FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "usage_threshold_email" BOOLEAN NOT NULL DEFAULT true,
  "usage_threshold_in_app" BOOLEAN NOT NULL DEFAULT true,
  "welcome_email" BOOLEAN NOT NULL DEFAULT true,
  "marketing_email" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_id_key"
  ON "notification_preferences"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_user_id_fkey'
  ) THEN
    ALTER TABLE "notification_preferences"
      ADD CONSTRAINT "notification_preferences_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "usage_threshold_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "project_id" UUID,
  "usage_period_id" UUID,
  "resource_type" TEXT NOT NULL,
  "threshold_percent" INTEGER NOT NULL,
  "current_value_bytes" BIGINT,
  "limit_value_bytes" BIGINT,
  "current_value_seconds" BIGINT,
  "limit_value_seconds" BIGINT,
  "notification_id" UUID,
  "email_delivery_id" UUID,
  "idempotency_key" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_threshold_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usage_threshold_events_idempotency_key_key"
  ON "usage_threshold_events"("idempotency_key");
CREATE INDEX IF NOT EXISTS "usage_threshold_events_user_id_created_at_idx"
  ON "usage_threshold_events"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "usage_threshold_events_organization_id_resource_type_threshold_percent_idx"
  ON "usage_threshold_events"("organization_id", "resource_type", "threshold_percent");
CREATE INDEX IF NOT EXISTS "usage_threshold_events_usage_period_id_idx"
  ON "usage_threshold_events"("usage_period_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_threshold_events_user_id_fkey') THEN
    ALTER TABLE "usage_threshold_events"
      ADD CONSTRAINT "usage_threshold_events_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_threshold_events_organization_id_fkey') THEN
    ALTER TABLE "usage_threshold_events"
      ADD CONSTRAINT "usage_threshold_events_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_threshold_events_project_id_fkey') THEN
    ALTER TABLE "usage_threshold_events"
      ADD CONSTRAINT "usage_threshold_events_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_threshold_events_usage_period_id_fkey') THEN
    ALTER TABLE "usage_threshold_events"
      ADD CONSTRAINT "usage_threshold_events_usage_period_id_fkey"
      FOREIGN KEY ("usage_period_id") REFERENCES "usage_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_threshold_events_notification_id_fkey') THEN
    ALTER TABLE "usage_threshold_events"
      ADD CONSTRAINT "usage_threshold_events_notification_id_fkey"
      FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_threshold_events_email_delivery_id_fkey') THEN
    ALTER TABLE "usage_threshold_events"
      ADD CONSTRAINT "usage_threshold_events_email_delivery_id_fkey"
      FOREIGN KEY ("email_delivery_id") REFERENCES "notification_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "email_providers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "from_email" TEXT NOT NULL,
  "from_name" TEXT NOT NULL,
  "reply_to_email" TEXT,
  "api_url" TEXT NOT NULL,
  "encrypted_api_key" TEXT,
  "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_providers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_providers_provider_status_idx"
  ON "email_providers"("provider", "status");
