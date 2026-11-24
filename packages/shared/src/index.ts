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
export * from "./card-render-pool.js";
export * from "./storage.js";
export * from "./degradation.js";
export * from "./telepathy.js";
export * from "./antitwin.js";
export * from "./taxonomy.js";
export * from "./memes.js";
export * from "./memes-lane.js";
export * from "./formats.js";
export * from "./chat-unlock.js";
export * from "./seeds/rich-questions.js";
export * from "./seeds/memes-lane-drops.js";
export * from "./demo-mode.js";
export * from "./bitminhash.js";
export * from "./tie-breaker.js";
export * from "./mutual-pairing.js";
export * from "./batch-importer.js";
export * from "./entitlements/index.js";
export * from "./ml/explainable-ranker.js";
export * from "./ml/audit.js";
export * from "./redis/keys.js";
export * from "./redis/client.js";
export * from "./blueprint-generator.js";
export {
  PrismaClient,
  type Prisma,
  KeepStatus,
  OrbitStatus,
} from "./db.js";

export function getAppMeta() {
  return {
    ok: true,
    service: "oddly-shared",
    version: ODDLY_VERSION,
    timestamp: new Date().toISOString(),
  };
}
