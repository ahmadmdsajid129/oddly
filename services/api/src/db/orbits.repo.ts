/**
 * @file orbits.repo.ts
 * @package @oddly/api
 *
 * Repository for Orbit relationships and expressions (Stage F1 / Phase 10A).
 * Invariants:
 * - Lexicographical sorting: player_a_id < player_b_id.
 * - Active cap: max 3 active Orbits per player.
 * - Anti-stalking: One-tap unprovoked dissolution without blame attribution.
 * - Daily Expressions: 1 expression per player per drop_date (The Wave).
 * - Anonymous partner traits: Only coarse region and age band exposed.
 */

import { prisma } from "./client.js";
import { randomUUID } from "node:crypto";

export const APPROVED_EXPRESSIONS = [
  "wave_hand",
  "sparkle",
  "nod",
  "coffee",
  "high_five",
  "eyes",
] as const;

export type ExpressionKey = (typeof APPROVED_EXPRESSIONS)[number];

export interface SanitizedOrbitPartner {
  orbit_id: string;
  status: "active" | "ended";
  started_on: string;
  co_streak_current: number;
  co_streak_best: number;
  last_co_date: string | null;
  lane_slug?: string;
  partner: {
    region: string;
    age_band: string;
  };
}

export interface OrbitSubjectSyncItem {
  tag_id: string;
  tag_key: string;
  label_i18n: Record<string, string>;
  category: string;
  status: "unlocked" | "locked";
  shared_questions: number;
  agreement_count: number | null;
  agreement_percentage: number | null;
  lock_reason: string | null;
}

export class OrbitsRepository {
  /**
   * Count how many active Orbits a player currently has.
   */
  static async countActiveOrbits(playerId: string): Promise<number> {
    return prisma.orbit.count({
      where: {
        OR: [{ player_a_id: playerId }, { player_b_id: playerId }],
        status: "active",
      },
    });
  }

  /**
   * Create an Orbit between two players.
   * Strictly enforces player_a_id < player_b_id.
   */
  static async createOrbit(
    player1Id: string,
    player2Id: string,
    startedOn: Date = new Date(),
    laneId?: string
  ) {
    const pA = player1Id < player2Id ? player1Id : player2Id;
    const pB = player1Id < player2Id ? player2Id : player1Id;

    return prisma.orbit.create({
      data: {
        id: randomUUID(),
        player_a_id: pA,
        player_b_id: pB,
        lane_id: laneId,
        status: "active",
        started_on: startedOn,
        co_streak_current: 0,
        co_streak_best: 0,
      },
    });
  }

  /**
   * Find an active Orbit between two specific players.
   */
  static async findActiveOrbitBetween(player1Id: string, player2Id: string) {
    const pA = player1Id < player2Id ? player1Id : player2Id;
    const pB = player1Id < player2Id ? player2Id : player1Id;

    return prisma.orbit.findFirst({
      where: {
        player_a_id: pA,
        player_b_id: pB,
        status: "active",
      },
    });
  }

  /**
   * Get an Orbit by ID with security isolation (must be player_a or player_b).
   */
  static async getOrbitForPlayer(orbitId: string, playerId: string) {
    const orbit = await prisma.orbit.findUnique({
      where: { id: orbitId },
      include: {
        player_a: true,
        player_b: true,
      },
    });

    if (!orbit) return null;
    if (orbit.player_a_id !== playerId && orbit.player_b_id !== playerId) {
      return null; // Not authorized to view this orbit
    }
    return orbit;
  }

  /**
   * List all active Orbits for a player with sanitized partner info.
   */
  static async listActiveOrbitsForPlayer(playerId: string): Promise<SanitizedOrbitPartner[]> {
    const orbits = await prisma.orbit.findMany({
      where: {
        OR: [{ player_a_id: playerId }, { player_b_id: playerId }],
        status: "active",
      },
      include: {
        player_a: true,
        player_b: true,
      },
      orderBy: { started_on: "desc" },
    });

    return orbits.map((o) => {
      const partner = o.player_a_id === playerId ? o.player_b : o.player_a;
      const lane_slug =
        o.lane_id === "00000000-0000-4000-a000-000000000002" ? "memes" : "everyday";

      return {
        orbit_id: o.id,
        status: o.status as "active" | "ended",
        started_on: o.started_on.toISOString().split("T")[0]!,
        co_streak_current: o.co_streak_current,
        co_streak_best: o.co_streak_best,
        last_co_date: o.last_co_date ? o.last_co_date.toISOString().split("T")[0]! : null,
        lane_slug,
        partner: {
          region: partner?.region || "Unknown",
          age_band: partner?.age_band || "18-24",
        },
      };
    });
  }

  /**
   * End an Orbit (unprovoked dissolution by either partner or admin).
   */
  static async endOrbit(orbitId: string, endedByPlayerId?: string) {
    return prisma.orbit.update({
      where: { id: orbitId },
      data: {
        status: "ended",
        ended_on: new Date(),
        ended_by: endedByPlayerId || null,
      },
    });
  }

  /**
   * Add a daily expression (The Wave) to an Orbit.
   * Enforces 1 expression per user per drop_date.
   */
  static async addExpression(
    orbitId: string,
    fromPlayerId: string,
    dropDate: Date,
    expressionKey: string
  ) {
    if (!APPROVED_EXPRESSIONS.includes(expressionKey as ExpressionKey)) {
      throw new Error(`Invalid expression key: ${expressionKey}`);
    }

    return prisma.orbitExpression.create({
      data: {
        id: randomUUID(),
        orbit_id: orbitId,
        from_player_id: fromPlayerId,
        drop_date: dropDate,
        expression_key: expressionKey,
      },
    });
  }

  /**
   * Get expressions sent today in an Orbit.
   */
  static async getTodayExpressions(orbitId: string, dropDate: Date) {
    return prisma.orbitExpression.findMany({
      where: {
        orbit_id: orbitId,
        drop_date: dropDate,
      },
      orderBy: { created_at: "asc" },
    });
  }

  /**
   * Increment co-streak for an active Orbit.
   */
  static async incrementCoStreak(orbitId: string, coDate: Date) {
    const orbit = await prisma.orbit.findUnique({ where: { id: orbitId } });
    if (!orbit) return null;

    const newCurrent = orbit.co_streak_current + 1;
    const newBest = Math.max(orbit.co_streak_best, newCurrent);

    return prisma.orbit.update({
      where: { id: orbitId },
      data: {
        co_streak_current: newCurrent,
        co_streak_best: newBest,
        last_co_date: coDate,
      },
    });
  }

  /**
   * Quietly reset co-streak (zero guilt/drama).
   */
  static async resetCoStreak(orbitId: string) {
    return prisma.orbit.update({
      where: { id: orbitId },
      data: {
        co_streak_current: 0,
      },
    });
  }

  /**
   * Calculate Aggregate Subject Sync across mutual tags for an Orbit.
   * Invariant (Rule 19): Zero pick vector leakage. Only aggregate percentages.
   * If shared questions < minThreshold (default 5), returns locked state.
   */
  static async getSubjectSyncForOrbit(
    orbitId: string,
    callerPlayerId: string,
    minThreshold = 5
  ): Promise<OrbitSubjectSyncItem[]> {
    const orbit = await prisma.orbit.findUnique({
      where: { id: orbitId },
    });

    if (!orbit) {
      throw new Error("ORBIT_NOT_FOUND");
    }

    if (orbit.player_a_id !== callerPlayerId && orbit.player_b_id !== callerPlayerId) {
      throw new Error("UNAUTHORIZED_ORBIT_ACCESS");
    }

    const playerAId = orbit.player_a_id;
    const playerBId = orbit.player_b_id;

    interface RawSyncRow {
      tag_id: string;
      tag_key: string;
      label_i18n: Record<string, string>;
      category: string;
      shared_questions: number;
      agreement_count: number;
    }

    const rows = await prisma.$queryRaw<RawSyncRow[]>`
      SELECT 
        t.id AS tag_id,
        t.key AS tag_key,
        t.label_i18n,
        t.category,
        COUNT(*)::int AS shared_questions,
        COUNT(*) FILTER (WHERE sa_a.value = sa_b.value)::int AS agreement_count
      FROM submission_answers sa_a
      JOIN submission_answers sa_b 
        ON sa_a.drop_date = sa_b.drop_date 
        AND sa_a.question_id = sa_b.question_id
      JOIN question_tags qt ON qt.question_id = sa_a.question_id
      JOIN tags t ON t.id = qt.tag_id
      WHERE sa_a.player_id = ${playerAId} 
        AND sa_b.player_id = ${playerBId} 
        AND t.is_active = true
      GROUP BY t.id, t.key, t.label_i18n, t.category
      ORDER BY t.category ASC, t.key ASC
    `;

    return rows.map((r) => {
      const isUnlocked = r.shared_questions >= minThreshold;
      const tagLabel =
        (r.label_i18n as Record<string, string>)?.en ||
        r.tag_key.charAt(0).toUpperCase() + r.tag_key.slice(1);

      return {
        tag_id: r.tag_id,
        tag_key: r.tag_key,
        label_i18n: r.label_i18n as Record<string, string>,
        category: r.category,
        status: isUnlocked ? "unlocked" : "locked",
        shared_questions: r.shared_questions,
        agreement_count: isUnlocked ? r.agreement_count : null,
        agreement_percentage: isUnlocked
          ? Math.round((r.agreement_count / Math.max(1, r.shared_questions)) * 100)
          : null,
        lock_reason: isUnlocked
          ? null
          : `Play more drops together to unlock ${tagLabel} sync.`,
      };
    });
  }
}
