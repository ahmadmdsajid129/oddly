/**
 * @file creator-badge.job.ts
 * @package @oddly/worker
 *
 * Creator badge evaluation and award worker (Stage M5 & M6 / Phase 10I / P10I.04).
 * Idempotently evaluates creator achievements and community meme benchmarks:
 * - 'certified_wit': Community meme rated funny by >=70% across >=500 raters (Wilson lb >= 0.65).
 * - 'absurd_instinct': Meme with Wilson lb >= 0.75 across >=200 raters.
 * - 'prolific_creator': Author of 10+ approved memes in Meme Lab.
 *
 * Invariant: Zero public leaderboards or competitive ranking walls. Individual milestone recognition only.
 */

import { prisma } from "../db.js";

export interface BadgeAwardResult {
  badgesEvaluated: number;
  newBadgesAwarded: number;
  playersAwarded: number;
  details: Record<string, number>;
}

export class CreatorBadgeJob {
  /**
   * Run badge evaluation across all active badge definitions.
   */
  static async runBadgeAwards(): Promise<BadgeAwardResult> {
    const activeBadges = await prisma.badgeDefinition.findMany({
      where: { status: "active" },
    });

    let newBadgesAwarded = 0;
    const awardedPlayersSet = new Set<string>();
    const details: Record<string, number> = {};

    for (const badge of activeBadges) {
      details[badge.key] = 0;
      const config = (badge.benchmark_config as Record<string, number>) || {};

      if (badge.key === "certified_wit") {
        const minRaters = config.min_raters ?? 500;
        const minFunnyPct = config.min_funny_pct ?? 70;
        const minWilsonLb = config.min_wilson_lb ?? 0.65;

        // Query qualifying approved submissions via meme_stats
        const qualifyingStats = await prisma.memeStat.findMany({
          where: {
            raters: { gte: minRaters },
            wilson_lb: { gte: minWilsonLb },
            submission: {
              status: "approved",
            },
          },
          include: {
            submission: true,
          },
        });

        for (const stat of qualifyingStats) {
          if (stat.raters === 0) continue;
          const funnyPct = (stat.funny_count / stat.raters) * 100;
          if (funnyPct >= minFunnyPct) {
            const awarded = await CreatorBadgeJob.awardBadgeIdempotent(
              stat.submission.author_player_id,
              badge.id,
              stat.submission_id
            );
            if (awarded) {
              newBadgesAwarded++;
              awardedPlayersSet.add(stat.submission.author_player_id);
              details[badge.key] = (details[badge.key] || 0) + 1;
            }
          }
        }
      } else if (badge.key === "absurd_instinct") {
        const minRaters = config.min_raters ?? 200;
        const minWilsonLb = config.min_wilson_lb ?? 0.75;

        const qualifyingStats = await prisma.memeStat.findMany({
          where: {
            raters: { gte: minRaters },
            wilson_lb: { gte: minWilsonLb },
            submission: {
              status: "approved",
            },
          },
          include: {
            submission: true,
          },
        });

        for (const stat of qualifyingStats) {
          const awarded = await CreatorBadgeJob.awardBadgeIdempotent(
            stat.submission.author_player_id,
            badge.id,
            stat.submission_id
          );
          if (awarded) {
            newBadgesAwarded++;
            awardedPlayersSet.add(stat.submission.author_player_id);
            details[badge.key] = (details[badge.key] || 0) + 1;
          }
        }
      } else if (badge.key === "prolific_creator") {
        const minApproved = config.min_approved_memes ?? 10;

        // Group approved submissions by author
        const authorCounts = await prisma.memeSubmission.groupBy({
          by: ["author_player_id"],
          where: { status: "approved" },
          _count: { id: true },
          having: {
            id: {
              _count: {
                gte: minApproved,
              },
            },
          },
        });

        for (const ac of authorCounts) {
          const awarded = await CreatorBadgeJob.awardBadgeIdempotent(
            ac.author_player_id,
            badge.id,
            null
          );
          if (awarded) {
            newBadgesAwarded++;
            awardedPlayersSet.add(ac.author_player_id);
            details[badge.key] = (details[badge.key] || 0) + 1;
          }
        }
      }
    }

    return {
      badgesEvaluated: activeBadges.length,
      newBadgesAwarded,
      playersAwarded: awardedPlayersSet.size,
      details,
    };
  }

  /**
   * Idempotently award a badge to a player.
   */
  static async awardBadgeIdempotent(
    playerId: string,
    badgeId: string,
    memeId: string | null
  ): Promise<boolean> {
    const existing = await prisma.creatorBadge.findUnique({
      where: {
        player_badge_unique: {
          player_id: playerId,
          badge_id: badgeId,
        },
      },
    });

    if (existing) {
      return false; // Already awarded
    }

    try {
      await prisma.creatorBadge.create({
        data: {
          player_id: playerId,
          badge_id: badgeId,
          meme_id: memeId,
        },
      });
      return true;
    } catch {
      // Catch race condition constraint violation
      return false;
    }
  }
}
