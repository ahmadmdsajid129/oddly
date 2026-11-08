/**
 * @file players.repo.ts
 * @package @oddly/api
 *
 * Repository for guest players, accounts, and streak records.
 */

import { prisma } from "./client.js";

export class PlayersRepository {
  /**
   * Find or create a player record by their device fingerprint (did).
   */
  static async upsertGuest(did: string, region = "IN", ageBand = "18-24") {
    return prisma.player.upsert({
      where: { did },
      update: {},
      create: {
        did,
        region,
        age_band: ageBand,
      },
    });
  }

  /**
   * Get player by UUID.
   */
  static async getById(id: string) {
    return prisma.player.findUnique({
      where: { id },
      include: {
        account: true,
      },
    });
  }

  /**
   * Link a guest player to an authenticated Google Account.
   */
  static async linkAccount(playerId: string, accountId: string) {
    return prisma.player.update({
      where: { id: playerId },
      data: { account_id: accountId },
    });
  }

  /**
   * Store encrypted push notification token.
   */
  static async updatePushToken(playerId: string, pushTokenEnc: string) {
    return prisma.player.update({
      where: { id: playerId },
      data: { push_token_enc: pushTokenEnc },
    });
  }

  /**
   * Fetch player's recent drop submission dates to compute current streak.
   */
  static async getPlayerSubmissionDates(playerId: string): Promise<string[]> {
    const submissions = await prisma.submission.findMany({
      where: { player_id: playerId },
      select: {
        drop: {
          select: {
            drop_date: true,
          },
        },
      },
      orderBy: { submitted_at: "desc" },
    });

    return submissions.map((s) => s.drop.drop_date.toISOString().slice(0, 10));
  }
}

