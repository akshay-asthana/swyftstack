// Control-plane environment ONLY.
//
// Customer-facing infrastructure (Postgres clusters, object storage, backup
// targets, worker tuning) is NOT configured here. It lives in the control
// database (infrastructure_providers / database_clusters /
// object_storage_providers / backup_storage_providers / worker_configs) and is
// managed from the admin dashboard. The DEV_* and DEFAULT_WORKER_* values below
// are *fallback* defaults only — used when no DB-managed config exists yet.
import { z } from "zod";
import { loadRootEnv } from "./load-env.js";

loadRootEnv();

const schema = z.object({
  // Control-plane database (the only DB connection string in env).
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://quickdock:quickdock@localhost:5432/quickdock_control"),

  // Required secrets.
  SECRET_ENCRYPTION_KEY: z.string().default(""),
  AUTH_SECRET: z.string().default("dev-auth-secret"),
  INTERNAL_API_TOKEN: z.string().default("dev-internal-token"),

  // Bootstrap admin (consumed by the seed script).
  PLATFORM_ADMIN_EMAIL: z.string().default("admin@quickdock.local"),
  PLATFORM_ADMIN_PASSWORD: z.string().default("ChangeMe_Quickdock_123"),

  // URLs.
  PLATFORM_BASE_URL: z.string().default("http://localhost:3000"),
  USERAPP_BASE_URL: z.string().default("http://localhost:3001"),

  // Optional Google OAuth for customer sign-in. The callback can live on the
  // platform app because the user cookie is scoped to localhost, not the port.
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_CALLBACK_URL: z.string().default(""),

  // Runtime.
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),

  // Dev-only local paths (used to seed the local_dev providers; the providers
  // themselves persist these in the DB after seeding).
  DEV_LOCAL_STORAGE_ROOT: z.string().default("./storage-local"),
  DEV_LOCAL_BACKUP_ROOT: z.string().default("./backups-local"),

  // Fallback worker defaults — only applied when a worker has no DB config.
  DEFAULT_WORKER_POLL_INTERVAL_MS: z.coerce.number().default(2000),
  DEFAULT_WORKER_CONCURRENCY: z.coerce.number().default(2),
  DEFAULT_WORKER_LOCK_TIMEOUT_MS: z.coerce.number().default(300000),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
