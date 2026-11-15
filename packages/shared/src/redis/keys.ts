/**
 * @file keys.ts
 * @package @oddly/shared
 *
 * Central Redis Key Builder & Hygiene Registry (R2.2)
 *
 * Rules:
 * 1. Mandatory namespace prefix matching Redis role:
 *    - `cache:` -> Cache Redis role (allkeys-lru eviction allowed)
 *    - `counter:` -> Counters Redis role (noeviction, persistence)
 *    - `queue:` -> Queue Redis role (noeviction, persistence)
 * 2. Strict TTL enforcement:
 *    Every key written to Redis MUST have an explicit TTL unless registered
 *    in TTL_EXEMPT_KEYS with an audited reason.
 */

export type RedisRole = "cache" | "counters" | "queue";

export interface TtlExemption {
  pattern: RegExp;
  reason: string;
}

/**
 * List of keys exempt from mandatory TTL with documented reasons.
 */
export const TTL_EXEMPT_KEYS: TtlExemption[] = [
  {
    pattern: /^queue:[a-zA-Z0-9_-]+:meta$/,
    reason: "BullMQ persistent queue configuration metadata must persist across restarts",
  },
  {
    pattern: /^cache:config:system_defaults$/,
    reason: "Static bootstrap configuration fallback cached in memory",
  },
];

/**
 * Checks whether a key matches any approved TTL exemption.
 */
export function isTtlExempt(key: string): boolean {
  return TTL_EXEMPT_KEYS.some((exemption) => exemption.pattern.test(key));
}

/**
 * Validates that a key follows mandatory role prefixing conventions.
 */
export function validateKeyPrefix(key: string): RedisRole {
  if (key.startsWith("cache:")) return "cache";
  if (key.startsWith("counter:")) return "counters";
  if (key.startsWith("queue:")) return "queue";
  throw new Error(
    `[Redis Hygiene Violation] Key '${key}' does not have a mandatory role prefix ('cache:', 'counter:', or 'queue:')`
  );
}

/**
 * Typed Key Builders
 */
export const RedisKeys = {
  cache: {
    dropToday: () => "cache:drop:today" as const,
    drop: (dropId: string) => `cache:drop:${dropId}` as const,
    configPublic: () => "cache:config:public" as const,
    page: (slug: string) => `cache:page:${slug}` as const,
    statsToday: () => "cache:stats:today" as const,
    rateLimit: (identifier: string) => `cache:rate:${identifier}` as const,
    lockStampede: (resource: string) => `cache:lock:stampede:${resource}` as const,
  },
  counter: {
    answer: (dropId: string, questionId: string, value: string) =>
      `counter:drop:${dropId}:q:${questionId}:v:${encodeURIComponent(value)}` as const,
    bucket: (dropId: string, hash: string) =>
      `counter:drop:${dropId}:bucket:${hash}` as const,
    submissionLock: (dropId: string, playerId: string) =>
      `counter:lock:sub:${dropId}:${playerId}` as const,
    requestLock: (requestId: string) =>
      `counter:lock:req:${requestId}` as const,
    schedulerLock: (jobName: string, runFor: string) =>
      `counter:lock:sched:${jobName}:${runFor}` as const,
    totalSubmissions: (dropId: string) =>
      `counter:drop:${dropId}:total` as const,
  },
  queue: {
    dropPipeline: () => "queue:drop_pipeline" as const,
    push: () => "queue:push_notifications" as const,
    shareCards: () => "queue:share_cards" as const,
  },
};

