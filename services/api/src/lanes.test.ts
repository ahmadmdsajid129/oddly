/**
 * @file lanes.test.ts
 * @package @oddly/api
 *
 * Comprehensive integration tests for Subject Lanes (Stage L1 / Phase 10L):
 * - GET /v1/lanes with ETags and public caching (P10L.04)
 * - GET /v1/lanes/:id with Gate L-A resting state evaluation (P10L.04, P10L.09)
 * - POST /v1/lanes/:id/interest subscriber tracking & consent checks (P10L.05)
 * - GET & PUT /v1/me/lane-prefs per-lane push opt-ins (P10L.08)
 * - GET /v1/lanes/:id/gate-status runtime runway evaluation (P10L.09)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "./server.js";
import { prisma } from "./db/client.js";

describe("Stage L1: Subject Lanes REST API (P10L.04, P10L.05, P10L.08, P10L.09)", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  let testPlayerId: string;
  let everydayLaneId: string;
  let memesLaneId: string;
  let gamingLaneId: string;

  beforeAll(async () => {
    app = await buildServer({ testing: true });
    await app.ready();

    // 1. Fetch seed lanes
    const everyday = await prisma.lane.findUnique({ where: { slug: "everyday" } });
    const memes = await prisma.lane.findUnique({ where: { slug: "memes" } });
    const gaming = await prisma.lane.findUnique({ where: { slug: "gaming" } });

    expect(everyday).not.toBeNull();
    expect(memes).not.toBeNull();
    expect(gaming).not.toBeNull();

    everydayLaneId = everyday!.id;
    memesLaneId = memes!.id;
    gamingLaneId = gaming!.id;

    // 2. Create test player
    const player = await prisma.player.create({
      data: {
        did: `test_did_lanes_${Date.now()}`,
        region: "IN",
        age_band: "18-24",
      },
    });
    testPlayerId = player.id;
  });

  afterAll(async () => {
    if (testPlayerId) {
      await prisma.playerLanePref.deleteMany({ where: { player_id: testPlayerId } });
      await prisma.laneInterest.deleteMany({ where: { player_id: testPlayerId } });
      await prisma.player.delete({ where: { id: testPlayerId } });
    }
    await app.close();
  });

  describe("GET /v1/lanes (P10L.04)", () => {
    it("returns catalogue of 9 catalog lanes with public cache header and ETag", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/lanes",
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["cache-control"]).toBe("public, max-age=60");
      expect(res.headers["etag"]).toBeDefined();

      const body = JSON.parse(res.body);
      expect(Array.isArray(body.lanes)).toBe(true);
      expect(body.lanes.length).toBeGreaterThanOrEqual(9);

      // Verify Everyday and Memes are open
      const everyday = body.lanes.find((l: { slug: string }) => l.slug === "everyday");
      expect(everyday).toBeDefined();
      expect(everyday.status).toBe("open");
      expect(everyday.accent_token).toBe("violet");

      const memes = body.lanes.find((l: { slug: string }) => l.slug === "memes");
      expect(memes).toBeDefined();
      expect(memes.status).toBe("open");
      expect(memes.accent_token).toBe("sun");

      // Verify planned lanes
      const food = body.lanes.find((l: { slug: string }) => l.slug === "food");
      expect(food).toBeDefined();
      expect(food.status).toBe("planned");
    });

    it("supports conditional 304 Not Modified requests via If-None-Match", async () => {
      const initial = await app.inject({
        method: "GET",
        url: "/v1/lanes",
      });
      const etag = initial.headers["etag"] as string;

      const cached = await app.inject({
        method: "GET",
        url: "/v1/lanes",
        headers: {
          "if-none-match": etag,
        },
      });

      expect(cached.statusCode).toBe(304);
      expect(cached.body).toBe("");
    });
  });

  describe("GET /v1/lanes/:id (P10L.04, P10L.09)", () => {
    it("fetches single lane by slug and by UUID", async () => {
      const bySlug = await app.inject({
        method: "GET",
        url: "/v1/lanes/everyday",
      });
      expect(bySlug.statusCode).toBe(200);
      const b1 = JSON.parse(bySlug.body);
      expect(b1.lane.slug).toBe("everyday");

      const byUuid = await app.inject({
        method: "GET",
        url: `/v1/lanes/${everydayLaneId}`,
      });
      expect(byUuid.statusCode).toBe(200);
      const b2 = JSON.parse(byUuid.body);
      expect(b2.lane.id).toBe(everydayLaneId);
    });

    it("returns 404 for unknown lane", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/lanes/nonexistent-lane-slug",
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("LANE_NOT_FOUND");
    });

    it("evaluates Gate L-A / Rule L9: evaluates resting state when open lane has no drop today", async () => {
      // Create a temporary open lane with no drop today
      const tempLane = await prisma.lane.create({
        data: {
          slug: `temp_lane_${Date.now()}`,
          name_key: "lane.temp.name",
          description_key: "lane.temp.desc",
          accent_token: "mint",
          icon_key: "sparkles",
          status: "open",
        },
      });

      try {
        const res = await app.inject({
          method: "GET",
          url: `/v1/lanes/${tempLane.id}`,
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.lane.status).toBe("resting");
        expect(body.lane.is_resting).toBe(true);
        expect(body.lane.resting_message_key).toBe("lane.resting.message");
        expect(body.lane.current_drop).toBeNull();
      } finally {
        await prisma.lane.delete({ where: { id: tempLane.id } });
      }
    });
  });

  describe("POST /v1/lanes/:id/interest (P10L.05)", () => {
    it("rejects without explicit notification consent (DPDP requirement)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/v1/lanes/${gamingLaneId}/interest`,
        payload: {
          consent_notifications: false,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("CONSENT_REQUIRED");
    });

    it("registers interest for authenticated player and increments count idempotently", async () => {
      const res1 = await app.inject({
        method: "POST",
        url: `/v1/lanes/${gamingLaneId}/interest`,
        headers: {
          "x-player-id": testPlayerId,
        },
        payload: {
          consent_notifications: true,
        },
      });

      expect(res1.statusCode).toBe(201);
      const body1 = JSON.parse(res1.body);
      expect(body1.ok).toBe(true);
      expect(body1.lane_id).toBe(gamingLaneId);
      expect(body1.total_interest).toBeGreaterThanOrEqual(1);

      // Repeated call should succeed idempotently without double-counting
      const res2 = await app.inject({
        method: "POST",
        url: `/v1/lanes/${gamingLaneId}/interest`,
        headers: {
          "x-player-id": testPlayerId,
        },
        payload: {
          consent_notifications: true,
        },
      });

      expect(res2.statusCode).toBe(201);
      const body2 = JSON.parse(res2.body);
      expect(body2.total_interest).toBe(body1.total_interest);
    });

    it("registers interest for guest player with guest_id", async () => {
      const guestId = `guest_${Date.now()}`;
      const res = await app.inject({
        method: "POST",
        url: `/v1/lanes/food/interest`,
        payload: {
          guest_id: guestId,
          consent_notifications: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.registered).toBe(true);
    });
  });

  describe("Player Lane Preferences (P10L.08)", () => {
    it("requires authentication for GET and PUT /v1/me/lane-prefs", async () => {
      const getRes = await app.inject({
        method: "GET",
        url: "/v1/me/lane-prefs",
      });
      expect(getRes.statusCode).toBe(401);

      const putRes = await app.inject({
        method: "PUT",
        url: "/v1/me/lane-prefs",
        payload: { lane_id: memesLaneId, notify: true },
      });
      expect(putRes.statusCode).toBe(401);
    });

    it("returns default ON for Everyday and default OFF for other lanes", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/me/lane-prefs",
        headers: {
          "x-player-id": testPlayerId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(Array.isArray(body.preferences)).toBe(true);

      const evPref = body.preferences.find((p: { lane_slug: string }) => p.lane_slug === "everyday");
      expect(evPref.notify).toBe(true); // Default ON for Everyday per Rule L8

      const memesPref = body.preferences.find((p: { lane_slug: string }) => p.lane_slug === "memes");
      expect(memesPref.notify).toBe(false); // Default OFF for secondary lanes
    });

    it("updates player lane preference idempotently via PUT", async () => {
      // Turn notify ON for Memes lane
      const putRes = await app.inject({
        method: "PUT",
        url: "/v1/me/lane-prefs",
        headers: {
          "x-player-id": testPlayerId,
        },
        payload: {
          lane_id: memesLaneId,
          notify: true,
        },
      });

      expect(putRes.statusCode).toBe(200);
      const putBody = JSON.parse(putRes.body);
      expect(putBody.ok).toBe(true);
      expect(putBody.notify).toBe(true);

      // Verify GET returns updated setting
      const getRes = await app.inject({
        method: "GET",
        url: "/v1/me/lane-prefs",
        headers: {
          "x-player-id": testPlayerId,
        },
      });

      const body = JSON.parse(getRes.body);
      const memesPref = body.preferences.find((p: { lane_slug: string }) => p.lane_slug === "memes");
      expect(memesPref.notify).toBe(true);
    });
  });

  describe("GET /v1/lanes/:id/gate-status (P10L.09)", () => {
    it("evaluates Gate L-A runway drops count against minimum threshold (8)", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/v1/lanes/${everydayLaneId}/gate-status`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.lane_id).toBe(everydayLaneId);
      expect(body.slug).toBe("everyday");
      expect(body.min_required_runway).toBe(8);
      expect(typeof body.approved_future_drops).toBe("number");
      expect(typeof body.has_sufficient_runway).toBe("boolean");
      expect(typeof body.missing_drop_within_24h).toBe("boolean");
      expect(typeof body.gate_l_a_passed).toBe("boolean");
    });
  });
});

