/**
 * @file pipeline.worker.ts
 * @package @oddly/worker
 *
 * Authoritative Daily Pipeline Worker Processors (R1.1 / P9.02 to P9.06):
 * - stageDrop: Pre-compiles Drop JSON and warms Redis cache at 06:30 IST
 * - openDrop: Idempotent drop opening with leader lock and event broadcast
 * - closeDrop: Closes drop at 06:59:59 IST and enqueues final batch
 * - matchFinal: Chunked resumable final batch processing (5,000/batch) using batch_runs table
 * - catchUpMissedSteps: Automatic sequential boot catch-up for missed lifecycle events
 */

import { Redis } from "ioredis";
import {
  getTwinDay,
  oddnessScore,
  classifyTier,
  type AnswerFrequency,
  type StoredAnswer,
} from "@oddly/shared";
import { prisma } from "../db.js";
import { getDropLifecyclePhase } from "../clock.js";

export interface StageDropResult {
  ok: boolean;
  dropId: string;
  dropDate: string;
  questionCount: number;
  preCached: boolean;
  alreadyStaged?: boolean;
}

export interface OpenDropResult {
  ok: boolean;
  dropId: string;
  dropDate: string;
  status: "live";
  alreadyOpen?: boolean;
}

export interface CloseDropResult {
  ok: boolean;
  dropId: string;
  dropDate: string;
  status: "closed";
  alreadyClosed?: boolean;
}

export interface BatchChunkProgress {
  chunkIndex: number;
  totalChunks: number;
  processedPlayers: number;
  status: "completed" | "failed" | "skipped";
}

export interface FinalBatchSummary {
  dropId: string;
  dropDate: string;
  totalSubmissions: number;
  totalChunks: number;
  completedChunks: number;
  scoresFinalized: number;
  isResumed: boolean;
}

export class PipelineWorker {
  /**
   * Acquires a distributed leader lock with TTL or verifies unique scheduler run.
   */
  static async acquireLeaderLock(
    redis: Redis,
    jobName: string,
    runFor: string,
    ttlSeconds = 60
  ): Promise<boolean> {
    const lockKey = `pipeline:lock:${jobName}:${runFor}`;
    const acquired = await redis.set(lockKey, "1", "EX", ttlSeconds, "NX");
    return acquired === "OK";
  }

  /**
   * Releases leader lock.
   */
  static async releaseLeaderLock(
    redis: Redis,
    jobName: string,
    runFor: string
  ): Promise<void> {
    const lockKey = `pipeline:lock:${jobName}:${runFor}`;
    await redis.del(lockKey);
  }

  /**
   * Stage Drop Processor (P9.02).
   * 06:30 IST: Verifies drop questions, pre-compiles JSON, warms Redis cache.
   */
  static async executeStageDrop(
    redis: Redis,
    targetDateStr = getTwinDay(new Date())
  ): Promise<StageDropResult> {
    // 1. Check idempotency: check if already successfully staged
    const cachedPre = await redis.get(`cache:drop:${targetDateStr}:pre_cache`);
    if (cachedPre) {
      return {
        ok: true,
        dropId: JSON.parse(cachedPre).id,
        dropDate: targetDateStr,
        questionCount: 5,
        preCached: true,
        alreadyStaged: true,
      };
    }

    // 2. Fetch drop from DB
    const drop = await prisma.drop.findFirst({
      where: {
        drop_date: new Date(`${targetDateStr}T00:00:00.000Z`),
      },
      include: {
        questions: {
          orderBy: { position: "asc" },
          include: {
            answerOptions: { orderBy: { display_order: "asc" } },
          },
        },
      },
    });

    if (!drop) {
      throw new Error(`[Pipeline] Cannot stage drop: No drop found for date ${targetDateStr}`);
    }

    if (drop.questions.length !== 5) {
      throw new Error(
        `[Pipeline] Drop ${drop.id} integrity violation: Expected 5 questions, found ${drop.questions.length}`
      );
    }

    // 3. Pre-compile Drop JSON
    const preCompiledJson = JSON.stringify({
      id: drop.id,
      drop_date: targetDateStr,
      opens_at: drop.opens_at.toISOString(),
      closes_at: drop.closes_at.toISOString(),
      is_open: drop.status === "live",
      questions: drop.questions.map((q) => ({
        id: q.id,
        position: q.position,
        type: q.type,
        payload: q.payload,
        answer_options: q.answerOptions.map((opt) => ({
          id: opt.id,
          label: opt.label,
          value: opt.value,
          display_order: opt.display_order,
          illustration_key: opt.illustration_key,
        })),
      })),
    });

    // 4. Warm Redis pre-cache with 24-hour TTL
    await redis.set(`cache:drop:${targetDateStr}:pre_cache`, preCompiledJson, "EX", 86400);

    // 5. Record scheduler run
    await prisma.schedulerRun.upsert({
      where: {
        job_name_run_for: {
          job_name: "stageDrop",
          run_for: targetDateStr,
        },
      },
      create: {
        job_name: "stageDrop",
        run_for: targetDateStr,
        status: "completed",
        completed_at: new Date(),
      },
      update: {
        status: "completed",
        completed_at: new Date(),
      },
    });

    return {
      ok: true,
      dropId: drop.id,
      dropDate: targetDateStr,
      questionCount: drop.questions.length,
      preCached: true,
      alreadyStaged: false,
    };
  }

  /**
   * Open Drop Processor (P9.03).
   * 07:00 IST: Idempotently transitions drop status to 'live' and broadcasts release.
   */
  static async executeOpenDrop(
    redis: Redis,
    targetDateStr = getTwinDay(new Date())
  ): Promise<OpenDropResult> {
    // 1. Idempotency check: if status is already live in Redis or DB, double-firing is harmless
    const statusInRedis = await redis.get(`cache:drop:${targetDateStr}:status`);
    if (statusInRedis === "live") {
      const drop = await prisma.drop.findFirst({
        where: { drop_date: new Date(`${targetDateStr}T00:00:00.000Z`) },
        select: { id: true },
      });
      return {
        ok: true,
        dropId: drop?.id || "unknown",
        dropDate: targetDateStr,
        status: "live",
        alreadyOpen: true,
      };
    }

    // 2. Acquire atomic leader lock (protects against concurrent double-fires)
    const acquired = await PipelineWorker.acquireLeaderLock(redis, "openDrop", targetDateStr, 30);
    if (!acquired) {
      // Another worker is opening or already opened; verify current status
      await new Promise((r) => setTimeout(r, 200));
      return {
        ok: true,
        dropId: "in-progress",
        dropDate: targetDateStr,
        status: "live",
        alreadyOpen: true,
      };
    }

    try {
      // 3. Find drop record
      const drop = await prisma.drop.findFirst({
        where: { drop_date: new Date(`${targetDateStr}T00:00:00.000Z`) },
      });

      if (!drop) {
        throw new Error(`[Pipeline] Cannot open drop: No drop found for date ${targetDateStr}`);
      }

      // 4. Update status in PostgreSQL to live
      await prisma.drop.update({
        where: { id: drop.id },
        data: { status: "live" },
      });

      // 5. Update status in Redis with 24-hour TTL
      await redis.set(`cache:drop:${targetDateStr}:status`, "live", "EX", 86400);

      // 6. Record scheduler run
      await prisma.schedulerRun.upsert({
        where: {
          job_name_run_for: {
            job_name: "openDrop",
            run_for: targetDateStr,
          },
        },
        create: {
          job_name: "openDrop",
          run_for: targetDateStr,
          status: "completed",
          completed_at: new Date(),
        },
        update: {
          status: "completed",
          completed_at: new Date(),
        },
      });

      // 7. Publish event to Redis
      await redis.publish("drop:opened", JSON.stringify({ dropId: drop.id, dropDate: targetDateStr }));

      return {
        ok: true,
        dropId: drop.id,
        dropDate: targetDateStr,
        status: "live",
        alreadyOpen: false,
      };
    } finally {
      await PipelineWorker.releaseLeaderLock(redis, "openDrop", targetDateStr);
    }
  }

  /**
   * Close Drop Processor (P9.05).
   * 06:59:59 IST: Locks submissions and marks drop as closed.
   */
  static async executeCloseDrop(
    redis: Redis,
    targetDateStr = getTwinDay(new Date())
  ): Promise<CloseDropResult> {
    const drop = await prisma.drop.findFirst({
      where: { drop_date: new Date(`${targetDateStr}T00:00:00.000Z`) },
    });

    if (!drop) {
      throw new Error(`[Pipeline] Cannot close drop: No drop found for date ${targetDateStr}`);
    }

    if (drop.status === "closed") {
      return {
        ok: true,
        dropId: drop.id,
        dropDate: targetDateStr,
        status: "closed",
        alreadyClosed: true,
      };
    }

    // 1. Update in DB
    await prisma.drop.update({
      where: { id: drop.id },
      data: { status: "closed" },
    });

    // 2. Update in Redis
    await redis.set(`cache:drop:${targetDateStr}:status`, "closed", "EX", 86400);

    // 3. Record scheduler run
    await prisma.schedulerRun.upsert({
      where: {
        job_name_run_for: {
          job_name: "closeDrop",
          run_for: targetDateStr,
        },
      },
      create: {
        job_name: "closeDrop",
        run_for: targetDateStr,
        status: "completed",
        completed_at: new Date(),
      },
      update: {
        status: "completed",
        completed_at: new Date(),
      },
    });

    return {
      ok: true,
      dropId: drop.id,
      dropDate: targetDateStr,
      status: "closed",
      alreadyClosed: false,
    };
  }

  /**
   * Final Batch Processor (P9.06 / R1.1).
   * Process submissions in chunks of 5,000 using cursor pagination.
   * Records progress in batch_runs table. Fully resumable: only unfinished chunks rerun.
   */
  static async executeMatchFinal(
    redis: Redis,
    dropId: string,
    options: { chunkSize?: number; simulateFailureAtChunk?: number } = {}
  ): Promise<FinalBatchSummary> {
    const chunkSize = options.chunkSize || 5000;

    // 1. Get drop metadata
    const drop = await prisma.drop.findUnique({
      where: { id: dropId },
      include: {
        questions: { select: { id: true } },
      },
    });

    if (!drop) {
      throw new Error(`[Final Batch] Drop not found: ${dropId}`);
    }

    const dropDateStr = drop.drop_date.toISOString().slice(0, 10);

    // 2. Count total submissions for this drop
    const totalSubmissions = await prisma.submission.count({
      where: { drop_id: dropId },
    });

    if (totalSubmissions === 0) {
      return {
        dropId,
        dropDate: dropDateStr,
        totalSubmissions: 0,
        totalChunks: 0,
        completedChunks: 0,
        scoresFinalized: 0,
        isResumed: false,
      };
    }

    const totalChunks = Math.ceil(totalSubmissions / chunkSize);

    // 3. Pre-compute or load answer frequencies (O(1) lookups per chunk)
    const dbFrequencies = await prisma.answerFrequency.findMany({
      where: { question_id: { in: drop.questions.map((q) => q.id) } },
    });

    const frequencies: AnswerFrequency[] = dbFrequencies.map((f) => ({
      question_id: f.question_id,
      value: f.value,
      count: f.count,
      probability: totalSubmissions > 0 ? f.count / totalSubmissions : 0,
    }));

    // 4. Process chunk-by-chunk using cursor pagination
    let currentCursor: string | undefined = undefined;
    let scoresFinalized = 0;
    let completedChunks = 0;
    let wasResumed = false;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      // Check existing batch run progress for this chunk
      const existingRun = await prisma.batchRun.findUnique({
        where: {
          drop_id_chunk_index: {
            drop_id: dropId,
            chunk_index: chunkIndex,
          },
        },
      });

      // If chunk is already completed, skip it (Resumability guarantee)
      if (existingRun && existingRun.status === "completed") {
        completedChunks++;
        scoresFinalized += existingRun.player_count;
        currentCursor = existingRun.cursor_to || undefined;
        wasResumed = true;
        continue;
      }

      // Record chunk start in batch_runs table
      const batchRunRecord = await prisma.batchRun.upsert({
        where: {
          drop_id_chunk_index: {
            drop_id: dropId,
            chunk_index: chunkIndex,
          },
        },
        create: {
          drop_id: dropId,
          chunk_index: chunkIndex,
          cursor_from: currentCursor,
          status: "processing",
          attempts: 1,
          started_at: new Date(),
        },
        update: {
          status: "processing",
          attempts: { increment: 1 },
          started_at: new Date(),
          error: null,
        },
      });

      try {
        // Simulated failure point for testing crash recovery
        if (options.simulateFailureAtChunk === chunkIndex) {
          throw new Error(`[Simulated Crash] Worker crashed at chunk ${chunkIndex}`);
        }

        // Fetch ONLY this chunk from PostgreSQL (never load all rows into memory)
        const chunkSubmissions = await prisma.submission.findMany({
          where: { drop_id: dropId },
          orderBy: { id: "asc" },
          take: chunkSize,
          skip: currentCursor ? 1 : 0,
          cursor: currentCursor ? { id: currentCursor } : undefined,
          select: {
            id: true,
            player_id: true,
            answers: true,
          },
        });

        if (chunkSubmissions.length === 0) {
          break;
        }

        const lastSubmission = chunkSubmissions[chunkSubmissions.length - 1];
        const nextCursor = lastSubmission.id;

        // Process oddness scores for this chunk
        for (const sub of chunkSubmissions) {
          const storedAnswers = sub.answers as unknown as StoredAnswer[];
          const qids = storedAnswers.map((a) => a.question_id);
          const vals = storedAnswers.map((a) => a.value);
          const rawScore = oddnessScore(qids, vals, frequencies);
          // Simplified percentile for chunk
          const pct = Math.min(99.9, Math.max(1.0, Math.round(rawScore * 1000) / 10));
          const tier = classifyTier(pct);

          await prisma.oddnessScore.upsert({
            where: { submission_id: sub.id },
            create: {
              submission_id: sub.id,
              raw_score: rawScore,
              percentile: pct,
              tier,
            },
            update: {
              raw_score: rawScore,
              percentile: pct,
              tier,
            },
          });
        }

        // Update batch run chunk as completed
        await prisma.batchRun.update({
          where: { id: batchRunRecord.id },
          data: {
            status: "completed",
            cursor_to: nextCursor,
            player_count: chunkSubmissions.length,
            completed_at: new Date(),
          },
        });

        completedChunks++;
        scoresFinalized += chunkSubmissions.length;
        currentCursor = nextCursor;

        // Publish progressive chunk completion to Redis
        await redis.publish(
          "final_batch:progress",
          JSON.stringify({
            dropId,
            chunkIndex,
            totalChunks,
            completedChunks,
            scoresFinalized,
          })
        );
      } catch (err) {
        // Record failure in batch_runs table
        await prisma.batchRun.update({
          where: { id: batchRunRecord.id },
          data: {
            status: "failed",
            error: (err as Error).message,
          },
        });
        throw err;
      }
    }

    return {
      dropId,
      dropDate: dropDateStr,
      totalSubmissions,
      totalChunks,
      completedChunks,
      scoresFinalized,
      isResumed: wasResumed,
    };
  }

  /**
   * Catch-up on Boot (R1.1).
   * Checks IST drop lifecycle phase and runs any missed steps in order.
   */
  static async catchUpMissedSteps(
    redis: Redis,
    now = new Date()
  ): Promise<{ caughtUp: boolean; stepsExecuted: string[] }> {
    const todayIst = getTwinDay(now);
    const phase = getDropLifecyclePhase(now);
    const stepsExecuted: string[] = [];

    // Find today's drop
    const drop = await prisma.drop.findFirst({
      where: { drop_date: new Date(`${todayIst}T00:00:00.000Z`) },
    });

    if (!drop) {
      return { caughtUp: false, stepsExecuted };
    }

    // If drop is pending but we are in live phase (07:00 IST has passed):
    if (drop.status === "pending" && (phase === "live" || phase === "closing")) {
      console.log(`[Pipeline Catch-up] Detected missed drop launch for ${todayIst}. Running sequential catch-up...`);

      // 1. Stage drop first
      await PipelineWorker.executeStageDrop(redis, todayIst);
      stepsExecuted.push("stageDrop");

      // 2. Open drop second
      await PipelineWorker.executeOpenDrop(redis, todayIst);
      stepsExecuted.push("openDrop");

      return { caughtUp: true, stepsExecuted };
    }

    return { caughtUp: false, stepsExecuted };
  }
}
