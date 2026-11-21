/**
 * @file creator-badge.test.ts
 * @package @oddly/worker
 *
 * Unit & Integration tests for CreatorBadgeJob (Stage M5 & M6 / Phase 10I / P10I.04).
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "./db.js";
import { CreatorBadgeJob } from "./jobs/creator-badge.job.js";
import { randomUUID } from "node:crypto";

describe("Stage M5 & M6: Creator Badge Award Worker Tests", () => {
  const authorPlayerId = `test_author_${randomUUID().slice(0, 8)}`;
  const authorDid = `did_${authorPlayerId}`;

  let certifiedWitBadgeId = "";
  let absurdInstinctBadgeId = "";
  let prolificCreatorBadgeId = "";
  let templateId = "";

  beforeAll(async () => {
    // Create test player
    await prisma.player.create({
      data: {
        id: authorPlayerId,
        did: authorDid,
        region: "IN",
        age_band: "25-34",
      },
    });

    // Ensure badge definitions exist
    let certBadge = await prisma.badgeDefinition.findUnique({
      where: { key: "certified_wit" },
    });
    if (!certBadge) {
      certBadge = await prisma.badgeDefinition.create({
        data: {
          key: "certified_wit",
          name_i18n: { en: "Certified Wit" },
          description_i18n: { en: "70%+ Funny across 500+ raters" },
          icon_key: "badge_certified_wit",
          benchmark_config: { min_raters: 500, min_funny_pct: 70, min_wilson_lb: 0.65 },
          status: "active",
        },
      });
    }
    certifiedWitBadgeId = certBadge.id;

    let absurdBadge = await prisma.badgeDefinition.findUnique({
      where: { key: "absurd_instinct" },
    });
    if (!absurdBadge) {
      absurdBadge = await prisma.badgeDefinition.create({
        data: {
          key: "absurd_instinct",
          name_i18n: { en: "Absurd Instinct" },
          description_i18n: { en: "Wilson score >= 0.75 across 200+ raters" },
          icon_key: "badge_absurd_instinct",
          benchmark_config: { min_raters: 200, min_wilson_lb: 0.75 },
          status: "active",
        },
      });
    }
    absurdInstinctBadgeId = absurdBadge.id;

    let prolificBadge = await prisma.badgeDefinition.findUnique({
      where: { key: "prolific_creator" },
    });
    if (!prolificBadge) {
      prolificBadge = await prisma.badgeDefinition.create({
        data: {
          key: "prolific_creator",
          name_i18n: { en: "Prolific Creator" },
          description_i18n: { en: "Created 10+ approved memes" },
          icon_key: "badge_prolific_creator",
          benchmark_config: { min_approved_memes: 10 },
          status: "active",
        },
      });
    }
    prolificCreatorBadgeId = prolificBadge.id;

    // Ensure at least one meme template exists
    let template = await prisma.memeTemplate.findFirst({
      where: { status: "active" },
    });
    if (!template) {
      template = await prisma.memeTemplate.create({
        data: {
          key: `template_test_${randomUUID().slice(0, 8)}`,
          illustration_registry_key: "ill_test_badge",
          alt_text_i18n: { en: "Test template" },
          license_note: "Test license",
          status: "active",
        },
      });
    }
    templateId = template.id;
  });

  afterAll(async () => {
    // Cleanup created creator badges, memes, and author
    await prisma.creatorBadge.deleteMany({
      where: { player_id: authorPlayerId },
    });
    await prisma.memeSubmission.deleteMany({
      where: { author_player_id: authorPlayerId },
    });
    await prisma.player.delete({
      where: { id: authorPlayerId },
    });
  });

  it("evaluates and awards 'certified_wit' when submission satisfies >=500 raters and >=70% funny", async () => {
    // Create qualifying meme
    const submissionId = `sub_wit_${randomUUID().slice(0, 8)}`;
    await prisma.memeSubmission.create({
      data: {
        id: submissionId,
        author_player_id: authorPlayerId,
        template_id: templateId,
        caption_text: "Qualifying funny meme for certified wit",
        status: "approved",
      },
    });

    await prisma.memeStat.create({
      data: {
        submission_id: submissionId,
        impressions: 600,
        raters: 550,
        funny_count: 440, // 440 / 550 = 80% funny
        not_for_me_count: 110,
        wilson_lb: 0.68, // >= 0.65 for certified_wit, < 0.75 for absurd_instinct
      },
    });

    const result = await CreatorBadgeJob.runBadgeAwards();
    expect(result.badgesEvaluated).toBeGreaterThan(0);

    const award = await prisma.creatorBadge.findUnique({
      where: {
        player_badge_unique: {
          player_id: authorPlayerId,
          badge_id: certifiedWitBadgeId,
        },
      },
    });
    expect(award).not.toBeNull();
    expect(award?.meme_id).toBe(submissionId);
  });

  it("evaluates and awards 'absurd_instinct' when submission satisfies >=200 raters and wilson_lb >= 0.75", async () => {
    const submissionId = `sub_absurd_${randomUUID().slice(0, 8)}`;
    await prisma.memeSubmission.create({
      data: {
        id: submissionId,
        author_player_id: authorPlayerId,
        template_id: templateId,
        caption_text: "High Wilson lower bound absurdist meme",
        status: "approved",
      },
    });

    await prisma.memeStat.create({
      data: {
        submission_id: submissionId,
        impressions: 300,
        raters: 250,
        funny_count: 220,
        not_for_me_count: 30,
        wilson_lb: 0.78, // >= 0.75
      },
    });

    const result = await CreatorBadgeJob.runBadgeAwards();
    expect(result.badgesEvaluated).toBeGreaterThan(0);

    const award = await prisma.creatorBadge.findUnique({
      where: {
        player_badge_unique: {
          player_id: authorPlayerId,
          badge_id: absurdInstinctBadgeId,
        },
      },
    });
    expect(award).not.toBeNull();
    expect(award?.meme_id).toBe(submissionId);
  });

  it("evaluates and awards 'prolific_creator' when creator reaches >=10 approved memes", async () => {
    // Author already has 2 approved memes. Add 8 more to reach 10
    for (let i = 1; i <= 8; i++) {
      await prisma.memeSubmission.create({
        data: {
          id: `sub_prolific_${i}_${randomUUID().slice(0, 6)}`,
          author_player_id: authorPlayerId,
          template_id: templateId,
          caption_text: `Prolific meme caption ${i}`,
          status: "approved",
        },
      });
    }

    const result = await CreatorBadgeJob.runBadgeAwards();
    expect(result.badgesEvaluated).toBeGreaterThan(0);

    const award = await prisma.creatorBadge.findUnique({
      where: {
        player_badge_unique: {
          player_id: authorPlayerId,
          badge_id: prolificCreatorBadgeId,
        },
      },
    });
    expect(award).not.toBeNull();
    expect(award?.meme_id).toBeNull();
  });

  it("is idempotent and handles repeat runs without duplicate awards or errors", async () => {
    const resultRepeat = await CreatorBadgeJob.runBadgeAwards();
    expect(resultRepeat.badgesEvaluated).toBeGreaterThan(0);

    // Count badges for this player - should be exactly 3 (certified_wit, absurd_instinct, prolific_creator)
    const count = await prisma.creatorBadge.count({
      where: { player_id: authorPlayerId },
    });
    expect(count).toBe(3);
  });
});
