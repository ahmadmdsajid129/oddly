/**
 * @file client.ts
 * @package @oddly/api
 *
 * Singleton Prisma database clients for the API service:
 * - Primary client (`prisma`): write transactions and critical master queries
 * - Read replica client (`prismaReplica`): historical archive, world stats, and background reads (P8.11, Architecture Sec 8.1)
 *
 * Configured with connection lifecycle management, statement timeout, and automatic replica failover.
 */

import { PrismaClient } from "@oddly/shared";

declare global {
  var __prisma: PrismaClient | undefined;
  var __prismaReplica: PrismaClient | undefined;
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

const defaultApiDbUrl = "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

// Primary database client (writes, user merges, identity, live drop submissions)
export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    datasourceUrl: configureDatabaseUrl(process.env.DATABASE_URL || defaultApiDbUrl),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// Read replica client initialization (P8.11, Architecture Sec 8.1 & Scaling Plan T2)
const replicaUrl = process.env.DATABASE_REPLICA_URL;

const rawReplicaClient: PrismaClient = replicaUrl
  ? globalThis.__prismaReplica ||
    new PrismaClient({
      datasourceUrl: configureDatabaseUrl(replicaUrl),
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "info", "warn", "error"]
          : ["error"],
    })
  : prisma;

if (replicaUrl && process.env.NODE_ENV !== "production") {
  globalThis.__prismaReplica = rawReplicaClient;
}

let testReplicaClient: PrismaClient | null = null;
let replicaFallbackCount = 0;

/**
 * Sets mock replica client for unit / integration tests.
 */
export function setReplicaClientForTest(client: PrismaClient | null): void {
  testReplicaClient = client;
}

/**
 * Returns active read replica client.
 */
export function getReplicaClient(): PrismaClient {
  return testReplicaClient || rawReplicaClient;
}

/**
 * Whether a dedicated database read replica is configured and distinct from primary.
 */
export function isReplicaConfigured(): boolean {
  if (testReplicaClient) return true;
  return Boolean(process.env.DATABASE_REPLICA_URL && process.env.DATABASE_REPLICA_URL !== process.env.DATABASE_URL);
}

/**
 * Telemetry and routing metrics for database read replica.
 */
export function getReplicaMetrics(): {
  replicaConfigured: boolean;
  fallbackCount: number;
} {
  return {
    replicaConfigured: isReplicaConfigured(),
    fallbackCount: replicaFallbackCount,
  };
}

/**
 * Resets telemetry metrics.
 */
export function resetReplicaMetrics(): void {
  replicaFallbackCount = 0;
}

/**
 * Transparent failover executor for read replica queries (P8.11).
 * Executes on read replica; if replica times out or errors, automatically falls back to primary.
 */
export async function executeReplicaQueryWithFallback<T>(
  queryFn: (client: PrismaClient) => Promise<T>
): Promise<T> {
  const replica = getReplicaClient();

  // If replica is distinct from primary, try replica first with failover to primary
  if (replica !== prisma) {
    try {
      return await executeWithStatementTimeout(() => queryFn(replica));
    } catch (replicaError) {
      replicaFallbackCount++;
      // Transparent failover to primary database
      return await executeWithStatementTimeout(() => queryFn(prisma));
    }
  }

  // Otherwise run on primary
  return await executeWithStatementTimeout(() => queryFn(prisma));
}

/**
 * Exported Proxy for `prismaReplica`.
 * Automatically delegates calls to `getReplicaClient()`.
 */
export const prismaReplica: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getReplicaClient();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === "function") {
      return (val as (...args: unknown[]) => unknown).bind(client);
    }
    return val;
  },
});
