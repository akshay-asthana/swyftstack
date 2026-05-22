// Prisma client singleton. Run `npm run db:generate` before importing this.
import { loadRootEnv } from "./load-env.js";
import { PrismaClient } from "./generated/prisma/index.js";

loadRootEnv();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "./generated/prisma/index.js";
