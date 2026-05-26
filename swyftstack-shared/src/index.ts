// Public surface of swyftstack-shared. Pure-logic modules are import-safe even
// before `prisma generate` (no DB import); db/services/jobs need the client.
export * from "./constants.js";
export * from "./limits.js";
export * from "./permissions.js";
export * from "./usage.js";
export * from "./dbsql.js";
export * from "./backup-state.js";
export * from "./public-ids.js";
export * from "./session.js";
export * from "./onboarding.js";
export * from "./auth-tokens.js";
export * from "./email.js";
export * from "./email-templates.js";
export * from "./notifications.js";
export * from "./node-discovery.js";
export * from "./ssh-key.js";
export * from "./provider-help.js";
export { env, isProductionEnv } from "./env.js";
export {
  encryptSecret,
  decryptSecret,
  hashToken,
  randomSecret,
  hashPassword,
  verifyPassword,
} from "./crypto.js";

// DB-bound (require generated Prisma client):
export { prisma } from "./db.js";
export { audit, projectActivity } from "./audit.js";
export * from "./services/index.js";
export * from "./jobs/index.js";
export { rollUpUsage, enforceLimits, checkUsageThresholds } from "./usage-engine.js";
export { rollUpMetrics } from "./metrics-rollup.js";
