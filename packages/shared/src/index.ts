/**
 * @oddly/shared
 * Core shared types, Zod schemas, constants, scoring math, matching engine,
 * privacy helpers, date arithmetic, and database exports.
 */

export const ODDLY_VERSION = "1.0.0" as const;

export * from "./types.js";
export * from "./schemas.js";
export * from "./scoring.js";
export * from "./matching.js";
export * from "./privacy.js";
export * from "./dates.js";
export * from "./qrcode.js";
export * from "./share-cards.js";
export { PrismaClient } from "./db.js";
export type { Prisma } from "./db.js";

export function getAppMeta() {
  return {
    ok: true,
    service: "oddly-shared",
    version: ODDLY_VERSION,
    timestamp: new Date().toISOString(),
  };
}
