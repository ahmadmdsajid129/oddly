/**
 * @file matches.repo.ts
 * @package @oddly/api
 *
 * Repository for pairwise match records and results.
 */

import { prisma } from "./client.js";

export class MatchesRepository {
  /**
   * Create or update a match record for a player pair in a drop.
   */
  static async createMatch(data: {
    drop_id: string;
    player_a_id: string;
    player_b_id: string;
    submission_a_id?: string;
    submission_b_id?: string;
    similarity_score: number;
    is_provisional?: boolean;
  }) {
    return prisma.match.create({
      data: {
        drop_id: data.drop_id,
        player_a_id: data.player_a_id,
        player_b_id: data.player_b_id,
        submission_a_id: data.submission_a_id,
        submission_b_id: data.submission_b_id,
        similarity_score: data.similarity_score,
        is_provisional: data.is_provisional ?? true,
      },
      include: {
        player_a: true,
        player_b: true,
      },
    });
  }

  /**
   * Find a match for a player in a specific drop (as player A or player B).
   */
  static async getMatchForPlayer(dropId: string, playerId: string) {
    return prisma.match.findFirst({
      where: {
        drop_id: dropId,
        OR: [{ player_a_id: playerId }, { player_b_id: playerId }],
      },
      include: {
        player_a: true,
        player_b: true,
      },
    });
  }

  /**
   * Finalise all provisional matches for a closed drop.
   */
  static async finalizeMatches(dropId: string) {
    return prisma.match.updateMany({
      where: {
        drop_id: dropId,
        is_provisional: true,
      },
      data: {
        is_provisional: false,
        finalized_at: new Date(),
      },
    });
  }
}

