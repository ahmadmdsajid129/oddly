/**
 * @file metrics.test.ts
 * @package @oddly/api
 *
 * Automated Test Suite for R2.6: Metrics & Prometheus Alert Rules
 * Tests prom-client instrumentation, bearer auth on /metrics, bounded cardinality, and alert rules schema.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { buildServer } from "./server.js";
import { normalizeRoute } from "./metrics.js";

describe("Stage R2.6: Metrics & Alert Rules as Code", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  const DYNAMIC_TEST_TOKEN = `test_metrics_token_${randomUUID()}`;

  beforeAll(async () => {
    process.env.METRICS_BEARER_TOKEN = DYNAMIC_TEST_TOKEN;
    app = await buildServer({ testing: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Production Startup Guard", () => {
    it("fails startup in production environment if METRICS_BEARER_TOKEN is missing", async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevToken = process.env.METRICS_BEARER_TOKEN;

      try {
        process.env.NODE_ENV = "production";
        delete process.env.METRICS_BEARER_TOKEN;

        await expect(buildServer({ testing: true })).rejects.toThrow(
          "METRICS_BEARER_TOKEN environment variable is required in production"
        );
      } finally {
        process.env.NODE_ENV = prevEnv;
        process.env.METRICS_BEARER_TOKEN = prevToken;
      }
    });
  });

  describe("GET /metrics Authentication", () => {
    it("returns 401 UNAUTHORIZED when no Authorization header is provided", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/metrics",
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("UNAUTHORIZED");
    });

    it("returns 401 UNAUTHORIZED when an invalid Bearer token is provided", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/metrics",
        headers: {
          authorization: "Bearer wrong-secret-token",
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it("returns 200 with Prometheus text metrics when valid Bearer token provided", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/metrics",
        headers: {
          authorization: `Bearer ${DYNAMIC_TEST_TOKEN}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain("text/plain");
      expect(res.body).toContain("# HELP oddly_http_requests_total");
      expect(res.body).toContain("# TYPE oddly_http_requests_total counter");
      expect(res.body).toContain("oddly_degradation_level");
      expect(res.body).toContain("oddly_circuit_breaker_state");
    });
  });

  describe("RED Metrics & Route Traffic Collection", () => {
    it("records traffic, status codes, and latency histograms", async () => {
      // 1. Generate traffic to /v1/time
      await app.inject({ method: "GET", url: "/v1/time" });
      await app.inject({ method: "GET", url: "/v1/time" });

      // 2. Scrape metrics
      const res = await app.inject({
        method: "GET",
        url: "/metrics",
        headers: { authorization: `Bearer ${DYNAMIC_TEST_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      // Verify route label is recorded with status code 200
      expect(res.body).toMatch(/oddly_http_requests_total\{method="GET",route="\/v1\/time",status_code="200"\}\s+[1-9]\d*/);
      expect(res.body).toMatch(/oddly_http_request_duration_seconds_bucket\{le=".*",method="GET",route="\/v1\/time",status_code="200"\}/);
    });
  });

  describe("Route Label Cardinality Protection", () => {
    it("normalizes variable and parameterized URLs to bounded route templates", () => {
      // Fake Fastify requests to test normalizeRoute
      const reqDropJson = {
        url: "/v1/drops/123e4567-e89b-12d3-a456-426614174000.json?cache=bust",
        routeOptions: { url: "/v1/drops/:id.json" },
      } as unknown as Parameters<typeof normalizeRoute>[0];

      const reqWorld = {
        url: "/v1/world/some-drop-id-9999",
        routeOptions: { url: "/v1/world/:dropId" },
      } as unknown as Parameters<typeof normalizeRoute>[0];

      const reqShare = {
        url: "/s/customShare123",
        routeOptions: { url: "/s/:shortId" },
      } as unknown as Parameters<typeof normalizeRoute>[0];

      const reqPage = {
        url: "/v1/pages/faq",
        routeOptions: { url: "/v1/pages/:slug" },
      } as unknown as Parameters<typeof normalizeRoute>[0];

      expect(normalizeRoute(reqDropJson)).toBe("/v1/drops/:id.json");
      expect(normalizeRoute(reqWorld)).toBe("/v1/world/:dropId");
      expect(normalizeRoute(reqShare)).toBe("/s/:shortId");
      expect(normalizeRoute(reqPage)).toBe("/v1/pages/:slug");

      // Verify no raw UUID or user ID leaks into the route label
      expect(normalizeRoute(reqDropJson)).not.toContain("123e4567");
    });
  });

  describe("Prometheus Alert Rules Schema Verification", () => {
    it("validates infra/alerts/rules.yml contains all mandatory reliability alerts", () => {
      const alertFilePath = resolve(process.cwd(), "../../infra/alerts/rules.yml");
      const content = readFileSync(alertFilePath, "utf8");

      expect(content).toContain("name: oddly_reliability_alerts");
      expect(content).toContain("alert: EventLoopLagHigh");
      expect(content).toContain("alert: P95SubmitLatencyHigh");
      expect(content).toContain("alert: PostgresPoolExhausted");
      expect(content).toContain("alert: BreakerOpen");
      expect(content).toContain("alert: DefaultPartitionActive");
      expect(content).toContain("alert: HighIdempotencyLockContention");
      expect(content).toContain("alert: EmergencyDegradationLevel");
    });
  });
});
