/**
 * @file index.ts
 * @package @oddly/worker
 *
 * Worker & Daily Pipeline Scheduler entry point (R1.1, R1.3).
 */

import { Redis } from "ioredis";
import { Worker, type Job } from "bullmq";
import { processRenderCardJob } from "./jobs/render-card.js";
import { DailyScheduler } from "./scheduler.js";
import { PipelineWorker } from "./workers/pipeline.worker.js";
import { PairingWorker } from "./workers/pairing.worker.js";

export * from "./clock.js";
export * from "./scheduler.js";
export * from "./workers/pairing.worker.js";
export * from "./workers/closure.worker.js";
export * from "./workers/pipeline.worker.js";
export * from "./workers/globe.worker.js";
export * from "./jobs/wilson-scoring.job.js";
export * from "./jobs/player-taste.job.js";
export * from "./jobs/notification-timing.job.js";
export * from "./workers/submit-persist.worker.js";
export * from "./jobs/persist-reconciliation.job.js";
export * from "./db.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS) || 15000;

console.log("[Oddly Worker] Initializing worker service & daily pipeline...");

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  commandTimeout: 1000,
  connectTimeout: 2000,
  retryStrategy(times) {
    const delay = Math.min(times * 500, 2000);
    return delay;
  },
});

redis.on("error", (err) => {
  if (process.env.NODE_ENV !== "production") {
    // Suppress connection spam in local dev when Redis is not running
  } else {
    console.error("[Oddly Worker] Redis client error:", err.message);
  }
});

export const dailyScheduler = new DailyScheduler();
let cardWorker: Worker | null = null;
let pipelineWorker: Worker | null = null;
let isShuttingDown = false;

/**
 * BullMQ Dead Letter Queue Alert Hook (R1.1)
 */
export function triggerDeadLetterAlert(job: Job | undefined, err: Error) {
  const alertPayload = {
    alert: "BULLMQ_DEAD_LETTER_EXHAUSTED",
    queueName: job?.queueName,
    jobId: job?.id,
    jobName: job?.name,
    attemptsMade: job?.attemptsMade,
    failedReason: err.message,
    timestamp: new Date().toISOString(),
  };

  console.error("[CRITICAL ALERT] BullMQ job exceeded max retries. Moved to DLQ:", JSON.stringify(alertPayload));
  // In production, emit to Sentry / PagerDuty / Webhook
}

/**
 * Processor for Daily Pipeline BullMQ Queue
 */
export async function processPipelineJob(job: Job): Promise<unknown> {
  console.log(`[Oddly Worker] Processing pipeline job: ${job.name} (${job.id})`);

  switch (job.name) {
    case "stage-drop":
      return PipelineWorker.executeStageDrop(redis);
    case "open-drop":
      return PipelineWorker.executeOpenDrop(redis);
    case "close-drop":
      return PipelineWorker.executeCloseDrop(redis);
    case "match-final":
      return PipelineWorker.executeMatchFinal(redis, job.data?.dropId);
    case "provisional-pairing":
      return PairingWorker.runPairingSweep(job.data?.dropId || "today", []);
    default:
      console.warn(`[Oddly Worker] Unknown pipeline job type: ${job.name}`);
      return { skipped: true, reason: "unknown_job" };
  }
}

async function bootstrap() {
  try {
    await redis.connect();
    console.log("[Oddly Worker] Connected to Redis successfully.");

    // 1. Initialize BullMQ Daily Pipeline Scheduler
    dailyScheduler.initQueue(redis);
    await dailyScheduler.registerSchedules();
    console.log("[Oddly Worker] Daily pipeline cron schedules registered.");

    // 2. Start Cards rendering worker (concurrency: 4)
    cardWorker = new Worker("cards", processRenderCardJob, {
      connection: redis,
      concurrency: 4,
    });

    cardWorker.on("completed", (job) => {
      console.log(`[Oddly Worker] Card rendered for job ${job.id}`);
    });

    cardWorker.on("failed", (job, err) => {
      console.error(`[Oddly Worker] Card rendering failed for job ${job?.id}:`, err);
      if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        triggerDeadLetterAlert(job, err);
      }
    });

    // 3. Start Daily Pipeline worker (isolated queue, concurrency: 1 for sequential lifecycle transitions)
    pipelineWorker = new Worker("daily-pipeline", processPipelineJob, {
      connection: redis,
      concurrency: 1,
    });

    pipelineWorker.on("completed", (job) => {
      console.log(`[Oddly Worker] Pipeline job completed: ${job.name} (${job.id})`);
    });

    pipelineWorker.on("failed", (job, err) => {
      console.error(`[Oddly Worker] Pipeline job failed: ${job?.name} (${job?.id}):`, err);
      if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        triggerDeadLetterAlert(job, err);
      }
    });

    // 4. Sequential Boot Catch-up Check (R1.1)
    const catchupResult = await PipelineWorker.catchUpMissedSteps(redis);
    if (catchupResult.caughtUp) {
      console.log("[Oddly Worker] Successfully caught up missed pipeline steps:", catchupResult.stepsExecuted);
    }
  } catch (error) {
    console.warn(
      "[Oddly Worker] Redis connection deferred or offline. Starting idle worker:",
      (error as Error).message
    );
  }

  console.log("worker ready");
}

/**
 * Graceful Shutdown for Worker (R1.3)
 */
export async function shutdownWorker(signal = "SIGTERM"): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Oddly Worker] Received ${signal}. Draining queues and shutting down gracefully (grace: ${SHUTDOWN_GRACE_MS}ms)...`);

  const shutdownTimer = setTimeout(() => {
    console.warn("[Oddly Worker] Grace period exceeded. Forcing worker shutdown.");
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);

  try {
    if (cardWorker) {
      await cardWorker.close();
    }
    if (pipelineWorker) {
      await pipelineWorker.close();
    }
    if (redis.status === "ready") {
      await redis.quit();
    }
    clearTimeout(shutdownTimer);
    console.log("[Oddly Worker] Worker queues cleanly drained. Goodbye.");
    if (process.env.NODE_ENV !== "test") {
      process.exit(0);
    }
  } catch (err) {
    console.error("[Oddly Worker] Error during graceful shutdown:", err);
    clearTimeout(shutdownTimer);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
}

process.on("SIGTERM", () => shutdownWorker("SIGTERM"));
process.on("SIGINT", () => shutdownWorker("SIGINT"));

if (process.env.NODE_ENV !== "test") {
  bootstrap().catch((err) => {
    console.error("[Oddly Worker] Bootstrap fatal error:", err);
    process.exit(1);
  });
}
