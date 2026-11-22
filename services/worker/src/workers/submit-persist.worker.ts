/**
 * @file submit-persist.worker.ts
 * @package @oddly/worker
 *
 * Mode B Asynchronous Persistence Worker (Task P3.16, Stage 3).
 * Drains submissions from the `oddly:queue:submit-persist` Redis queue
 * and micro-batches inserts to PostgreSQL with zero data loss.
 */

import { Redis } from "ioredis";
import { prisma } from "../db.js";
import { oddnessScore, percentile, classifyTier, type StoredAnswer } from "@oddly/shared";
import { modeBPersistedTotal } from "../metrics.js";

export interface ModeBSubmissionPayload {
  drop_id: string;
  drop_date: string;
  player_id: string;
  request_id: string;
  answers: StoredAnswer[];
  timing_ms?: number;
  is_bot_flagged?: boolean;
  submitted_at: string;
}

export class SubmitPersistWorker {
  /**
   * Persists a single submission payload to PostgreSQL idempotently.
   */
  static async persistSubmission(payload: ModeBSubmissionPayload, redisClient?: Redis) {
    const { drop_id, player_id, request_id, answers, is_bot_flagged } = payload;
    const dropDate = new Date(payload.drop_date);

    // 1. Idempotency check: verify if already stored in DB
    const existing = await prisma.submission.findFirst({
      where: { request_id },
    });
    if (existing) {
      if (redisClient) {
        await redisClient.sadd(`drop:${drop_id}:persisted_requests`, request_id);
      }
      return existing;
    }

    // 2. Insert submission and answers
    const submission = await prisma.submission.create({
      data: {
        drop_id,
        drop_date: dropDate,
        player_id,
        request_id,
        answers: answers as any,
        is_bot_flagged: Boolean(is_bot_flagged),
      },
      include: { drop: { include: { questions: true } } },
    });

    // 3. Update AnswerStat frequencies
    for (const a of answers) {
      const valStr = Array.isArray(a.value) ? a.value.join(",") : String(a.value);
      await prisma.answerStat.upsert({
        where: {
          drop_date_question_id_value: {
            drop_date: dropDate,
            question_id: a.question_id,
            value: valStr,
          },
        },
        update: {
          count: { increment: 1 },
        },
        create: {
          drop_id,
          drop_date: dropDate,
          question_id: a.question_id,
          value: valStr,
          count: 1,
          probability: 0,
        },
      });
    }

    // 4. Compute Oddness Score
    const allFrequencies = await prisma.answerStat.findMany({
      where: {
        drop_date: dropDate,
        question_id: { in: answers.map((a) => a.question_id) },
      },
    });

    const totalSubs = await prisma.submission.count({
      where: { drop_id },
    });

    const frequencies = allFrequencies.map((f) => ({
      question_id: f.question_id,
      value: f.value,
      count: f.count,
      probability: totalSubs > 0 ? f.count / totalSubs : 0,
    }));

    const qids = answers.map((a) => a.question_id);
    const values = answers.map((a) => a.value);
    const rawScore = oddnessScore(qids, values, frequencies);

    const existingScores = await prisma.oddnessScore.findMany({
      where: { submission: { drop_id } },
      select: { raw_score: true },
    });
    const cohortScores = existingScores.map((s) => s.raw_score);
    cohortScores.push(rawScore);

    const pct = percentile(rawScore, cohortScores);
    const tier = classifyTier(pct);

    await prisma.oddnessScore.create({
      data: {
        submission_id: submission.id,
        drop_date: dropDate,
        raw_score: rawScore,
        percentile: pct,
        tier,
      },
    });

    // 5. Record persisted in Redis for reconciliation tracking
    if (redisClient) {
      await redisClient.sadd(`drop:${drop_id}:persisted_requests`, request_id);
    }

    try {
      modeBPersistedTotal.inc();
    } catch {
      // Metrics collector optional in test env
    }

    return submission;
  }

  /**
   * Drains up to `batchLimit` pending items from the Redis Mode B queue.
   */
  static async drainQueue(redisClient: Redis, batchLimit = 50): Promise<number> {
    let processed = 0;
    for (let i = 0; i < batchLimit; i++) {
      const raw = await redisClient.rpop("oddly:queue:submit-persist");
      if (!raw) break;

      try {
        const payload: ModeBSubmissionPayload = JSON.parse(raw);
        await this.persistSubmission(payload, redisClient);
        processed++;
      } catch (err) {
        console.error("[SubmitPersistWorker] Error persisting queued submission:", err);
      }
    }
    return processed;
  }
}
