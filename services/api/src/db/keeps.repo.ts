/**
 * @file keeps.repo.ts
 * @package @oddly/api
 *
 * Repository for Twin Keep requests (Stage F1 / Phase 10A).
 * Invariants:
 * - 1 Keep per drop per player (enforced by unique constraint).
 * - Only Google-authenticated players can send/receive Keeps.
 * - Target player incoming pending cap: max 3 per day.
 * - 30-day cooldown between same pairs if declined or severed.
 * - Absolute Privacy: Neither from_player_id nor to_player_id is ever exposed publicly.
 */

import { prisma } from "./client.js";
import { randomUUID } from "node:crypto";
import type { KeepStatus } from "@oddly/shared";

export interface CreateKeepInput {
  dropDate: Date;
  fromPlayerId: string;
  toPlayerId: string;
  similaritySnapshot: number;
}

export interface SanitizedIncomingKeep {
  id: string;
  drop_date: string;
  similarity_snapshot: number;
  region: string;
  age_band: string;
  created_at: string;
}

export class KeepsRepository {
  /**
   * Check if a player already sent a Keep for this drop_date.
   */
  static async hasSentKeepForDrop(dropDate: Date, fromPlayerId: string): Promise<boolean> {
    const existing = await prisma.twinKeep.findFirst({
      where: {
        drop_date: dropDate,
        from_player_id: fromPlayerId,
      },
    });
    return !!existing;
  }

  /**
   * Check how many pending keeps the target player has received for this drop_date.
   */
  static async countIncomingPendingToday(toPlayerId: string, dropDate: Date): Promise<number> {
    return prisma.twinKeep.count({
      where: {
        to_player_id: toPlayerId,
        drop_date: dropDate,
        status: "pending",
      },
    });
  }

  /**
   * Check 30-day cooldown between two players.
   * Checks if an Orbit between them was ended within 30 days, or a Keep declined within 30 days.
   */
  static async hasRecentCooldown(
    player1Id: string,
    player2Id: string,
    cooldownDays: number = 30
  ): Promise<boolean> {
    const pA = player1Id < player2Id ? player1Id : player2Id;
    const pB = player1Id < player2Id ? player2Id : player1Id;

    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);

    // 1. Check recently ended orbits
    const recentEndedOrbit = await prisma.orbit.findFirst({
      where: {
        player_a_id: pA,
        player_b_id: pB,
        status: "ended",
        ended_on: { gte: cooldownDate },
      },
    });
    if (recentEndedOrbit) return true;

    // 2. Check recently declined keeps
    const recentDeclinedKeep = await prisma.twinKeep.findFirst({
      where: {
        OR: [
          { from_player_id: player1Id, to_player_id: player2Id },
          { from_player_id: player2Id, to_player_id: player1Id },
        ],
        status: "declined",
        decided_at: { gte: cooldownDate },
      },
    });
    return !!recentDeclinedKeep;
  }

  /**
   * Create a new Keep request.
   */
  static async createKeep(data: CreateKeepInput) {
    return prisma.twinKeep.create({
      data: {
        id: randomUUID(),
        drop_date: data.dropDate,
        from_player_id: data.fromPlayerId,
        to_player_id: data.toPlayerId,
        similarity_snapshot: data.similaritySnapshot,
        status: "pending",
      },
    });
  }

  /**
   * Find keep by ID and drop_date (or scan if drop_date not known).
   */
  static async getKeepById(id: string, dropDate?: Date) {
    if (dropDate) {
      return prisma.twinKeep.findUnique({
        where: { id_drop_date: { id, drop_date: dropDate } },
      });
    }
    return prisma.twinKeep.findFirst({
      where: { id },
    });
  }

  /**
   * Get incoming pending keeps for a player, returning strictly sanitized partner traits.
   * Privacy Invariant: NEVER exposes sender user ID or private vector.
   */
  static async getIncomingPendingKeeps(toPlayerId: string): Promise<SanitizedIncomingKeep[]> {
    const keeps = await prisma.twinKeep.findMany({
      where: {
        to_player_id: toPlayerId,
        status: "pending",
      },
      include: {
        from_player: true,
      },
      orderBy: { created_at: "desc" },
    });

    return keeps.map((k) => ({
      id: k.id,
      drop_date: k.drop_date.toISOString().split("T")[0]!,
      similarity_snapshot: k.similarity_snapshot,
      region: k.from_player?.region || "Unknown",
      age_band: k.from_player?.age_band || "18-24",
      created_at: k.created_at.toISOString(),
    }));
  }

  /**
   * Respond to a Keep (accept or decline).
   */
  static async respondToKeep(
    id: string,
    dropDate: Date,
    toPlayerId: string,
    decision: "accept" | "decline"
  ) {
    const status: KeepStatus = decision === "accept" ? "accepted" : "declined";
    return prisma.twinKeep.update({
      where: {
        id_drop_date: { id, drop_date: dropDate },
        to_player_id: toPlayerId,
      },
      data: {
        status,
        decided_at: new Date(),
      },
    });
  }

  /**
   * Expire keeps that have been pending for longer than expiryHours (default 48h).
   */
  static async expireStaleKeeps(expiryHours: number = 48): Promise<number> {
    const cutoff = new Date(Date.now() - expiryHours * 60 * 60 * 1000);
    const result = await prisma.twinKeep.updateMany({
      where: {
        status: "pending",
        created_at: { lt: cutoff },
      },
      data: {
        status: "expired",
        decided_at: new Date(),
      },
    });
    return result.count;
  }
}
