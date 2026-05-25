ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'provisioning';
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'partially_failed';

ALTER TYPE "BucketStatus" ADD VALUE IF NOT EXISTS 'provisioning';
ALTER TYPE "BucketStatus" ADD VALUE IF NOT EXISTS 'failed';

ALTER TYPE "DatabaseImportStatus" ADD VALUE IF NOT EXISTS 'estimating_size';
ALTER TYPE "DatabaseImportStatus" ADD VALUE IF NOT EXISTS 'creating_target';
ALTER TYPE "DatabaseImportStatus" ADD VALUE IF NOT EXISTS 'uploading_dump_optional';
ALTER TYPE "DatabaseImportStatus" ADD VALUE IF NOT EXISTS 'switching';

ALTER TABLE "plan_limits" ADD COLUMN IF NOT EXISTS "max_storage_buckets" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_hash_key"
  ON "invitations"("token_hash");

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "consumed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_hash_key"
  ON "email_verification_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_user_id_idx"
  ON "email_verification_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_email_idx"
  ON "email_verification_tokens"("email");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_verification_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE "email_verification_tokens"
      ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "consumed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key"
  ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx"
  ON "password_reset_tokens"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "storage_objects" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "bucket_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "content_type" TEXT,
  "etag" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "storage_objects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "storage_objects_bucket_id_key_key"
  ON "storage_objects"("bucket_id", "key");
CREATE INDEX IF NOT EXISTS "storage_objects_bucket_id_updated_at_idx"
  ON "storage_objects"("bucket_id", "updated_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'storage_objects_bucket_id_fkey'
  ) THEN
    ALTER TABLE "storage_objects"
      ADD CONSTRAINT "storage_objects_bucket_id_fkey"
      FOREIGN KEY ("bucket_id") REFERENCES "storage_buckets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "platform_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_settings_key_key"
  ON "platform_settings"("key");
