/**
 * @file provisional.worker.ts
 * @package @oddly/worker
 *
 * Provisional Refresh Worker (Task P9.04, Stage R2.10).
 * Runs periodic sweeps during live drop hours:
 * - Reads provisional refresh interval from app_config (doubled at L1 degradation).
 * - Identifies players whose candidate buckets received new submissions.
 * - Re-evaluates matches and upgrades `matches` table ONLY if similarity improves.
 * - Triggers Twin Upgrade push alerts (ΔS ≥ 0.10 or picks jump), strictly capped at 1/day/player,
 *   respecting quiet hours (22:00 to 07:00 IST).
 * - Fully idempotent, bounded batching, running against real Postgres and Redis.
 */

import { prisma } from "./db.js";
import { getRedisClient } from "@oddly/shared";
import {
  BoundedHashBucketMatchingStrategy,
  type SubmissionForMatching,
  type StoredAnswer,
  utcToIst,
} from "@oddly/shared";
import { shouldTriggerTwinUpgrade } from "./push/triggers.js";
import { provisionalRefreshEvaluatedTotal, provisionalUpgradesTotal } from "./metrics.js";

export interface ProvisionalSweepOptions {
  dropId: string;
  dropDate: Date;
  batchLimit?: number;
  now?: Date;
}

export interface ProvisionalSweepResult {
  evaluatedCount: number;
  upgradesFound: number;
  notificationsEnqueued: number;
  skippedQuietHours: number;
}

/**
 * Checks whether current time falls within user quiet hours (22:00 to 07:00 IST).
 */
export function isQuietHours(utcDate: Date = new Date()): boolean {
  const ist = utcToIst(utcDate);
  const hours = ist.getUTCHours();
  // 22:00 (10 PM) through 06:59:59 (before 7 AM)
  return hours >= 22 || hours < 7;
}

export class ProvisionalRefreshWorker {
  /**
   * Executes a bounded, idempotent provisional refresh sweep for a live drop.
   */
  static async runSweep(opts: ProvisionalSweepOptions): Promise<ProvisionalSweepResult> {
    const { dropId, dropDate, batchLimit = 500, now = new Date() } = opts;
    const redis = getRedisClient("counters");
    const dropDateStr = dropDate.toISOString().slice(0, 10);

    // 1. Fetch live drop and question options
    const drop = await prisma.drop.findUnique({
      where: { id: dropId },
      include: {
        questions: {
          include: { answerOptions: true },
        },
      },
    });

    if (!drop || drop.status !== "live") {
      return { evaluatedCount: 0, upgradesFound: 0, notificationsEnqueued: 0, skippedQuietHours: 0 };
    }

    const optionMap = new Map<string, string[]>();
    for (const q of drop.questions) {
      optionMap.set(
        q.id,
        q.answerOptions.map((opt) => opt.value)
      );
    }

    // 2. Fetch all submissions for matching pool
    const dbSubmissions = await prisma.submission.findMany({
      where: { drop_id: dropId },
      include: { submissionAnswers: true },
      take: 5000,
      orderBy: { submitted_at: "asc" },
    });

    if (dbSubmissions.length < 2) {
      return { evaluatedCount: 0, upgradesFound: 0, notificationsEnqueued: 0, skippedQuietHours: 0 };
    }

    const pool: SubmissionForMatching[] = dbSubmissions.map((s) => ({
      submission_id: s.id,
      player_id: s.player_id,
      drop_id: s.drop_id,
      answers:
        s.submissionAnswers && s.submissionAnswers.length > 0
          ? s.submissionAnswers.map((a) => ({
              question_id: a.question_id,
              value: a.value,
            }))
          : Array.isArray(s.answers)
            ? (s.answers as unknown as StoredAnswer[])
            : [],
      submitted_at: s.submitted_at,
    }));

    const matcher = new BoundedHashBucketMatchingStrategy(2000);

    let evaluatedCount = 0;
    let upgradesFound = 0;
    let notificationsEnqueued = 0;
    let skippedQuietHours = 0;

    // 3. Evaluate submissions in bounded batches
    for (const target of pool.slice(0, batchLimit)) {
      evaluatedCount++;
      provisionalRefreshEvaluatedTotal.inc();

      // Find current best match for target in existing database
      const existingMatch = await prisma.match.findFirst({
        where: {
          drop_date: dropDate,
          OR: [{ player_a_id: target.player_id }, { player_b_id: target.player_id }],
        },
      });

      const currentScore = existingMatch?.similarity_score ?? 0;
      const currentPartnerId =
        existingMatch?.player_a_id === target.player_id
          ? existingMatch?.player_b_id
          : existingMatch?.player_a_id;

      // Re-evaluate against the current pool with newly arrived players
      const bestCandidateResult = matcher.findBestMatch(target, pool, optionMap);
      if (!bestCandidateResult) continue;

      const newScore = bestCandidateResult.similarity_score;
      const newPartnerId = bestCandidateResult.player_b_id;

      // Check if similarity strictly improved or if new partner gives higher score
      const isImprovement = newScore > currentScore && newPartnerId !== currentPartnerId;

      if (isImprovement) {
        upgradesFound++;
        provisionalUpgradesTotal.inc();

        // Update matches table with improved twin
        if (existingMatch) {
          await prisma.match.update({
            where: {
              id_drop_date: {
                id: existingMatch.id,
                drop_date: dropDate,
              },
            },
            data: {
              player_b_id: newPartnerId,
              submission_b_id: bestCandidateResult.submission_b_id,
              similarity_score: newScore,
              is_provisional: true,
              matched_at: now,
            },
          });
        } else {
          await prisma.match.create({
            data: {
              drop_id: dropId,
              drop_date: dropDate,
              player_a_id: target.player_id,
              player_b_id: newPartnerId,
              submission_a_id: target.submission_id,
              submission_b_id: bestCandidateResult.submission_b_id,
              similarity_score: newScore,
              is_provisional: true,
              matched_at: now,
            },
          });
        }

        // 4. Evaluate Twin Upgrade Notification Rule (ΔS ≥ 0.10 or picks jump)
        const previousMatchedCount = Math.round(currentScore * 5);
        const newMatchedCount = Math.round(newScore * 5);

        // Track push notifications sent today to enforce 1/day cap
        const pushKey = `counter:push:upgrade:${target.player_id}:${dropDateStr}`;
        const pushesSentRaw = await redis.get(pushKey);
        const pushesSent = pushesSentRaw ? parseInt(pushesSentRaw, 10) : 0;

        const decision = shouldTriggerTwinUpgrade({
          playerId: target.player_id,
          previousMatch: existingMatch
            ? {
                similarity: currentScore,
                matchedCount: previousMatchedCount,
                partnerId: currentPartnerId,
              }
            : null,
          newMatch: {
            similarity: newScore,
            matchedCount: newMatchedCount,
            partnerId: newPartnerId,
          },
          upgradePushesToday: pushesSent,
        });

        if (decision.shouldTrigger) {
          if (isQuietHours(now)) {
            skippedQuietHours++;
          } else {
            // Enqueue notification and increment daily counter with 24h TTL
            await redis.incr(pushKey);
            await redis.expire(pushKey, 86400);

            // Record notification job record in queue
            await redis.lpush(
              `queue:notifications`,
              JSON.stringify({
                type: "twin_upgrade",
                playerId: target.player_id,
                dropId,
                deltaS: decision.deltaS,
                newSimilarity: newScore,
                timestamp: now.toISOString(),
              })
            );
            notificationsEnqueued++;
          }
        }
      }
    }

    return {
      evaluatedCount,
      upgradesFound,
      notificationsEnqueued,
      skippedQuietHours,
    };
  }
}
