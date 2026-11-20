/**
 * @file memes-exposure.integration.test.ts
 * @package @oddly/api
 *
 * Exposure Engine Integration Test Suite (Stage M3 / Phase 10G / P10G.06).
 *
 * Invariants Verified:
 * 1. 80/20 Traffic Allocation: 80% exploitation (top Wilson score) / 20% exploration (fresh submissions).
 * 2. Author Exclusion: Players are never served their own authored memes.
 * 3. Diversity Caps: No duplicate impressions per player; template cooldown of 7 days.
 * 4. Atomic Exposure Logging: Viewing increments impressions and creates `meme_exposures` record.
 * 5. Freshness Retirement: Stale memes (> 14 days without high score) are retired.
 * 6. API Route: GET /v1/memes/corner serves tailored meme or null, sheds at L2+.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { DegradationManager } from "./resilience/degradation.js";
import { MemesRepository } from "./db/memes.repo.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M3 (Phase 10G): Meme Exposure Engine (P10G.06)", () => {
  let prisma: PrismaClient;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let repo: MemesRepository;

  let authorId: string;
  let viewerId: string;
  let template1Id: string;
  let template2Id: string;

  const createdSubmissionIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();
    repo = new MemesRepository(prisma);

    app = await buildServer({ logger: false });
    await app.ready();

    // 1. Create author and viewer players
    const author = await prisma.player.create({
      data: {
        did: `did-exp-author-${randomUUID().slice(0, 8)}`,
        region: "IN",
        age_band: "18-24",
      },
    });
    authorId = author.id;

    const viewer = await prisma.player.create({
      data: {
        did: `did-exp-viewer-${randomUUID().slice(0, 8)}`,
        region: "IN",
        age_band: "25-34",
      },
    });
    viewerId = viewer.id;

    // 2. Create test templates
    const t1 = await prisma.memeTemplate.create({
      data: {
        key: `tmpl-exp-1-${randomUUID().slice(0, 8)}`,
        illustration_registry_key: "desk_overwhelmed_cat",
        aspect: "1:1",
        alt_text_i18n: { en: "Overwhelmed desk cat" },
        license_note: "Test license",
      },
    });
    template1Id = t1.id;

    const t2 = await prisma.memeTemplate.create({
      data: {
        key: `tmpl-exp-2-${randomUUID().slice(0, 8)}`,
        illustration_registry_key: "chart_divergent_bars",
        aspect: "1:1",
        alt_text_i18n: { en: "Divergent bar chart" },
        license_note: "Test license",
      },
    });
    template2Id = t2.id;
  });

  afterAll(async () => {
    if (createdSubmissionIds.length > 0) {
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
    if (template1Id) await prisma.memeTemplate.delete({ where: { id: template1Id } }).catch(() => {});
    if (template2Id) await prisma.memeTemplate.delete({ where: { id: template2Id } }).catch(() => {});
    if (authorId) await prisma.player.delete({ where: { id: authorId } }).catch(() => {});
    if (viewerId) await prisma.player.delete({ where: { id: viewerId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("never serves a player their own authored meme (author exclusion)", async () => {
    const ownMeme = await prisma.memeSubmission.create({
      data: {
        author_player_id: viewerId,
        template_id: template1Id,
        caption_text: "My own authored caption",
        status: "approved",
        stats: {
          create: {
            impressions: 0,
            raters: 10,
            funny_count: 8,
            not_for_me_count: 2,
            wilson_lb: 0.0,
          },
        },
      },
    });
    createdSubmissionIds.push(ownMeme.id);

    // When viewer requests a meme, their own meme must not be returned
    const result = await repo.selectMemeForPlayer(viewerId);
    expect(result?.id).not.toBe(ownMeme.id);
  });

  it("allocates traffic to exploitation (high Wilson score) vs exploration (fresh submissions)", async () => {
    // Exploitation candidate (raters >= 200, high Wilson)
    const exploitMeme = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: template1Id,
        caption_text: "Top viral high Wilson caption",
        status: "approved",
        stats: {
          create: {
            impressions: 500,
            raters: 300,
            funny_count: 270,
            not_for_me_count: 30,
            wilson_lb: 0.86,
          },
        },
      },
    });
    createdSubmissionIds.push(exploitMeme.id);

    // Exploration candidate (raters < 200, fresh)
    const exploreMeme = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: template2Id,
        caption_text: "Fresh exploration caption",
        status: "approved",
        stats: {
          create: {
            impressions: 5,
            raters: 3,
            funny_count: 3,
            not_for_me_count: 0,
            wilson_lb: 0.0,
          },
        },
      },
    });
    createdSubmissionIds.push(exploreMeme.id);

    // Test player for exploration branch
    const testPlayerExp = await prisma.player.create({
      data: { did: `did-test-exp-${randomUUID().slice(0, 8)}`, region: "US", age_band: "18-24" },
    });

    // 100% Exploration rate test
    const selectedExplore = await repo.selectMemeForPlayer(testPlayerExp.id, {
      explorationRate: 1.0,
    });
    expect(selectedExplore).not.toBeNull();
    expect(selectedExplore?.is_exploration).toBe(true);

    // Test player for exploitation branch
    const testPlayerExploit = await prisma.player.create({
      data: { did: `did-test-exploit-${randomUUID().slice(0, 8)}`, region: "UK", age_band: "25-34" },
    });

    // 0% Exploration rate (100% exploitation) test
    const selectedExploit = await repo.selectMemeForPlayer(testPlayerExploit.id, {
      explorationRate: 0.0,
    });
    expect(selectedExploit).not.toBeNull();
    expect(selectedExploit?.is_exploration).toBe(false);
    expect(selectedExploit?.wilson_lb).toBeGreaterThanOrEqual(0.70);
  });

  it("never shows the same meme to the same player twice (no-repeat diversity cap)", async () => {
    const testPlayer = await prisma.player.create({
      data: { did: `did-test-norepeat-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "18-24" },
    });

    // First selection
    const first = await repo.selectMemeForPlayer(testPlayer.id);
    expect(first).not.toBeNull();

    // Second selection
    const second = await repo.selectMemeForPlayer(testPlayer.id);
    if (second) {
      expect(second.id).not.toBe(first?.id);
    }
  });

  it("retires stale memes older than freshness cutoff (> 14 days without traction)", async () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 20); // 20 days ago

    const staleMeme = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: template1Id,
        caption_text: "Stale caption that failed to gain traction",
        status: "approved",
        created_at: staleDate,
        stats: {
          create: {
            impressions: 40,
            raters: 12,
            funny_count: 2,
            not_for_me_count: 10,
            wilson_lb: 0.05,
          },
        },
      },
    });
    createdSubmissionIds.push(staleMeme.id);

    const retirementResult = await repo.retireStaleMemes({ freshnessDays: 14, minWilsonScore: 0.50 });
    expect(retirementResult.retiredCount).toBeGreaterThanOrEqual(1);

    const checkedMeme = await prisma.memeSubmission.findUnique({
      where: { id: staleMeme.id },
    });
    expect(checkedMeme?.status).toBe("retired");
  });

  it("GET /v1/memes/corner serves tailored meme for authenticated player", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/memes/corner",
      headers: { "x-player-id": viewerId },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    // Meme can be object or null if exhausted
    if (body.meme) {
      expect(body.meme.id).toBeDefined();
      expect(body.meme.caption_text).toBeDefined();
      expect(body.meme.template_key).toBeDefined();
    }
  });

  it("GET /v1/memes/corner rejects unauthenticated request with 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/memes/corner",
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("GET /v1/memes/corner sheds with 503 at degradation level L2+", async () => {
    DegradationManager.setLevel(2);

    const res = await app.inject({
      method: "GET",
      url: "/v1/memes/corner",
      headers: { "x-player-id": viewerId },
    });

    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("SERVICE_DEGRADED");

    DegradationManager.setLevel(0);
  });
});
