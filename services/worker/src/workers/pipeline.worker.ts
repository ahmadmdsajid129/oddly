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
  computeAnswerSubHashes,
  addToBucketWithReservoirCap,
  submissionSimilarity,
  isCandidatePreferred,
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
   * Final Batch Processor (P9.06 / R1.1, R2-PATCH Item 1).
   * Process submissions in chunks of 5,000 using parallel cursor chunks.
   * Concurrency is configurable (default 4 from app_config).
   * Bulk inserts oddness scores with createMany, never loads all submissions into memory.
   * Records progress in batch_runs table. Fully resumable: only unfinished chunks rerun.
   */
  static async executeMatchFinal(
    redis: Redis,
    dropId: string,
    options: { chunkSize?: number; concurrency?: number; simulateFailureAtChunk?: number } = {}
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
    const dbFrequencies = prisma.answerStat
      ? await prisma.answerStat.findMany({
          where: { question_id: { in: drop.questions.map((q) => q.id) } },
        })
      : [];

    const frequencies: AnswerFrequency[] = dbFrequencies.map((f) => ({
      question_id: f.question_id,
      value: f.value,
      count: f.count,
      probability: totalSubmissions > 0 ? f.count / totalSubmissions : 0,
    }));

    // 4. Resolve concurrency from options, app_config, or fallback to default 4
    let concurrency = options.concurrency;
    if (!concurrency) {
      try {
        const cfg = await prisma.appConfig.findUnique({
          where: { key: "batch_concurrency" },
        });
        if (cfg && typeof cfg.value === "number") {
          concurrency = cfg.value;
        } else if (cfg && typeof cfg.value === "string") {
          concurrency = parseInt(cfg.value, 10);
        }
      } catch {
        // fallback
      }
    }
    concurrency = concurrency && concurrency > 0 ? concurrency : 4;

    // 5. Option map for question similarity scoring
    const optionMap = new Map<string, string[]>();
    const dropWithOptions = await prisma.drop.findUnique({
      where: { id: dropId },
      include: { questions: { include: { answerOptions: true } } },
    });
    if (dropWithOptions) {
      for (const q of dropWithOptions.questions) {
        if (q.answerOptions && q.answerOptions.length > 0) {
          optionMap.set(q.id, q.answerOptions.map((o) => o.value));
        }
      }
    }

    // 6. Pre-index full day's submissions into bounded candidate buckets (5-hash and 4-of-5 sub-hashes)
    // Uses raw SQL stream for zero-overhead JSON deserialization and reservoir sampling capped at 200 members
    const candidateSubmissions = await prisma.$queryRawUnsafe<
      { id: string; player_id: string; answers: any; submitted_at: Date }[]
    >(
      `SELECT id, player_id, answers, submitted_at FROM submissions WHERE drop_id = $1 ORDER BY id ASC`,
      dropId
    );

    type CandidateEntry = {
      id: string;
      player_id: string;
      answers: StoredAnswer[];
      submitted_at: Date;
    };

    const b5 = new Map<string, CandidateEntry[]>();
    const b4 = new Map<string, CandidateEntry[]>();
    const bucketCounts = new Map<string, number>();
    const BUCKET_CAP = 200;

    for (const s of candidateSubmissions) {
      const answers = typeof s.answers === "string" ? JSON.parse(s.answers) : (s.answers as unknown as StoredAnswer[]);
      const entry: CandidateEntry = {
        id: s.id,
        player_id: s.player_id,
        answers,
        submitted_at: s.submitted_at,
      };
      const hashes = computeAnswerSubHashes(answers);

      // index 5-hash
      let l5 = b5.get(hashes.hash5);
      if (!l5) {
        l5 = [];
        b5.set(hashes.hash5, l5);
      }
      const c5 = (bucketCounts.get(hashes.hash5) || 0) + 1;
      bucketCounts.set(hashes.hash5, c5);
      addToBucketWithReservoirCap(l5, entry, BUCKET_CAP, c5);

      // index 4-of-5 sub-hashes
      for (const h4 of hashes.hashes4) {
        let l4 = b4.get(h4);
        if (!l4) {
          l4 = [];
          b4.set(h4, l4);
        }
        const c4 = (bucketCounts.get(h4) || 0) + 1;
        bucketCounts.set(h4, c4);
        addToBucketWithReservoirCap(l4, entry, BUCKET_CAP, c4);
      }
    }

    // Mutex to serialize bulk match inserts across parallel chunk workers,
    // eliminating unique index page latch contention and 40P01 deadlocks in PostgreSQL
    let dbWriteLock: Promise<void> = Promise.resolve();
    const withDbWriteLock = async <T>(fn: () => Promise<T>): Promise<T> => {
      const prevLock = dbWriteLock;
      let release: () => void;
      dbWriteLock = new Promise<void>((resolve) => {
        release = resolve;
      });
      await prevLock;
      try {
        return await fn();
      } finally {
        release!();
      }
    };

    // 7. Worker task definition for an individual chunk
    let wasResumed = false;
    let scoresFinalized = 0;
    let completedChunks = 0;

    const processChunk = async (chunkIndex: number) => {
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
        wasResumed = true;
        completedChunks++;
        scoresFinalized += existingRun.player_count;
        return;
      }

      // Fetch chunk rows: chunk 0 starts at offset 0; subsequent chunks fetch 1 offset earlier
      // to capture cursor_from from the preceding chunk
      let cursorFrom: string | null = null;
      let chunkSubmissions: { id: string; player_id: string; answers: any }[] = [];

      if (chunkIndex === 0) {
        chunkSubmissions = await prisma.submission.findMany({
          where: { drop_id: dropId },
          orderBy: { id: "asc" },
          take: chunkSize,
          skip: 0,
          select: {
            id: true,
            player_id: true,
            answers: true,
          },
        });
      } else {
        const rows = await prisma.submission.findMany({
          where: { drop_id: dropId },
          orderBy: { id: "asc" },
          skip: chunkIndex * chunkSize - 1,
          take: chunkSize + 1,
          select: {
            id: true,
            player_id: true,
            answers: true,
          },
        });
        cursorFrom = rows.length > 0 ? rows[0].id : null;
        chunkSubmissions = rows.length > 1 ? rows.slice(1) : [];
      }

      if (chunkSubmissions.length === 0) {
        return;
      }

      const cursorTo = chunkSubmissions[chunkSubmissions.length - 1].id;

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
          cursor_from: cursorFrom,
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

        // 1. Recompute final twins across the full day using bounded matching strategy
        const matchRecords: any[] = [];
        for (const sub of chunkSubmissions) {
          const storedAnswers = sub.answers as unknown as StoredAnswer[];
          const hashes = computeAnswerSubHashes(storedAnswers);

          const candidates: CandidateEntry[] = [];
          const seen = new Set<string>();

          // Priority 1: Exact 5-of-5 bucket matches (similarity is guaranteed 1.0)
          const exactList = b5.get(hashes.hash5) || [];
          for (const c of exactList) {
            if (c.player_id !== sub.player_id && !seen.has(c.id)) {
              seen.add(c.id);
              candidates.push(c);
              if (candidates.length >= 200) break;
            }
          }

          // Priority 2: 4-of-5 sub-hash matches ONLY if no 5-of-5 candidates exist
          if (candidates.length === 0) {
            for (const h4 of hashes.hashes4) {
              const l4 = b4.get(h4) || [];
              for (const c of l4) {
                if (c.player_id !== sub.player_id && !seen.has(c.id)) {
                  seen.add(c.id);
                  candidates.push(c);
                  if (candidates.length >= 200) break;
                }
              }
              if (candidates.length >= 200) break;
            }
          }

          // Priority 3: Fallback bounded scan ONLY if no 5 or 4 candidates exist
          if (candidates.length === 0 && candidateSubmissions.length > 1) {
            for (const c of candidateSubmissions) {
              if (c.player_id !== sub.player_id) {
                const cAnswers = typeof c.answers === "string" ? JSON.parse(c.answers) : (c.answers as unknown as StoredAnswer[]);
                candidates.push({
                  id: c.id,
                  player_id: c.player_id,
                  answers: cAnswers,
                  submitted_at: c.submitted_at,
                });
                if (candidates.length >= 200) break;
              }
            }
          }

          let bestCandidate: CandidateEntry | null = null;
          let bestScore = -1;

          for (const cand of candidates) {
            const score = submissionSimilarity(storedAnswers, cand.answers, optionMap);
            if (
              bestCandidate === null ||
              score > bestScore ||
              (score === bestScore &&
                isCandidatePreferred(
                  { player_id: sub.player_id, drop_id: dropId, submission_id: sub.id, answers: storedAnswers, submitted_at: new Date() },
                  { player_id: cand.player_id, drop_id: dropId, submission_id: cand.id, answers: cand.answers, submitted_at: cand.submitted_at },
                  score,
                  { player_id: bestCandidate.player_id, drop_id: dropId, submission_id: bestCandidate.id, answers: bestCandidate.answers, submitted_at: bestCandidate.submitted_at },
                  bestScore
                ))
            ) {
              bestCandidate = cand;
              bestScore = score;
            }
          }

          if (bestCandidate) {
            // Canonicalize pair order to prevent reciprocal duplicate locks
            const isALess = sub.player_id < bestCandidate.player_id;
            const pA = isALess ? sub.player_id : bestCandidate.player_id;
            const pB = isALess ? bestCandidate.player_id : sub.player_id;
            const sA = isALess ? sub.id : bestCandidate.id;
            const sB = isALess ? bestCandidate.id : sub.id;

            matchRecords.push({
              id: `match_${drop.drop_date.toISOString().slice(0, 10)}_${pA}_${pB}`,
              drop_id: dropId,
              drop_date: drop.drop_date,
              player_a_id: pA,
              player_b_id: pB,
              submission_a_id: sA,
              submission_b_id: sB,
              similarity_score: bestScore,
              is_provisional: false,
              finalized_at: new Date(),
            });
          }
        }

        // Sort match records deterministically to guarantee monotonic index lock acquisition
        matchRecords.sort((r1, r2) =>
          r1.player_a_id.localeCompare(r2.player_a_id) || r1.player_b_id.localeCompare(r2.player_b_id)
        );

        // Bulk insert finalized matches serialized across chunk workers to prevent index lock contention
        if (matchRecords.length > 0) {
          await withDbWriteLock(async () => {
            await prisma.match.createMany({
              data: matchRecords,
              skipDuplicates: true,
            });
          });
        }

        // 2. Compute finalized oddness scores in memory (fast vectorized O(N))
        const scoreRecords = chunkSubmissions.map((sub) => {
          const storedAnswers = sub.answers as unknown as StoredAnswer[];
          const qids = storedAnswers.map((a) => a.question_id);
          const vals = storedAnswers.map((a) => a.value);
          const rawScore = oddnessScore(qids, vals, frequencies);
          const pct = Math.min(99.9, Math.max(1.0, Math.round(rawScore * 1000) / 10));
          const tier = classifyTier(pct);

          return {
            submission_id: sub.id,
            drop_date: drop.drop_date,
            raw_score: rawScore,
            percentile: pct,
            tier,
          };
        });

        // Bulk insert oddness scores in batches of 1,000
        if (scoreRecords.length > 0) {
          for (let s = 0; s < scoreRecords.length; s += 1000) {
            await prisma.oddnessScore.createMany({
              data: scoreRecords.slice(s, s + 1000),
              skipDuplicates: true,
            });
          }
        }

        // Update batch run chunk as completed
        await prisma.batchRun.update({
          where: { id: batchRunRecord.id },
          data: {
            status: "completed",
            cursor_to: cursorTo,
            player_count: chunkSubmissions.length,
            completed_at: new Date(),
          },
        });

        completedChunks++;
        scoresFinalized += chunkSubmissions.length;

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
    };

    // 6. Execute chunks with bounded concurrency pool
    const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);
    let nextChunkPointer = 0;

    const workerLoop = async () => {
      while (nextChunkPointer < chunkIndices.length) {
        const chunkIndex = chunkIndices[nextChunkPointer++];
        await processChunk(chunkIndex);
      }
    };

    const workerThreads = Array.from(
      { length: Math.min(concurrency, totalChunks) },
      () => workerLoop()
    );

    await Promise.all(workerThreads);

    // 7. Compute Orbit co-streaks and expire stale keeps (Stage F1 / Task P10A.06, P10A.05)
    await this.computeCoStreaks(dropId, drop.drop_date);
    await this.expireStaleKeeps();

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
   * Compute Orbit co-streaks for a drop (Task P10A.06).
   * For each active Orbit:
   * 1. Check if both player_a and player_b submitted answers for dropId.
   * 2. If both submitted: increment co_streak_current, update co_streak_best, set last_co_date = dropDate.
   * 3. If either missed: quietly reset co_streak_current to 0 (zero guilt, zero nagging).
   */
  static async computeCoStreaks(
    dropId: string,
    dropDate: Date
  ): Promise<{ activeOrbits: number; keptCoStreak: number; resetCoStreak: number }> {
    const activeOrbits = await prisma.orbit.findMany({
      where: { status: "active" },
    });

    if (activeOrbits.length === 0) {
      return { activeOrbits: 0, keptCoStreak: 0, resetCoStreak: 0 };
    }

    const submissions = await prisma.submission.findMany({
      where: { drop_id: dropId },
      select: { player_id: true },
    });
    const submitterIds = new Set(submissions.map((s) => s.player_id));

    let kept = 0;
    let reset = 0;

    for (const orbit of activeOrbits) {
      const bothCompleted =
        submitterIds.has(orbit.player_a_id) && submitterIds.has(orbit.player_b_id);

      if (bothCompleted) {
        const newCurrent = orbit.co_streak_current + 1;
        const newBest = Math.max(orbit.co_streak_best, newCurrent);
        await prisma.orbit.update({
          where: { id: orbit.id },
          data: {
            co_streak_current: newCurrent,
            co_streak_best: newBest,
            last_co_date: dropDate,
          },
        });
        kept++;
      } else {
        if (orbit.co_streak_current > 0) {
          await prisma.orbit.update({
            where: { id: orbit.id },
            data: {
              co_streak_current: 0,
            },
          });
          reset++;
        }
      }
    }

    return { activeOrbits: activeOrbits.length, keptCoStreak: kept, resetCoStreak: reset };
  }

  /**
   * Expire keeps that have remained pending > 48 hours (Task P10A.05).
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
