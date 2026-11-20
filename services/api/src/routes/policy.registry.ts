/**
 * @file policy.registry.ts
 * @package @oddly/api
 *
 * Per-Route Policy Registry & Enforcement Specification (R2.3 & Addendum Section 5.1)
 *
 * Every API route is governed by:
 * - timeoutMs: DB/API execution deadline
 * - rateLimitClass: standard, tight, coarse-ip
 * - cacheControl: Cache-Control HTTP header directive
 * - idempotencyRequired: Whether request_id / idempotency lock is enforced
 * - priorityLane: high, normal, background
 * - degradationBehavior: L0 to L4 shedding response
 */

export interface RoutePolicy {
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD";
  path: string;
  timeoutMs: number;
  rateLimitClass: "standard" | "tight" | "coarse_ip" | "exempt";
  cacheControl: string;
  idempotencyRequired: boolean;
  priorityLane: "critical" | "high" | "normal" | "background";
  degradationBehavior: string;
}

export const ROUTE_POLICIES: RoutePolicy[] = [
  // Health & Readiness
  {
    method: "GET",
    path: "/ready",
    timeoutMs: 1000,
    rateLimitClass: "exempt",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "critical",
    degradationBehavior: "Returns 503 if draining or core dependencies dead",
  },
  {
    method: "GET",
    path: "/healthz",
    timeoutMs: 500,
    rateLimitClass: "exempt",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "critical",
    degradationBehavior: "Always responds 200 while process lives",
  },
  {
    method: "GET",
    path: "/metrics",
    timeoutMs: 2000,
    rateLimitClass: "exempt",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "Bearer authenticated Prometheus scraper",
  },

  // Public Drop, Content, Config, Pages
  {
    method: "GET",
    path: "/v1/drop/today",
    timeoutMs: 3000,
    rateLimitClass: "standard",
    cacheControl: "public, max-age=5, s-maxage=5, stale-while-revalidate=30, stale-if-error=3600",
    idempotencyRequired: false,
    priorityLane: "high",
    degradationBehavior: "Cache-first; returns stale JSON under DB outage",
  },
  {
    method: "GET",
    path: "/v1/drops/:id.json",
    timeoutMs: 3000,
    rateLimitClass: "standard",
    cacheControl: "public, max-age=31536000, immutable",
    idempotencyRequired: false,
    priorityLane: "high",
    degradationBehavior: "Immutable daily archive served directly from CDN/cache",
  },
  {
    method: "GET",
    path: "/v1/config/public",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    idempotencyRequired: false,
    priorityLane: "high",
    degradationBehavior: "Cached; exposes degradation level and banner copy keys",
  },
  {
    method: "GET",
    path: "/v1/pages/:slug",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "Cached CMS markdown pages",
  },
  {
    method: "GET",
    path: "/v1/stats/today",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "public, max-age=5, s-maxage=10, stale-while-revalidate=30",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "L1: cache lengthened to 60s; shed under L3+",
  },
  {
    method: "GET",
    path: "/v1/time",
    timeoutMs: 1000,
    rateLimitClass: "standard",
    cacheControl: "no-store, no-cache, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "high",
    degradationBehavior: "Clock sync endpoint returning server IST timestamp",
  },
  {
    method: "GET",
    path: "/v1/world/:dropId",
    timeoutMs: 3000,
    rateLimitClass: "standard",
    cacheControl: "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "L2+: served stale up to 10 minutes",
  },

  // Share and Card Routes
  {
    method: "GET",
    path: "/s/:shortId",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "public, max-age=3600, s-maxage=86400",
    idempotencyRequired: false,
    priorityLane: "high",
    degradationBehavior: "Redirects or serves cached OpenGraph share preview",
  },
  {
    method: "POST",
    path: "/v1/shares/short-link",
    timeoutMs: 3000,
    rateLimitClass: "tight",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: true,
    priorityLane: "normal",
    degradationBehavior: "Creates deterministic short link",
  },
  {
    method: "POST",
    path: "/v1/cards/render",
    timeoutMs: 5000,
    rateLimitClass: "tight",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: true,
    priorityLane: "normal",
    degradationBehavior: "L1+: on-demand card rendering only",
  },

  // Submissions & Matches (Hot Path)
  {
    method: "POST",
    path: "/v1/submissions",
    timeoutMs: 3000,
    rateLimitClass: "tight",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: true,
    priorityLane: "critical",
    degradationBehavior: "L3: persists submission and defers matching to worker",
  },
  {
    method: "GET",
    path: "/v1/results/:dropId",
    timeoutMs: 3000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "high",
    degradationBehavior: "Returns provisional twin during live drop, finalized twin after close",
  },
  {
    method: "GET",
    path: "/v1/history",
    timeoutMs: 3000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "L2+: served stale or shed under overload",
  },

  // Auth, Account & Privacy
  {
    method: "POST",
    path: "/v1/auth/oauth",
    timeoutMs: 4000,
    rateLimitClass: "tight",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "L3: sign-ups disabled, guest play continues",
  },
  {
    method: "POST",
    path: "/v1/auth/merge-guest",
    timeoutMs: 3000,
    rateLimitClass: "tight",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "Merges device picks into account",
  },
  {
    method: "POST",
    path: "/v1/auth/logout",
    timeoutMs: 1000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "Revokes session cookie",
  },
  {
    method: "GET",
    path: "/v1/auth/session",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "Returns active session state",
  },

  // Me & Settings
  {
    method: "GET",
    path: "/v1/me",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "L2+: returns cached profile",
  },
  {
    method: "POST",
    path: "/v1/me/push-subscription",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "Registers browser push subscription",
  },
  {
    method: "POST",
    path: "/v1/push/subscribe",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "Public alias for guest push registration",
  },
  {
    method: "POST",
    path: "/v1/reports",
    timeoutMs: 2000,
    rateLimitClass: "tight",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: true,
    priorityLane: "background",
    degradationBehavior: "Reports abusive twin or content",
  },
  // Signals & Consents (Stage M2 / Phase 10F)
  {
    method: "POST",
    path: "/v1/events",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "background",
    degradationBehavior: "Resource rank 7 shedding: 50% at L1, 100% at L2+",
  },
  {
    method: "GET",
    path: "/v1/consents",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "DPDP consent status retrieval",
  },
  {
    method: "PUT",
    path: "/v1/consents",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "DPDP consent update & taste purge",
  },
  // Meme Lab Routes (Stage M3 / Phase 10G)
  {
    method: "GET",
    path: "/v1/memes/templates",
    timeoutMs: 1500,
    rateLimitClass: "standard",
    cacheControl: "public, max-age=3600",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "Curated meme template catalog",
  },
  {
    method: "POST",
    path: "/v1/memes/submissions",
    timeoutMs: 3000,
    rateLimitClass: "tight",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "Shed at L2+; daily cap 2 per user",
  },
  {
    method: "GET",
    path: "/v1/memes/submissions/mine",
    timeoutMs: 2000,
    rateLimitClass: "standard",
    cacheControl: "private, no-cache, no-store, must-revalidate",
    idempotencyRequired: false,
    priorityLane: "normal",
    degradationBehavior: "Author review of submitted meme captions",
  },
];

/**
 * Returns the policy matching method and route path.
 */
export function getRoutePolicy(method: string, path: string): RoutePolicy | undefined {
  return ROUTE_POLICIES.find(
    (p) => p.method.toUpperCase() === method.toUpperCase() && p.path === path
  );
}

