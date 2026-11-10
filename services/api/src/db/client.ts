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

export const DB_STATEMENT_TIMEOUT_MS = Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 3000;

export class StatementTimeoutError extends Error {
  code = "57014";
  name = "StatementTimeoutError";
  constructor(message = "canceling statement due to statement timeout") {
    super(message);
  }
}

/**
 * Executes a database query enforcing statement_timeout on every pooled execution (R1-PATCH Item 3).
 * Rejects and maps to error code 57014 (PostgreSQL statement_timeout cancellation).
 */
export async function executeWithStatementTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs = DB_STATEMENT_TIMEOUT_MS
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new StatementTimeoutError(`canceling statement due to statement timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    if (typeof timer.unref === "function") timer.unref();
  });

  try {
    const res = await Promise.race([queryFn(), timeoutPromise]);
    if (timer) clearTimeout(timer);
    return res;
  } catch (err: unknown) {
    if (timer) clearTimeout(timer);
    const error = err as { code?: string; message?: string };
    if (
      error.code === "57014" ||
      error.message?.includes("statement timeout") ||
      error.message?.includes("canceling statement")
    ) {
      throw new StatementTimeoutError("canceling statement due to statement timeout");
    }
    throw err;
  }
}

function configureDatabaseUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl || !rawUrl.startsWith("postgres")) return rawUrl;
  const separator = rawUrl.includes("?") ? "&" : "?";
  let url = rawUrl;
  if (!url.includes("statement_timeout")) {
    url = `${url}${separator}statement_timeout=${DB_STATEMENT_TIMEOUT_MS}`;
  }
  if (!url.includes("options=")) {
    const nextSep = url.includes("?") ? "&" : "?";
    url = `${url}${nextSep}options=-c%20statement_timeout%3D${DB_STATEMENT_TIMEOUT_MS}`;
  }
  return url;
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

