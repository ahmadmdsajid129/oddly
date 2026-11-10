/**
 * @file submissions.repo.ts
 * @package @oddly/api
 *
 * Repository for submissions and idempotency checks.
 */

import { prisma } from "./client.js";
import type { StoredAnswer, Prisma } from "@oddly/shared";

export class SubmissionsRepository {
  /**
   * Check if a submission with the given idempotency request_id already exists.
   */
  static async findByRequestId(requestId: string) {
    try {
      return await prisma.submission.findUnique({
        where: { request_id: requestId },
      });
    } catch {
      return null;
    }
  }

  /**
   * Get submission by player and drop ID.
   */
  static async findByPlayerAndDrop(playerId: string, dropId: string) {
    try {
      return await prisma.submission.findUnique({
        where: {
          drop_id_player_id: {
            drop_id: dropId,
            player_id: playerId,
          },
        },
        include: {
          oddnessScore: true,
        },
      });
    } catch {
      return null;
    }
  }

  /**
   * Create a new player submission idempotently.
   */
  static async createSubmission(data: {
    drop_id: string;
    player_id: string;
    request_id: string;
    answers: StoredAnswer[];
  }) {
    return prisma.submission.create({
      data: {
        drop_id: data.drop_id,
        player_id: data.player_id,
        request_id: data.request_id,
        answers: data.answers as unknown as Prisma.InputJsonValue,
      },
      include: {
        drop: true,
      },
    });
  }

  /**
   * Get submissions for a given drop capped at limit (default 2000) for bounded matching (R1.2).
   */
  static async listByDrop(dropId: string, limit = 2000) {
    return prisma.submission.findMany({
      where: { drop_id: dropId },
      orderBy: { submitted_at: "desc" },
      take: limit,
      select: {
        id: true,
        player_id: true,
        drop_id: true,
        answers: true,
        submitted_at: true,
      },
    });
  }

  /**
   * Fetch single submission by ID with full details.
   */
  static async getById(id: string) {
    return prisma.submission.findUnique({
      where: { id },
      include: {
        player: true,
        drop: true,
        oddnessScore: true,
        shareCards: true,
      },
    });
  }
}

