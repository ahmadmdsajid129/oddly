/**
 * @file server.test.ts
 * @package @oddly/api
 *
 * Integration test suite for Oddly Fastify REST API (P3.10).
 * Covers:
 *   - Health & Swagger documentation
 *   - Security headers & Correlation IDs
 *   - Zod validation error formatting
 *   - Guest identity registration & cookies
 *   - Submissions schema enforcement
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("Oddly API Server Integration Tests", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  describe("System & Documentation Endpoints", () => {
    it("GET /health returns 200 with service metadata", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.service).toBe("oddly-api");
      expect(body.version).toBeDefined();
    });

    it("GET /docs returns 200 with Swagger UI documentation", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/docs",
      });

      // Redirect or HTML response
      expect([200, 301, 302]).toContain(res.statusCode);
    });

    it("GET /docs/json returns OpenAPI schema JSON", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/docs/json",
      });

      expect(res.statusCode).toBe(200);
      const schema = JSON.parse(res.body);
      expect(schema.openapi).toBeDefined();
      expect(schema.info.title).toBe("Oddly REST API");
      expect(schema.paths["/v1/drop/today"]).toBeDefined();
      expect(schema.paths["/v1/submissions"]).toBeDefined();
    });
  });

  describe("Security Headers & Request Tracing", () => {
    it("propagates client x-request-id header in response", async () => {
      const traceId = "test-custom-trace-id-12345";
      const res = await app.inject({
        method: "GET",
        url: "/health",
        headers: {
          "x-request-id": traceId,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["x-request-id"]).toBe(traceId);
    });

    it("sets security headers from Helmet", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    });
  });

  describe("Zod Validation & Error Handling", () => {
    it("returns structured 400 for invalid body schema", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/identity/guest",
        payload: {
          did: "too-short", // min length 16 required
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe("Bad Request");
      expect(body.message).toContain("16");
    });

    it("enforces exactly 5 answers on POST /v1/submissions", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/submissions",
        payload: {
          drop_id: "123e4567-e89b-12d3-a456-426614174000",
          player_id: "123e4567-e89b-12d3-a456-426614174001",
          request_id: "client-idempotency-key-12345",
          answers: [
            // Only 1 answer provided instead of 5
            {
              type: "text",
              question_id: "123e4567-e89b-12d3-a456-426614174002",
              value: "option_a",
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.statusCode).toBe(400);
      expect(body.message).toContain("Must submit exactly 5 answers");
    });
  });

  describe("Identity Session Cookies", () => {
    it("GET /v1/me returns unauthenticated when no session cookie present", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/me",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.authenticated).toBe(false);
      expect(body.player_id).toBeNull();
    });
  });
});
