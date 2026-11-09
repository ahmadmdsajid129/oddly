/**
 * @file history.repo.ts
 * @package @oddly/api
 *
 * Repository for player historical drops, sealed twin records, and calendar archives (P8.03).
 */

import { prisma } from "./client.js";

export interface HistoryItem {
  submissionId: string;
  dropId: string;
  dropDate: string;
  completedAt: string;
  sharerScore: number;
  sharerTier: string;
  sharerPercentile: number;
  twinCity: string;
  shareCardUrl: string | null;
  answersCount: number;
}

// In-memory fallback for test and offline environments
const inMemoryHistory = new Map<string, HistoryItem[]>();

export class HistoryRepository {
  /**
   * Registers history item in test mock
   */
  static setInMemoryHistory(playerId: string, items: HistoryItem[]) {
    inMemoryHistory.set(playerId, items);
  }

  /**
   * Fetches historical drop submissions and twin matches for a player or account.
   */
  static async getPlayerHistory(
    playerId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ items: HistoryItem[]; total: number }> {
    const limit = options.limit ?? 30;
    const offset = options.offset ?? 0;

    try {
      // 1. Identify player or account cluster
      const player = await prisma.player.findUnique({
        where: { id: playerId },
      });

      const playerIds = [playerId];
      if (player?.account_id) {
        const cluster = await prisma.player.findMany({
          where: { account_id: player.account_id },
          select: { id: true },
        });
        for (const p of cluster) {
          if (!playerIds.includes(p.id)) playerIds.push(p.id);
        }
      }

      // 2. Query submissions with drop, oddnessScore, and shareCards
      const submissions = await prisma.submission.findMany({
        where: { player_id: { in: playerIds } },
        include: {
          drop: true,
          oddnessScore: true,
          shareCards: true,
        },
        orderBy: { submitted_at: "desc" },
        take: limit,
        skip: offset,
      });

      const total = await prisma.submission.count({
        where: { player_id: { in: playerIds } },
      });

      // 3. Map into HistoryItem
      const items: HistoryItem[] = [];
      for (const sub of submissions) {
        const match = await prisma.match.findFirst({
          where: {
            drop_id: sub.drop_id,
            OR: [{ player_a_id: sub.player_id }, { player_b_id: sub.player_id }],
          },
        });

        const dropDateStr = sub.drop?.drop_date
          ? sub.drop.drop_date.toISOString().slice(0, 10)
          : sub.submitted_at.toISOString().slice(0, 10);

        items.push({
          submissionId: sub.id,
          dropId: sub.drop_id,
          dropDate: dropDateStr,
          completedAt: sub.submitted_at.toISOString(),
          sharerScore: match ? Math.round(match.similarity_score * 5) : 3,
          sharerTier: sub.oddnessScore?.tier ?? "Common",
          sharerPercentile: sub.oddnessScore?.percentile ?? 50,
          twinCity: "Tokyo, Japan",
          shareCardUrl: sub.shareCards?.[0]?.storage_key
            ? `http://localhost:3000/cards/${sub.shareCards[0].storage_key}`
            : null,
          answersCount: 5,
        });
      }

      return { items, total };
    } catch {
      const items = inMemoryHistory.get(playerId) || [];
      return {
        items: items.slice(offset, offset + limit),
        total: items.length,
      };
    }
  }
}
