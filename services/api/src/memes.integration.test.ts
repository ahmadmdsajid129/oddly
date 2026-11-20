/**
 * @file memes.integration.test.ts
 * @package @oddly/api
 *
 * Meme Lab Submission API Integration Suite (Stage M3 / Phase 10G / Task P10G.02).
 *
 * Invariants Verified:
 * 1. Rule 18 Scoped Free-Text Exception: strictly enforced <= 100 chars; rejects > 100.
 * 2. Mandatory Originality Attestation: rejects if attest_originality !== true.
 * 3. Human Verification: validates Cloudflare Turnstile token.
 * 4. Zero Public Exposure: status is strictly initialized to 'queued'.
 * 5. Duplicate Protection: rejects exact and Levenshtein near-duplicate captions within template.
 * 6. Rate Limit Protection: daily submission cap (max 2 per author per day).
 * 7. Load Shedding: returns 503 under degradation level L2+.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { DegradationManager } from "./resilience/degradation.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M3 (Phase 10G): Meme Lab Submission API Integration Suite (P10G.02)", () => {
  let prisma: PrismaClient;
  let app: Awaited<ReturnType<typeof buildServer>>;

  let playerId: string;
  let deviceId: string;
  let templateId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();

    app = await buildServer({ logger: false });
    await app.ready();

    // 1. Create test player
    deviceId = `did-memelab-${randomUUID().slice(0, 8)}`;
    const player = await prisma.player.create({
      data: {
        did: deviceId,
        region: "IN",
        age_band: "18-24",
      },
    });
    playerId = player.id;

    // 2. Ensure active test meme template
    const templateKey = `tmpl-test-${randomUUID().slice(0, 8)}`;
    const template = await prisma.memeTemplate.create({
      data: {
        key: templateKey,
        illustration_registry_key: "desk_overwhelmed_cat",
        aspect: "1:1",
        alt_text_i18n: { en: "A tired cat looking at a blank spreadsheet" },
        license_note: "Oddly original sticker art",
        status: "active",
      },
    });
    templateId = template.id;
  });

  afterAll(async () => {
    try {
      DegradationManager.setLevel(0);
      await prisma.memeSubmission.deleteMany({ where: { author_player_id: playerId } });
      await prisma.memeTemplate.delete({ where: { id: templateId } });
      await prisma.player.delete({ where: { id: playerId } });
      await prisma.$disconnect();
    } catch {}
  });

  it("GET /v1/memes/templates returns list of active templates", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/memes/templates",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.templates)).toBe(true);
    const found = body.templates.find((t: { id: string }) => t.id === templateId);
    expect(found).toBeDefined();
    expect(found.illustration_registry_key).toBe("desk_overwhelmed_cat");
  });

  it("POST /v1/memes/submissions rejects unauthenticated requests with 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/memes/submissions",
      payload: {
        template_id: templateId,
        caption_text: "Monday morning with no coffee",
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("POST /v1/memes/submissions rejects invalid Turnstile challenge with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/memes/submissions",
      headers: { "x-player-id": playerId },
      payload: {
        template_id: templateId,
        caption_text: "Monday morning with no coffee",
        turnstile_token: "",
        attest_originality: true,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("POST /v1/memes/submissions enforces Rule 18 (rejects captions > 100 characters)", async () => {
    const longCaption = "This caption is deliberately engineered to be excessively verbose and exceed the strict one hundred character limit imposed by Rule 18.";
    expect(longCaption.length).toBeGreaterThan(100);

    const res = await app.inject({
      method: "POST",
      url: "/v1/memes/submissions",
      headers: { "x-player-id": playerId },
      payload: {
        template_id: templateId,
        caption_text: longCaption,
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("POST /v1/memes/submissions rejects without originality attestation", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/memes/submissions",
      headers: { "x-player-id": playerId },
      payload: {
        template_id: templateId,
        caption_text: "Staring at the terminal wondering why it works",
        turnstile_token: "mock-valid-turnstile",
        attest_originality: false,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("POST /v1/memes/submissions creates submission with status 'queued' and initializes stats", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/memes/submissions",
      headers: { "x-player-id": playerId },
      payload: {
        template_id: templateId,
        caption_text: "When the code compiles on the first try",
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.submission.status).toBe("queued");
    expect(body.submission.caption_text).toBe("When the code compiles on the first try");

    // Verify DB stats initialization
    const stat = await prisma.memeStat.findUnique({
      where: { submission_id: body.submission.id },
    });
    expect(stat).toBeDefined();
    expect(stat?.raters).toBe(0);
    expect(stat?.wilson_lb).toBe(0.0);
  });

  it("POST /v1/memes/submissions detects and rejects duplicate captions for same template with 409", async () => {
    // Exact duplicate attempt
    const resExact = await app.inject({
      method: "POST",
      url: "/v1/memes/submissions",
      headers: { "x-player-id": playerId },
      payload: {
        template_id: templateId,
        caption_text: "  when the code compiles on the first try!  ",
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      },
    });

    expect(resExact.statusCode).toBe(409);
    const bodyExact = JSON.parse(resExact.body);
    expect(bodyExact.error).toBe("DUPLICATE_CAPTION");

    // Near duplicate attempt (Levenshtein distance <= 2)
    const resNear = await app.inject({
      method: "POST",
      url: "/v1/memes/submissions",
      headers: { "x-player-id": playerId },
      payload: {
        template_id: templateId,
        caption_text: "When the code compls on the first try",
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      },
    });

    expect(resNear.statusCode).toBe(409);
    const bodyNear = JSON.parse(resNear.body);
    expect(bodyNear.error).toBe("DUPLICATE_CAPTION");
  });

  it("POST /v1/memes/submissions accepts second distinct submission up to daily cap of 2", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/memes/submissions",
      headers: { "x-player-id": playerId },
      payload: {
        template_id: templateId,
        caption_text: "Second distinct caption for afternoon tea",
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      },
    });

    expect(res.statusCode).toBe(201);
  });

  it("POST /v1/memes/submissions enforces daily submission cap of 2 with 429", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/memes/submissions",
      headers: { "x-player-id": playerId },
      payload: {
        template_id: templateId,
        caption_text: "Third attempt exceeding daily cap",
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      },
    });

    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("DAILY_LIMIT_EXCEEDED");
  });

  it("GET /v1/memes/submissions/mine lists author submissions", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/memes/submissions/mine",
      headers: { "x-player-id": playerId },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.submissions.length).toBe(2);
    expect(body.submissions[0].status).toBe("queued");
  });

  it("POST /v1/memes/submissions sheds with 503 at degradation level L2+", async () => {
    DegradationManager.setLevel(2);

    const res = await app.inject({
      method: "POST",
      url: "/v1/memes/submissions",
      headers: { "x-player-id": playerId },
      payload: {
        template_id: templateId,
        caption_text: "Degraded attempt",
        turnstile_token: "mock-valid-turnstile",
        attest_originality: true,
      },
    });

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("SERVICE_DEGRADED");

    DegradationManager.setLevel(0);
  });

  describe("P10G.05: Rating Ingestion API (POST /v1/memes/:id/rating)", () => {
    let testSubmissionId: string;
    let raterPlayerId: string;

    beforeAll(async () => {
      // Create a test submission to rate
      const sub = await prisma.memeSubmission.create({
        data: {
          author_player_id: playerId,
          template_id: templateId,
          caption_text: "Caption to test rating ingestion",
          status: "approved",
          stats: {
            create: {
              impressions: 10,
              raters: 0,
              funny_count: 0,
              not_for_me_count: 0,
              wilson_lb: 0.0,
            },
          },
        },
      });
      testSubmissionId = sub.id;

      // Create a rater player
      const rater = await prisma.player.create({
        data: {
          did: `did-rater-${randomUUID().slice(0, 8)}`,
          region: "IN",
          age_band: "18-24",
        },
      });
      raterPlayerId = rater.id;
    });

    it("rejects unauthenticated rating request with 401", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/v1/memes/${testSubmissionId}/rating`,
        payload: { rating: "funny" },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("UNAUTHORIZED");
    });

    it("rejects invalid rating option with 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/v1/memes/${testSubmissionId}/rating`,
        headers: { "x-player-id": raterPlayerId },
        payload: { rating: "hilarious" },
      });

      expect(res.statusCode).toBe(400);
    });

    it("returns 404 when rating non-existent meme", async () => {
      const missingId = randomUUID();
      const res = await app.inject({
        method: "POST",
        url: `/v1/memes/${missingId}/rating`,
        headers: { "x-player-id": raterPlayerId },
        payload: { rating: "funny" },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("MEME_NOT_FOUND");
    });

    it("successfully ingests valid 'funny' rating and updates stats", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/v1/memes/${testSubmissionId}/rating`,
        headers: { "x-player-id": raterPlayerId },
        payload: { rating: "funny" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.submission_id).toBe(testSubmissionId);
      expect(body.rating).toBe("funny");
      expect(body.raters).toBe(1);
      // Under 200 raters, wilson_lb must be 0.0 per ADR 043
      expect(body.wilson_lb).toBe(0.0);

      // Verify DB persistence
      const savedStat = await prisma.memeStat.findUnique({
        where: { submission_id: testSubmissionId },
      });
      expect(savedStat?.raters).toBe(1);
      expect(savedStat?.funny_count).toBe(1);
      expect(savedStat?.not_for_me_count).toBe(0);
    });

    it("rejects duplicate rating by same player with 409 ALREADY_RATED", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/v1/memes/${testSubmissionId}/rating`,
        headers: { "x-player-id": raterPlayerId },
        payload: { rating: "not_for_me" },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("ALREADY_RATED");
    });

    it("sheds rating ingestion with 503 at degradation level L2+", async () => {
      DegradationManager.setLevel(2);

      const anotherPlayer = await prisma.player.create({
        data: {
          did: `did-rater-deg-${randomUUID().slice(0, 8)}`,
          region: "IN",
          age_band: "18-24",
        },
      });

      const res = await app.inject({
        method: "POST",
        url: `/v1/memes/${testSubmissionId}/rating`,
        headers: { "x-player-id": anotherPlayer.id },
        payload: { rating: "funny" },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("SERVICE_DEGRADED");

      DegradationManager.setLevel(0);
    });
  });
});
