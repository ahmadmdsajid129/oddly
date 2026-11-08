import crypto from "node:crypto";
import { prisma } from "./client.js";
import type { ShareFormat } from "@oddly/shared";

export class SharesRepository {
  /**
   * Generates a collision-resistant 7-character base62/base64url short ID.
   */
  static generateShortId(): string {
    return crypto.randomBytes(6).toString("base64url").slice(0, 7);
  }

  /**
   * Creates or retrieves an existing short link for a submission.
   */
  static async createShortLink(submissionId: string): Promise<{ short_id: string; isNew: boolean }> {
    // Check if an existing short link was already issued for this submission
    const existing = await prisma.shortLink.findFirst({
      where: { submission_id: submissionId },
    });

    if (existing) {
      return { short_id: existing.short_id, isNew: false };
    }

    // Generate unique short ID with retry on collision
    let shortId = SharesRepository.generateShortId();
    for (let attempts = 0; attempts < 3; attempts++) {
      try {
        const created = await prisma.shortLink.create({
          data: {
            short_id: shortId,
            submission_id: submissionId,
          },
        });
        return { short_id: created.short_id, isNew: true };
      } catch {
        shortId = SharesRepository.generateShortId();
      }
    }

    throw new Error("Failed to generate unique short ID for share link");
  }

  /**
   * Finds a short link by its public 7-character token.
   */
  static async findByShortId(shortId: string) {
    return await prisma.shortLink.findUnique({
      where: { short_id: shortId },
    });
  }

  /**
   * Atomically increments the view counter for a short link.
   */
  static async incrementViews(shortId: string): Promise<void> {
    try {
      await prisma.shortLink.update({
        where: { short_id: shortId },
        data: { views: { increment: 1 } },
      });
    } catch {
      // Non-blocking view count tracking
    }
  }

  /**
   * Upserts a share card record for a submission and format.
   */
  static async saveShareCard(
    submissionId: string,
    format: ShareFormat,
    storageKey: string
  ) {
    return await prisma.shareCard.upsert({
      where: {
        submission_id_format: {
          submission_id: submissionId,
          format,
        },
      },
      create: {
        submission_id: submissionId,
        format,
        storage_key: storageKey,
      },
      update: {
        storage_key: storageKey,
        generated_at: new Date(),
      },
    });
  }

  /**
   * Finds an existing generated share card.
   */
  static async findShareCard(submissionId: string, format: ShareFormat) {
    return await prisma.shareCard.findUnique({
      where: {
        submission_id_format: {
          submission_id: submissionId,
          format,
        },
      },
    });
  }
}
