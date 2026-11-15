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
  partner: {
    region: string;
    age_band: string;
  };
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
  static async createOrbit(player1Id: string, player2Id: string, startedOn: Date = new Date()) {
    const pA = player1Id < player2Id ? player1Id : player2Id;
    const pB = player1Id < player2Id ? player2Id : player1Id;

    return prisma.orbit.create({
      data: {
        id: randomUUID(),
        player_a_id: pA,
        player_b_id: pB,
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
      return {
        orbit_id: o.id,
        status: o.status as "active" | "ended",
        started_on: o.started_on.toISOString().split("T")[0]!,
        co_streak_current: o.co_streak_current,
        co_streak_best: o.co_streak_best,
        last_co_date: o.last_co_date ? o.last_co_date.toISOString().split("T")[0]! : null,
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
}
