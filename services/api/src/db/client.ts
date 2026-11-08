/**
 * @file client.ts
 * @package @oddly/api
 *
 * Singleton Prisma database client for the API service.
 * Configured with connection lifecycle management and error logging.
 */

import { PrismaClient } from "@oddly/shared";

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

