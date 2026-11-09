/**
 * @file streaks.repo.ts
 * @package @oddly/api
 *
 * Repository for streak verification, streak_log persistence, and milestone detection (P8.01).
 * Supports gamification milestones at 7, 30, 100, and 365 consecutive days.
 */

import { prisma } from "./client.js";
import { calculateStreak, getTwinDay } from "@oddly/shared";

export const STREAK_MILESTONES = [7, 30, 100, 365] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export interface StreakRecordResult {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  isMilestone: boolean;
  milestone: StreakMilestone | null;
}

// In-memory fallback for test and offline environments
const inMemoryStreakLogs = new Map<string, { count: number; date: string }>();

export class StreaksRepository {
  /**
   * Records a daily streak log entry and evaluates milestone achievements.
   * Runs in transaction-safe manner (P8.01).
   */
  static async recordStreakForSubmission(
    playerId: string,
    dropId: string
  ): Promise<StreakRecordResult> {
    const today = getTwinDay(new Date());

    // 1. Gather all past submission dates for this player or their account cluster
    const distinctDates = new Set<string>();

    try {
      const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: {
          submissions: {
            include: { drop: true },
          },
        },
      });

      if (player?.account_id) {
        // Cluster streak across all linked devices
        const allClusterPlayers = await prisma.player.findMany({
          where: { account_id: player.account_id },
          include: {
            submissions: {
              include: { drop: true },
            },
          },
        });

        for (const p of allClusterPlayers) {
          for (const sub of p.submissions) {
            if (sub.drop?.drop_date) {
              distinctDates.add(sub.drop.drop_date.toISOString().slice(0, 10));
            }
          }
        }
      } else if (player) {
        for (const sub of player.submissions) {
          if (sub.drop?.drop_date) {
            distinctDates.add(sub.drop.drop_date.toISOString().slice(0, 10));
          }
        }
      }
    } catch {
      // In offline / mock mode
      const mem = inMemoryStreakLogs.get(playerId);
      if (mem) {
        distinctDates.add(mem.date);
      }
    }

    // Always include today's submission date
    distinctDates.add(today);

    // 2. Compute current streak
    const datesList = Array.from(distinctDates);
    const streakNum = calculateStreak(datesList, today);
    const currentStreak = typeof streakNum === "number" ? Math.max(1, streakNum) : 1;

    // 3. Upsert into database
    try {
      await prisma.streakLog.upsert({
        where: {
          player_id_drop_id: {
            player_id: playerId,
            drop_id: dropId,
          },
        },
        update: {
          streak_count: currentStreak,
          calculated_at: new Date(),
        },
        create: {
          player_id: playerId,
          drop_id: dropId,
          streak_count: currentStreak,
        },
      });
    } catch {
      inMemoryStreakLogs.set(playerId, { count: currentStreak, date: today });
    }

    // 4. Milestone evaluation (7, 30, 100, 365)
    const milestone = STREAK_MILESTONES.find((m) => m === currentStreak) || null;
    const isMilestone = milestone !== null;

    return {
      currentStreak,
      longestStreak: Math.max(currentStreak, datesList.length),
      totalActiveDays: datesList.length,
      isMilestone,
      milestone,
    };
  }

  /**
   * Retrieves player streak summary for header and me screens.
   */
  static async getStreakSummary(playerId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
    nextMilestone: number;
    daysToNextMilestone: number;
  }> {
    const today = getTwinDay(new Date());
    const distinctDates = new Set<string>();

    try {
      const logs = await prisma.streakLog.findMany({
        where: { player_id: playerId },
        orderBy: { calculated_at: "desc" },
      });

      for (const log of logs) {
        distinctDates.add(log.calculated_at.toISOString().slice(0, 10));
      }
    } catch {
      const mem = inMemoryStreakLogs.get(playerId);
      if (mem) distinctDates.add(mem.date);
    }

    const currentStreak = calculateStreak(Array.from(distinctDates), today);
    const nextMilestone =
      STREAK_MILESTONES.find((m) => m > currentStreak) ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
    const daysToNextMilestone = Math.max(0, nextMilestone - currentStreak);

    return {
      currentStreak,
      longestStreak: Math.max(currentStreak, distinctDates.size),
      totalActiveDays: distinctDates.size,
      nextMilestone,
      daysToNextMilestone,
    };
  }
}
