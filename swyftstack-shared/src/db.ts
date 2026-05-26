// Prisma client singleton. Run `npm run db:generate` before importing this.
import { loadRootEnv } from "./load-env.js";
import { PrismaClient } from "./generated/prisma/index.js";

loadRootEnv();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const nodeEnv = (process.env as Record<string, string | undefined>).NODE_ENV;
const isProduction = nodeEnv === "production" || nodeEnv === "prod";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["warn", "error"],
  });

if (!isProduction) globalForPrisma.prisma = prisma;

export * from "./generated/prisma/index.js";
