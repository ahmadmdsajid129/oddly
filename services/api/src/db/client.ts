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

const DB_STATEMENT_TIMEOUT_MS = Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 3000;

function configureDatabaseUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl || !rawUrl.startsWith("postgres")) return rawUrl;
  const separator = rawUrl.includes("?") ? "&" : "?";
  if (!rawUrl.includes("statement_timeout")) {
    return `${rawUrl}${separator}statement_timeout=${DB_STATEMENT_TIMEOUT_MS}`;
  }
  return rawUrl;
}

export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    datasourceUrl: configureDatabaseUrl(process.env.DATABASE_URL),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

