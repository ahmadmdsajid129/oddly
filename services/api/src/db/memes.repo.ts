/**
 * @file memes.repo.ts
 * @package @oddly/api
 *
 * Repository and Exposure Engine for Meme Lab (Stage M3 / Phase 10G / P10G.06).
 *
 * Implements:
 * - 80% Exploitation / 20% Exploration selection logic (ADR 043)
 * - Diversity caps (no repeat impressions, 1 impression per player per template per week)
 * - Author exclusion (players cannot see or rate their own submissions)
 * - Freshness retirement (stale submissions > 14 days retired)
 * - Atomic exposure tracking in `meme_exposures` and `meme_stats.impressions`
 */

import { type PrismaClient } from "@oddly/shared";

export interface SelectedMeme {
  id: string;
  template_id: string;
  template_key: string;
  illustration_registry_key: string;
  caption_text: string;
  aspect: string;
  alt_text?: string;
  wilson_lb: number;
  is_exploration: boolean;
}

export interface ExposureEngineOptions {
  explorationRate?: number; // default: 0.20
  minRatersThreshold?: number; // default: 200
  freshnessDays?: number; // default: 14
  templateCooldownDays?: number; // default: 7
}

export class MemesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Selects the next meme to show a player following the 80/20 exposure engine rules.
   */
  async selectMemeForPlayer(
    playerId: string,
    options: ExposureEngineOptions = {}
  ): Promise<SelectedMeme | null> {
    const explorationRate = options.explorationRate ?? 0.20;
    const minRatersThreshold = options.minRatersThreshold ?? 200;
    const templateCooldownDays = options.templateCooldownDays ?? 7;

    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - templateCooldownDays);

    // 1. Find template IDs the player has already seen within templateCooldownDays
    const recentExposures = await this.prisma.memeExposure.findMany({
      where: {
        player_id: playerId,
        shown_at: { gte: cooldownDate },
      },
      select: {
        submission: {
          select: { template_id: true },
        },
      },
    });

    const recentTemplateIds = recentExposures.map((e) => e.submission.template_id);

    // 2. Find submission IDs the player has already been exposed to or rated
    const allSeenExposures = await this.prisma.memeExposure.findMany({
      where: { player_id: playerId },
      select: { submission_id: true },
    });
    const seenSubmissionIds = new Set(allSeenExposures.map((e) => e.submission_id));

    const ratedSubmissions = await this.prisma.memeRating.findMany({
      where: { rater_player_id: playerId },
      select: { submission_id: true },
    });
    ratedSubmissions.forEach((r) => seenSubmissionIds.add(r.submission_id));

    const excludedSubmissionIds = Array.from(seenSubmissionIds);

    // Base exclusion criteria:
    // - status = 'approved'
    // - author_player_id != playerId (no self-view)
    // - id NOT IN excludedSubmissionIds (no repeats)
    // - template_id NOT IN recentTemplateIds (template cooldown)

    const baseWhere = {
      status: "approved",
      author_player_id: { not: playerId },
      ...(excludedSubmissionIds.length > 0 ? { id: { notIn: excludedSubmissionIds } } : {}),
      ...(recentTemplateIds.length > 0 ? { template_id: { notIn: recentTemplateIds } } : {}),
    };

    const isExploration = Math.random() < explorationRate;

    let candidate = await this.queryCandidate(isExploration, baseWhere, minRatersThreshold);

    // Fallback: If chosen branch has no candidate, try the other branch
    if (!candidate) {
      candidate = await this.queryCandidate(!isExploration, baseWhere, minRatersThreshold);
    }

    // Relax template cooldown if no candidate found but unused memes still exist
    if (!candidate && recentTemplateIds.length > 0) {
      const relaxedWhere = {
        status: "approved",
        author_player_id: { not: playerId },
        ...(excludedSubmissionIds.length > 0 ? { id: { notIn: excludedSubmissionIds } } : {}),
      };
      candidate =
        (await this.queryCandidate(isExploration, relaxedWhere, minRatersThreshold)) ||
        (await this.queryCandidate(!isExploration, relaxedWhere, minRatersThreshold));
    }

    if (!candidate) {
      return null;
    }

    // Record exposure atomically
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await this.prisma.$transaction([
      this.prisma.memeExposure.create({
        data: {
          submission_id: candidate.id,
          player_id: playerId,
          drop_date: today,
          shown_at: new Date(),
        },
      }),
      this.prisma.memeStat.upsert({
        where: { submission_id: candidate.id },
        create: {
          submission_id: candidate.id,
          impressions: 1,
          raters: 0,
          funny_count: 0,
          not_for_me_count: 0,
          wilson_lb: 0.0,
          last_shown_at: new Date(),
        },
        update: {
          impressions: { increment: 1 },
          last_shown_at: new Date(),
        },
      }),
    ]);

    const altMap = candidate.template.alt_text_i18n as Record<string, string> | null;

    return {
      id: candidate.id,
      template_id: candidate.template_id,
      template_key: candidate.template.key,
      illustration_registry_key: candidate.template.illustration_registry_key,
      caption_text: candidate.caption_text,
      aspect: candidate.template.aspect,
      alt_text: altMap?.en || candidate.template.license_note,
      wilson_lb: candidate.stats?.wilson_lb ?? 0.0,
      is_exploration: (candidate.stats?.raters ?? 0) < minRatersThreshold,
    };
  }

  private async queryCandidate(
    exploration: boolean,
    where: Record<string, unknown>,
    minRatersThreshold: number
  ) {
    if (exploration) {
      // Exploration: raters < 200, order by least impressions, then newest
      return this.prisma.memeSubmission.findFirst({
        where: {
          ...where,
          OR: [
            { stats: null },
            { stats: { raters: { lt: minRatersThreshold } } },
          ],
        },
        include: {
          template: true,
          stats: true,
        },
        orderBy: [
          { stats: { impressions: "asc" } },
          { created_at: "desc" },
        ],
      });
    } else {
      // Exploitation: raters >= 200, order by highest wilson_lb, then least impressions
      return this.prisma.memeSubmission.findFirst({
        where: {
          ...where,
          stats: {
            raters: { gte: minRatersThreshold },
          },
        },
        include: {
          template: true,
          stats: true,
        },
        orderBy: [
          { stats: { wilson_lb: "desc" } },
          { stats: { impressions: "asc" } },
        ],
      });
    }
  }

  /**
   * Retires memes older than freshnessDays that failed to gain traction or high rating.
   */
  async retireStaleMemes(options: { freshnessDays?: number; minWilsonScore?: number } = {}) {
    const freshnessDays = options.freshnessDays ?? 14;
    const minWilsonScore = options.minWilsonScore ?? 0.50;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - freshnessDays);

    // Stale memes: approved, created before cutoffDate, with wilson_lb < minWilsonScore or raters < 20
    const staleSubmissions = await this.prisma.memeSubmission.findMany({
      where: {
        status: "approved",
        created_at: { lt: cutoffDate },
        OR: [
          { stats: { wilson_lb: { lt: minWilsonScore } } },
          { stats: { raters: { lt: 20 } } },
        ],
      },
      select: { id: true },
    });

    if (staleSubmissions.length === 0) {
      return { retiredCount: 0 };
    }

    const ids = staleSubmissions.map((s) => s.id);
    const updateResult = await this.prisma.memeSubmission.updateMany({
      where: { id: { in: ids } },
      data: {
        status: "retired",
        moderation_reason: `Automatically retired: stale (> ${freshnessDays} days) without passing Wilson threshold.`,
      },
    });

    return { retiredCount: updateResult.count };
  }
}
