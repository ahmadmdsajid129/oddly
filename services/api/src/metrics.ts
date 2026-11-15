/**
 * @file metrics.ts
 * @package @oddly/api
 *
 * Prometheus metrics instrumentation via prom-client (R2.6)
 * Collects RED golden signals, database pool, cache, circuit breakers, degradation level, and shed requests.
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import client, { Registry } from "prom-client";
import { breakerRegistry } from "./resilience/circuit-breakers.js";
import { DegradationManager } from "./resilience/degradation.js";

export const metricsRegistry = new Registry();

// Add default node process / runtime metrics
client.collectDefaultMetrics({
  register: metricsRegistry,
  prefix: "oddly_",
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2],
});

// ---------------------------------------------------------------------------
// 1. RED Metrics per route
// ---------------------------------------------------------------------------

export const httpRequestsTotal = new client.Counter({
  name: "oddly_http_requests_total",
  help: "Total count of HTTP requests handled by the API",
  labelNames: ["method", "route", "status_code"],
  registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: "oddly_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const httpRequestsInFlight = new client.Gauge({
  name: "oddly_http_requests_in_flight",
  help: "Number of HTTP requests currently being handled",
  labelNames: ["method", "route"],
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// 2. Database Pool Metrics
// ---------------------------------------------------------------------------

export const dbPoolConnectionsInUse = new client.Gauge({
  name: "oddly_db_pool_connections_in_use",
  help: "Number of active connections currently leased from the Postgres pool",
  registers: [metricsRegistry],
});

export const dbPoolConnectionsWaiting = new client.Gauge({
  name: "oddly_db_pool_connections_waiting",
  help: "Number of clients currently blocked waiting for a Postgres connection",
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// 3. Cache & Resilience Metrics
// ---------------------------------------------------------------------------

export const cacheOperationsTotal = new client.Counter({
  name: "oddly_cache_operations_total",
  help: "Redis cache operations by type and result (hit, miss, stale)",
  labelNames: ["operation", "result"],
  registers: [metricsRegistry],
});

export const circuitBreakerState = new client.Gauge({
  name: "oddly_circuit_breaker_state",
  help: "Circuit breaker status (0 = CLOSED, 1 = HALF_OPEN, 2 = OPEN)",
  labelNames: ["name"],
  registers: [metricsRegistry],
});

export const circuitBreakerFailuresTotal = new client.Counter({
  name: "oddly_circuit_breaker_failures_total",
  help: "Total circuit breaker failure count",
  labelNames: ["name"],
  registers: [metricsRegistry],
});

export const circuitBreakerFallbacksTotal = new client.Counter({
  name: "oddly_circuit_breaker_fallbacks_total",
  help: "Total number of fallback executions invoked by circuit breakers",
  labelNames: ["name"],
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// 4. Degradation & Shedding
// ---------------------------------------------------------------------------

export const degradationLevelGauge = new client.Gauge({
  name: "oddly_degradation_level",
  help: "Current system degradation ladder level (0 = L0 Normal to 4 = L4 Read-Only)",
  registers: [metricsRegistry],
});

export const shedRequestsTotal = new client.Counter({
  name: "oddly_shed_requests_total",
  help: "Total requests shed or rejected due to degradation or overload",
  labelNames: ["route", "reason"],
  registers: [metricsRegistry],
});

export const idempotencyConflictsTotal = new client.Counter({
  name: "oddly_idempotency_conflicts_total",
  help: "Total 409 CONCURRENT_REQUEST or duplicate submission lock contentions",
  labelNames: ["route"],
  registers: [metricsRegistry],
});

export const defaultPartitionRowsTotal = new client.Counter({
  name: "oddly_default_partition_rows_total",
  help: "Number of rows routed to DEFAULT unpartitioned fallback tables (alert trigger)",
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// Route Cardinality Normalization Guard
// ---------------------------------------------------------------------------

/**
 * Normalizes route path to parameterized form to guarantee bounded metric cardinality.
 * Never leaks raw IDs, UUIDs, or dynamic URL segments.
 */
export function normalizeRoute(req: FastifyRequest): string {
  if (req.routeOptions && req.routeOptions.url) {
    return req.routeOptions.url;
  }
  // Fallback pattern matching for common routes if routeOptions not attached yet
  const url = req.url.split("?")[0] || "/";
  if (url.startsWith("/v1/drops/") && url.endsWith(".json")) {
    return "/v1/drops/:id.json";
  }
  if (url.startsWith("/v1/world/")) {
    return "/v1/world/:dropId";
  }
  if (url.startsWith("/s/")) {
    return "/s/:shortId";
  }
  if (url.startsWith("/v1/pages/")) {
    return "/v1/pages/:slug";
  }
  return url;
}

// ---------------------------------------------------------------------------
// Register Metrics Hooks and Route on Fastify App
// ---------------------------------------------------------------------------

const startTimeSym = Symbol("oddly_req_start_time");

export function registerMetrics(app: FastifyInstance) {
  // onRequest Hook: track in-flight requests and start time
  app.addHook("onRequest", async (req: FastifyRequest) => {
    (req as unknown as Record<symbol, bigint>)[startTimeSym] = process.hrtime.bigint();
    const route = normalizeRoute(req);
    httpRequestsInFlight.inc({ method: req.method, route });
  });

  // onResponse Hook: record latency histogram, RED counters
  app.addHook("onResponse", async (req: FastifyRequest, reply: FastifyReply) => {
    const route = normalizeRoute(req);
    httpRequestsInFlight.dec({ method: req.method, route });

    const startNs = (req as unknown as Record<symbol, bigint>)[startTimeSym] as bigint | undefined;
    if (startNs) {
      const elapsedNs = Number(process.hrtime.bigint() - startNs);
      const durationSec = elapsedNs / 1e9;
      const statusCode = String(reply.statusCode);

      httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });
      httpRequestDurationSeconds.observe({ method: req.method, route, status_code: statusCode }, durationSec);

      if (reply.statusCode === 409) {
        idempotencyConflictsTotal.inc({ route });
      }
      if (reply.statusCode === 503) {
        shedRequestsTotal.inc({ route, reason: "DEGRADATION_OVERLOAD" });
      }
    }
  });

  // Fail startup in production if METRICS_BEARER_TOKEN is missing
  if (process.env.NODE_ENV === "production" && !process.env.METRICS_BEARER_TOKEN) {
    throw new Error(
      "[Metrics] METRICS_BEARER_TOKEN environment variable is required in production. Startup aborted."
    );
  }

  // Bearer-protected GET /metrics endpoint
  app.get("/metrics", async (req, reply) => {
    const expectedToken = process.env.METRICS_BEARER_TOKEN;
    if (!expectedToken) {
      reply.status(503).send({
        error: "METRICS_TOKEN_NOT_CONFIGURED",
        message: "METRICS_BEARER_TOKEN environment variable is not configured.",
      });
      return reply;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      reply.status(401).send({
        error: "UNAUTHORIZED",
        message: "Invalid or missing metrics bearer token",
      });
      return reply;
    }

    // Refresh dynamic resilience metrics before scrape
    const level = await DegradationManager.getLevel();
    degradationLevelGauge.set(level);

    const snapshots = breakerRegistry.getAllSnapshots();
    for (const snap of snapshots) {
      let stateVal = 0;
      if (snap.state === "OPEN") stateVal = 2;
      else if (snap.state === "HALF_OPEN") stateVal = 1;
      circuitBreakerState.set({ name: snap.name }, stateVal);
    }

    reply.header("Content-Type", metricsRegistry.contentType);
    return reply.send(await metricsRegistry.metrics());
  });
}
