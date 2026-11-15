/**
 * @file db.ts
 * @package @oddly/worker
 *
 * Database client for BullMQ worker processes.
 */

import { PrismaClient } from "@oddly/shared";

declare global {
  var __workerPrisma: PrismaClient | undefined;
}

export const WORKER_DB_STATEMENT_TIMEOUT_MS =
  Number(process.env.WORKER_DB_STATEMENT_TIMEOUT_MS) || 60000;
export const BATCH_DB_STATEMENT_TIMEOUT_MS =
  Number(process.env.BATCH_DB_STATEMENT_TIMEOUT_MS) || 120000;

export class WorkerStatementTimeoutError extends Error {
  code = "57014";
  name = "WorkerStatementTimeoutError";
  constructor(message = "canceling worker statement due to statement timeout") {
    super(message);
  }
}

export async function executeWorkerWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs = WORKER_DB_STATEMENT_TIMEOUT_MS
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new WorkerStatementTimeoutError(`canceling worker statement after ${timeoutMs}ms`));
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
      throw new WorkerStatementTimeoutError("canceling worker statement due to statement timeout");
    }
    throw err;
  }
}

function configureWorkerDatabaseUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl || !rawUrl.startsWith("postgres")) return rawUrl;
  const separator = rawUrl.includes("?") ? "&" : "?";
  let url = rawUrl;
  if (!url.includes("statement_timeout")) {
    url = `${url}${separator}statement_timeout=${WORKER_DB_STATEMENT_TIMEOUT_MS}`;
  }
  if (!url.includes("options=")) {
    const nextSep = url.includes("?") ? "&" : "?";
    url = `${url}${nextSep}options=-c%20statement_timeout%3D${WORKER_DB_STATEMENT_TIMEOUT_MS}`;
  }
  return url;
}

export function createWorkerPrismaClient(): PrismaClient {
  if (globalThis.__workerPrisma) {
    return globalThis.__workerPrisma;
  }

  const defaultUrl = "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";
  const client = new PrismaClient({
    datasourceUrl: configureWorkerDatabaseUrl(process.env.DATABASE_URL || defaultUrl),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__workerPrisma = client;
  }

  return client;
}

export const prisma = createWorkerPrismaClient();

