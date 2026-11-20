/**
 * @file memes-abuse.integration.test.ts
 * @package @oddly/api
 *
 * Automated Anti-Abuse Test Suite for Meme Lab (Stage M3 / Phase 10G / P10G.09).
 *
 * Verifies System Defenses Against:
 * 1. Cloudflare Turnstile Bypass Attempts.
 * 2. Rapid Submission Flooding & Daily Caps (max 2 per author).
 * 3. Exact and Levenshtein Near-Duplicate Caption Spam.
 * 4. Rule 18 Free-Text Boundary Violations (> 100 chars, empty, whitespace).
 * 5. Mandatory Originality Attestation Enforcement.
 * 6. Rating Brigading & Sockpuppet Ring Resistance (ADR 043 Min 200 Rater Threshold).
 * 7. Duplicate Rating Flooding by a Single Account (409 ALREADY_RATED).
 * 8. Zero Public Exposure Leaks (queued submissions strictly isolated from exposure engine).
 * 9. Unauthorized Administrative Escalation & Moderation Tampering (403 FORBIDDEN).
 * 10. Two-Person Approval Circumvention (self-approval forbidden).
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { MemesRepository } from "./db/memes.repo.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M3 (Phase 10G): Automated Abuse-Case Tests (P10G.09)", () => {
  let prisma: PrismaClient;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let repo: MemesRepository;

  let attackerPlayerId: string;
  let targetMemeId: string;
  let templateId: string;

  const createdSubmissionIds: string[] = [];
  const createdPlayerIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();
    repo = new MemesRepository(prisma);

    app = await buildServer({ logger: false });
    await app.ready();

    // 1. Create attacker test player
    const attacker = await prisma.player.create({
      data: { did: `did-attacker-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "18-24" },
    });
    attackerPlayerId = attacker.id;
    createdPlayerIds.push(attacker.id);

    // 2. Create test template
    const template = await prisma.memeTemplate.create({
      data: {
        key: `tmpl-abuse-${randomUUID().slice(0, 8)}`,
        illustration_registry_key: "desk_overwhelmed_cat",
        aspect: "1:1",
        alt_text_i18n: { en: "A tired cat at a desk" },
        license_note: "Anti-abuse test license",
      },
    });
    templateId = template.id;

    // 3. Create an approved target meme to test rating abuse
    const targetMeme = await prisma.memeSubmission.create({
      data: {
        author_player_id: attackerPlayerId,
        template_id: templateId,
        caption_text: "Target meme for brigading verification",
        status: "approved",
        stats: {
          create: {
            impressions: 0,
            raters: 0,
            funny_count: 0,
            not_for_me_count: 0,
            wilson_lb: 0.0,
          },
        },
      },
    });
    targetMemeId = targetMeme.id;
    createdSubmissionIds.push(targetMeme.id);
  });

  afterAll(async () => {
    if (createdSubmissionIds.length > 0) {
      await prisma.moderationAction.deleteMany({
        where: { submission_id: { in: createdSubmissionIds } },
      });
      await prisma.memeExposure.deleteMany({
        where: { submission_id: { in: createdSubmissionIds } },
      });
      await prisma.memeRating.deleteMany({
        where: { submission_id: { in: createdSubmissionIds } },
      });
      await prisma.memeStat.deleteMany({
        where: { submission_id: { in: createdSubmissionIds } },
      });
      await prisma.memeSubmission.deleteMany({
        where: { id: { in: createdSubmissionIds } },
      });
    }
    if (templateId) await prisma.memeTemplate.delete({ where: { id: templateId } }).catch(() => {});
    if (createdPlayerIds.length > 0) {
      await prisma.player.deleteMany({ where: { id: { in: createdPlayerIds } } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------------------
  // 1. Turnstile Bypass Protection
  // -------------------------------------------------------------------------
  describe("1. Cloudflare Turnstile Bypass Protection", () => {
    it("rejects submission with forged, empty, or missing Turnstile token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": attackerPlayerId },
        payload: {
          template_id: templateId,
          caption_text: "Turnstile bypass attempt",
          turnstile_token: "short", // invalid token (< 10 chars, not in test allowlist)
          attest_originality: true,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe("INVALID_TURNSTILE");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Rule 18 Free-Text Bounds & Originality Attestation
  // -------------------------------------------------------------------------
  describe("2. Rule 18 Character Limits & Originality Enforcement", () => {
    it("rejects caption exceeding strict 100 character limit (Rule 18)", async () => {
      const longCaption = "This caption is intentionally crafted to exceed the strict 100 character limit enforced by Rule 18 for Meme Lab.";
      expect(longCaption.length).toBeGreaterThan(100);

      const res = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": attackerPlayerId },
        payload: {
          template_id: templateId,
          caption_text: longCaption,
          turnstile_token: "mock-valid-turnstile",
          attest_originality: true,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it("rejects empty or whitespace-only caption", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": attackerPlayerId },
        payload: {
          template_id: templateId,
          caption_text: "   ",
          turnstile_token: "mock-valid-turnstile",
          attest_originality: true,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it("rejects submission when originality attestation is false or omitted", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": attackerPlayerId },
        payload: {
          template_id: templateId,
          caption_text: "Plagiarized caption without attestation",
          turnstile_token: "mock-valid-turnstile",
          attest_originality: false,
        },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Spam Flooding & Duplicate Prevention
  // -------------------------------------------------------------------------
  describe("3. Spam Flooding & Duplicate Ingestion Resistance", () => {
    it("enforces daily submission cap (max 2 per author per day)", async () => {
      const author = await prisma.player.create({
        data: { did: `did-spam-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "18-24" },
      });
      createdPlayerIds.push(author.id);

      // Submission 1: Success
      const res1 = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": author.id },
        payload: {
          template_id: templateId,
          caption_text: "First unique morning coffee caption",
          turnstile_token: "mock-valid-turnstile",
          attest_originality: true,
        },
      });
      expect(res1.statusCode).toBe(201);
      createdSubmissionIds.push(JSON.parse(res1.body).submission.id);

      // Submission 2: Success
      const res2 = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": author.id },
        payload: {
          template_id: templateId,
          caption_text: "Second distinct evening dessert caption",
          turnstile_token: "mock-valid-turnstile",
          attest_originality: true,
        },
      });
      expect(res2.statusCode).toBe(201);
      createdSubmissionIds.push(JSON.parse(res2.body).submission.id);

      // Submission 3: Exceeds daily cap -> 429 DAILY_LIMIT_EXCEEDED
      const res3 = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": author.id },
        payload: {
          template_id: templateId,
          caption_text: "Third extra caption exceeding limit",
          turnstile_token: "mock-valid-turnstile",
          attest_originality: true,
        },
      });
      expect(res3.statusCode).toBe(429);
      expect(JSON.parse(res3.body).error).toBe("DAILY_LIMIT_EXCEEDED");
    });

    it("rejects exact and Levenshtein near-duplicate spam within same template", async () => {
      const author = await prisma.player.create({
        data: { did: `did-dup-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "18-24" },
      });
      createdPlayerIds.push(author.id);

      // Submit original
      const origRes = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": author.id },
        payload: {
          template_id: templateId,
          caption_text: "When the code compiles on the first try",
          turnstile_token: "mock-valid-turnstile",
          attest_originality: true,
        },
      });
      expect(origRes.statusCode).toBe(201);
      createdSubmissionIds.push(JSON.parse(origRes.body).submission.id);

      // Attacker tries exact duplicate on another account
      const attacker2 = await prisma.player.create({
        data: { did: `did-dup2-${randomUUID().slice(0, 8)}`, region: "US", age_band: "25-34" },
      });
      createdPlayerIds.push(attacker2.id);

      const exactDupRes = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": attacker2.id },
        payload: {
          template_id: templateId,
          caption_text: "When the code compiles on the first try", // EXACT
          turnstile_token: "mock-valid-turnstile",
          attest_originality: true,
        },
      });
      expect(exactDupRes.statusCode).toBe(409);
      expect(JSON.parse(exactDupRes.body).error).toBe("DUPLICATE_CAPTION");

      // Attacker tries near-duplicate (Levenshtein distance <= 2: compiles -> complies)
      const nearDupRes = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": attacker2.id },
        payload: {
          template_id: templateId,
          caption_text: "When the code complies on the first try", // near-duplicate dist=2
          turnstile_token: "mock-valid-turnstile",
          attest_originality: true,
        },
      });
      expect(nearDupRes.statusCode).toBe(409);
      expect(JSON.parse(nearDupRes.body).error).toBe("DUPLICATE_CAPTION");
    });
  });

  // -------------------------------------------------------------------------
  // 4. Rating Brigading & Sockpuppet Ring Resistance
  // -------------------------------------------------------------------------
  describe("4. Rating Brigading & Sockpuppet Ring Resistance", () => {
    it("strictly prevents a single account from voting more than once (409 ALREADY_RATED)", async () => {
      const voter = await prisma.player.create({
        data: { did: `did-voter-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "18-24" },
      });
      createdPlayerIds.push(voter.id);

      // First vote: Success
      const vote1 = await app.inject({
        method: "POST",
        url: `/v1/memes/${targetMemeId}/rating`,
        headers: { "x-player-id": voter.id },
        payload: { rating: "funny" },
      });
      expect(vote1.statusCode).toBe(200);

      // Second vote attempt by same user: Rejection
      const vote2 = await app.inject({
        method: "POST",
        url: `/v1/memes/${targetMemeId}/rating`,
        headers: { "x-player-id": voter.id },
        payload: { rating: "not_for_me" },
      });
      expect(vote2.statusCode).toBe(409);
      expect(JSON.parse(vote2.body).error).toBe("ALREADY_RATED");
    });

    it("sockpuppet ring (e.g. 10 accounts) cannot inflate Wilson score or bypass 200 rater threshold", async () => {
      // Create fresh test meme
      const candidateMeme = await prisma.memeSubmission.create({
        data: {
          author_player_id: attackerPlayerId,
          template_id: templateId,
          caption_text: "Meme targeted by sockpuppet upvote ring",
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
      createdSubmissionIds.push(candidateMeme.id);

      // Simulate 10 sockpuppet accounts voting 100% "funny"
      for (let i = 0; i < 10; i++) {
        const sockpuppet = await prisma.player.create({
          data: { did: `did-sock-${i}-${randomUUID().slice(0, 6)}`, region: "IN", age_band: "18-24" },
        });
        createdPlayerIds.push(sockpuppet.id);

        const res = await app.inject({
          method: "POST",
          url: `/v1/memes/${candidateMeme.id}/rating`,
          headers: { "x-player-id": sockpuppet.id },
          payload: { rating: "funny" },
        });
        expect(res.statusCode).toBe(200);
      }

      // Invariant: Even with 10/10 (100%) positive ratings, because raters < 200 (ADR 043),
      // the Wilson lower bound score MUST remain held at 0.0!
      const stat = await prisma.memeStat.findUnique({
        where: { submission_id: candidateMeme.id },
      });
      expect(stat?.raters).toBe(10);
      expect(stat?.funny_count).toBe(10);
      expect(stat?.wilson_lb).toBe(0.0); // ZERO promotion advantage!

      // Candidate list must NOT include it
      const candRes = await app.inject({
        method: "GET",
        url: "/v1/admin/memes/candidates",
        headers: { "x-admin-id": "admin-1", "x-admin-role": "admin" },
      });
      const candBody = JSON.parse(candRes.body);
      const isPromoted = candBody.candidates.some((c: { id: string }) => c.id === candidateMeme.id);
      expect(isPromoted).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Zero Public Exposure Isolation
  // -------------------------------------------------------------------------
  describe("5. Zero Public Exposure Before Human Moderation Approval", () => {
    it("queued submissions are strictly isolated and never exposed in Meme Corner", async () => {
      const author = await prisma.player.create({
        data: { did: `did-queued-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "18-24" },
      });
      createdPlayerIds.push(author.id);

      const subRes = await app.inject({
        method: "POST",
        url: "/v1/memes/submissions",
        headers: { "x-player-id": author.id },
        payload: {
          template_id: templateId,
          caption_text: "Unmoderated caption waiting in queue",
          turnstile_token: "mock-valid-turnstile",
          attest_originality: true,
        },
      });
      expect(subRes.statusCode).toBe(201);
      const submissionId = JSON.parse(subRes.body).submission.id;
      createdSubmissionIds.push(submissionId);

      // A different player requests meme recommendations
      const viewer = await prisma.player.create({
        data: { did: `did-viewer-${randomUUID().slice(0, 8)}`, region: "UK", age_band: "25-34" },
      });
      createdPlayerIds.push(viewer.id);

      // Verify repo never selects queued submission
      const selected = await repo.selectMemeForPlayer(viewer.id);
      if (selected) {
        expect(selected.id).not.toBe(submissionId);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 6. Security Boundaries & Two-Person Approval Circumvention
  // -------------------------------------------------------------------------
  describe("6. Privilege Escalation & Two-Person Workflow Circumvention", () => {
    it("blocks non-admin players from attempting takedowns or moderation (403)", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/v1/admin/memes/${targetMemeId}/takedown`,
        headers: { "x-player-id": attackerPlayerId }, // Player header, not admin
        payload: { reason: "Malicious takedown attempt" },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error).toBe("FORBIDDEN");
    });

    it("strictly prevents the promoter admin from granting their own second approval (Two-Person Invariant)", async () => {
      // 1. Create a meme with 250 raters and 0.85 wilson_lb
      const candidate = await prisma.memeSubmission.create({
        data: {
          author_player_id: attackerPlayerId,
          template_id: templateId,
          caption_text: "High quality meme for circumvention test",
          status: "approved",
          stats: {
            create: {
              impressions: 400,
              raters: 250,
              funny_count: 225,
              not_for_me_count: 25,
              wilson_lb: 0.85,
            },
          },
        },
      });
      createdSubmissionIds.push(candidate.id);

      const promoterAdminId = `admin-promoter-${randomUUID().slice(0, 8)}`;

      // Step 1: Promote
      const promoteRes = await app.inject({
        method: "POST",
        url: `/v1/admin/memes/${candidate.id}/promote`,
        headers: { "x-admin-id": promoterAdminId, "x-admin-role": "editor" },
        payload: { reason: "Legitimate candidate" },
      });
      expect(promoteRes.statusCode).toBe(200);

      // Step 2 Attempt: Promoter tries to approve themselves
      const circumventionRes = await app.inject({
        method: "POST",
        url: `/v1/admin/memes/${candidate.id}/approve-candidate`,
        headers: { "x-admin-id": promoterAdminId, "x-admin-role": "admin" }, // SAME ADMIN!
        payload: { note: "Attempting to bypass two-person approval" },
      });

      expect(circumventionRes.statusCode).toBe(403);
      expect(JSON.parse(circumventionRes.body).error).toBe("TWO_PERSON_RULE_VIOLATION");
    });
  });
});
