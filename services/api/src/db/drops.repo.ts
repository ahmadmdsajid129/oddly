/**
 * @file drops.repo.ts
 * @package @oddly/api
 *
 * Repository for drops, questions, and answer options.
 */

import { prisma } from "./client.js";
import { getTwinDay, DropStatus } from "@oddly/shared";

export class DropsRepository {
  /**
   * Fetch today's drop by IST date, including all 5 questions and their answer options.
   * Supports lane filtering (P10L.03 / P10L.04).
   */
  static async getTodayDrop(customDateStr?: string, laneSlugOrId?: string) {
    const dateStr = customDateStr || getTwinDay(new Date());
    const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

    if (!laneSlugOrId || laneSlugOrId === "everyday" || laneSlugOrId === "00000000-0000-4000-a000-000000000001") {
      return prisma.drop.findFirst({
        where: {
          drop_date: dateObj,
          OR: [
            { lane_id: "00000000-0000-4000-a000-000000000001" },
            { lane: { slug: "everyday" } },
            { lane_id: null },
          ],
        },
        include: {
          questions: {
            orderBy: { position: "asc" },
            include: {
              answerOptions: {
                orderBy: { display_order: "asc" },
              },
            },
          },
        },
      });
    }

    return prisma.drop.findFirst({
      where: {
        drop_date: dateObj,
        OR: [
          { lane_id: laneSlugOrId },
          { lane: { slug: laneSlugOrId } },
        ],
      },
      include: {
        questions: {
          orderBy: { position: "asc" },
          include: {
            answerOptions: {
              orderBy: { display_order: "asc" },
            },
          },
        },
      },
    });
  }

  /**
   * Fetch a drop by its UUID.
   */
  static async getDropById(id: string) {
    return prisma.drop.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { position: "asc" },
          include: {
            answerOptions: {
              orderBy: { display_order: "asc" },
            },
          },
        },
      },
    });
  }

  /**
   * List upcoming or recent drops.
   */
  static async listDrops(limit = 14) {
    return prisma.drop.findMany({
      orderBy: { drop_date: "asc" },
      take: limit,
      include: {
        questions: {
          orderBy: { position: "asc" },
        },
      },
    });
  }

  /**
   * Update the status of a drop (pending -> live -> closed).
   */
  static async updateDropStatus(id: string, status: DropStatus) {
    return prisma.drop.update({
      where: { id },
      data: { status },
    });
  }
}

