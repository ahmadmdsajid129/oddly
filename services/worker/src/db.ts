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

export function createWorkerPrismaClient(): PrismaClient {
  if (globalThis.__workerPrisma) {
    return globalThis.__workerPrisma;
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__workerPrisma = client;
  }

  return client;
}

export const prisma = createWorkerPrismaClient();
