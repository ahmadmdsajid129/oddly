/**
 * @file lane-history-signature.job.ts
 * @package @oddly/worker
 *
 * Nightly worker job for aggregating trailing 28-day BitMinHash history signatures (Stage L3 / Phase 10N / P10N.02 / ADR-047).
 *
 * Invariants:
 * 1. Compact Fixed Size: Exactly 32 bytes (256 bits) per player per lane.
 * 2. 28-Day Rolling Window: Examines active answers within [now - 28 days, now].
 * 3. Idempotent: Can be safely re-run without duplicate accumulation or drift.
 * 4. DPDP & Account Erasure Invariant: Permanently deleted upon DPDP account deletion or history toggle off.
 */

import { prisma } from "../db.js";
import { computeBitMinHashSignature } from "@oddly/shared";

export interface LaneHistoryJobResult {
  lanesProcessed: number;
  playersProcessed: number;
  signaturesUpdated: number;
  skippedInactive: number;
}

export class UpdateLaneHistorySignatureJob {
  static readonly HISTORY_WINDOW_DAYS = 28;

  /**
   * Runs the batch signature aggregation for all active lanes on a given reference date.
   */
  static async runBatchAggregation(
    targetDate: Date = new Date(),
    specificLaneId?: string
  ): Promise<LaneHistoryJobResult> {
    const windowStart = new Date(targetDate.getTime() - this.HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    // 1. Identify candidate lanes (open lanes or specified lane)
    const lanes = await prisma.lane.findMany({
      where: specificLaneId
        ? { id: specificLaneId }
        : { status: { in: ["open", "preview"] } },
      select: { id: true, slug: true },
    });

    let totalPlayers = 0;
    let signaturesUpdated = 0;
    let skippedInactive = 0;

    for (const lane of lanes) {
      // Find players who submitted answers in this lane today
      const todaySubmissions = await prisma.submission.findMany({
        where: {
          lane_id: lane.id,
          drop_date: {
            gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
          },
        },
        select: { player_id: true },
        distinct: ["player_id"],
      });

      const playerIds = todaySubmissions.map((s) => s.player_id);
      totalPlayers += playerIds.length;

      for (const playerId of playerIds) {
        // Fetch all submissions for this player in this lane over the past 28 days
        const pastSubmissions = await prisma.submission.findMany({
          where: {
            lane_id: lane.id,
            player_id: playerId,
            drop_date: {
              gte: windowStart,
              lte: targetDate,
            },
          },
          select: {
            drop_date: true,
            answers: true,
          },
          orderBy: { drop_date: "desc" },
        });

        if (pastSubmissions.length === 0) {
          skippedInactive++;
          continue;
        }

        // Count distinct active days in the trailing 28-day window
        const distinctDates = new Set(
          pastSubmissions.map((s) => s.drop_date.toISOString().split("T")[0])
        );
        const daysActive = distinctDates.size;

        // Collect all answers across past submissions
        const allAnswers: Array<{ question_id: string; value: unknown }> = [];
        for (const sub of pastSubmissions) {
          if (Array.isArray(sub.answers)) {
            for (const a of sub.answers) {
              if (a && typeof a === "object" && "question_id" in a && "value" in a) {
                allAnswers.push({
                  question_id: String((a as { question_id: unknown }).question_id),
                  value: (a as { value: unknown }).value,
                });
              }
            }
          }
        }

        // Compute 32-byte BitMinHash signature
        const signatureBytes = computeBitMinHashSignature(allAnswers);
        const signatureBuffer = Buffer.from(signatureBytes);

        // Upsert signature in lane_history_signatures
        await prisma.laneHistorySignature.upsert({
          where: {
            player_id_lane_id: {
              player_id: playerId,
              lane_id: lane.id,
            },
          },
          update: {
            signature: signatureBuffer,
            days_active: daysActive,
            updated_at: new Date(),
          },
          create: {
            player_id: playerId,
            lane_id: lane.id,
            signature: signatureBuffer,
            days_active: daysActive,
            updated_at: new Date(),
          },
        });

        signaturesUpdated++;
      }
    }

    return {
      lanesProcessed: lanes.length,
      playersProcessed: totalPlayers,
      signaturesUpdated,
      skippedInactive,
    };
  }

  /**
   * Deletes all history signatures for a player upon DPDP account erasure.
   */
  static async purgePlayerSignatures(playerId: string): Promise<number> {
    const deleted = await prisma.laneHistorySignature.deleteMany({
      where: { player_id: playerId },
    });
    return deleted.count;
  }
}

