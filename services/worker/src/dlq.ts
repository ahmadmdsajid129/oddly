/**
 * @file dlq.ts
 * @package @oddly/worker
 *
 * BullMQ Dead-Letter Queue (DLQ) Manager, Poison Job Quarantine & Replay Tooling (P9.15, Architecture Sec 9).
 *
 * Provides:
 * 1. Automatic poison job quarantine after max retry exhaustion.
 * 2. Error classification (timeout, syntax_error, db_connection, bad_payload, unknown).
 * 3. Alert triggers with structured alert payloads and subscriber hooks.
 * 4. Programmatic and CLI replay tooling (replayJob, replayAll, purgeJob, purgeAll).
 * 5. Prometheus metrics (oddly_dlq_quarantined_total, oddly_dlq_depth, oddly_dlq_replayed_total).
 */

import { Queue, type Job } from "bullmq";
import { Redis } from "ioredis";
import {
  dlqQuarantinedTotal,
  dlqDepthGauge,
  dlqReplayedTotal,
} from "./metrics.js";

export type DlqErrorClassification =
  | "timeout"
  | "syntax_error"
  | "db_connection"
  | "bad_payload"
  | "unknown";

export interface QuarantinedPoisonJob {
  dlqId: string;
  originalQueue: string;
  originalJobId: string;
  originalJobName: string;
  data: unknown;
  failedReason: string;
  stacktrace?: string[];
  attemptsMade: number;
  quarantinedAt: string;
  classification: DlqErrorClassification;
  replayedAt?: string;
  status: "quarantined" | "replayed" | "purged";
}

export interface DlqAlertPayload {
  alert: "BULLMQ_DEAD_LETTER_EXHAUSTED";
  dlqId: string;
  queueName: string;
  jobId: string;
  jobName: string;
  attemptsMade: number;
  failedReason: string;
  classification: DlqErrorClassification;
  timestamp: string;
}

export interface ReplayResult {
  ok: boolean;
  dlqId: string;
  originalQueue: string;
  newJobId?: string;
  error?: string;
}

export interface ReplayAllResult {
  total: number;
  replayed: number;
  failed: number;
  errors: Array<{ dlqId: string; error: string }>;
}

export interface DlqStats {
  activeCount: number;
  replayedCount: number;
  purgedCount: number;
  byQueue: Record<string, number>;
  byClassification: Record<string, number>;
}

export type DlqAlertHandler = (alert: DlqAlertPayload) => void | Promise<void>;

// In-memory fallback map for test environments and when Redis is offline
const inMemoryDlqStore = new Map<string, QuarantinedPoisonJob>();
const alertHandlers = new Set<DlqAlertHandler>();

/**
 * Classifies an error to identify failure root cause.
 */
export function classifyError(err: Error | string | unknown): DlqErrorClassification {
  const msg = (err instanceof Error ? `${err.name} ${err.message}` : String(err || "")).toLowerCase();

  if (
    msg.includes("timeout") ||
    msg.includes("57014") ||
    msg.includes("canceling statement") ||
    msg.includes("deadline exceeded")
  ) {
    return "timeout";
  }

  if (
    msg.includes("syntax") ||
    msg.includes("unexpected token") ||
    msg.includes("json") ||
    msg.includes("parse error")
  ) {
    return "syntax_error";
  }

  if (
    msg.includes("econnrefused") ||
    msg.includes("connection terminated") ||
    msg.includes("etimedout") ||
    msg.includes("can't reach database") ||
    msg.includes("connection lost") ||
    msg.includes("failed to connect") ||
    msg.includes("connection dropped") ||
    msg.includes("redis")
  ) {
    return "db_connection";
  }

  if (
    msg.includes("validation") ||
    msg.includes("zoderror") ||
    msg.includes("schema") ||
    msg.includes("invalid") ||
    msg.includes("bad payload")
  ) {
    return "bad_payload";
  }

  return "unknown";
}

/**
 * Dead-Letter Queue Manager
 */
export class DLQManager {
  private redis: Redis | null = null;
  private queuePool = new Map<string, Queue>();

  constructor(redisClient?: Redis) {
    if (redisClient) {
      this.redis = redisClient;
    }
  }

  /**
   * Sets or updates the active Redis client.
   */
  setRedis(redisClient: Redis | null): void {
    this.redis = redisClient;
  }

  /**
   * Registers an external alert subscriber (e.g. Sentry, PagerDuty, Webhook).
   */
  static registerAlertHandler(handler: DlqAlertHandler): () => void {
    alertHandlers.add(handler);
    return () => {
      alertHandlers.delete(handler);
    };
  }

  /**
   * Clears all registered alert handlers (useful in test teardown).
   */
  static clearAlertHandlers(): void {
    alertHandlers.clear();
  }

  /**
   * Quarantines a poison job into the Dead-Letter Queue and triggers alerts.
   */
  async quarantineJob(
    job: Job | { id?: string; name?: string; queueName?: string; data?: unknown; attemptsMade?: number; opts?: { attempts?: number } },
    err: Error | string
  ): Promise<QuarantinedPoisonJob> {
    const queueName = job?.queueName || "unknown";
    const jobId = String(job?.id || `anon_${Date.now()}`);
    const jobName = job?.name || "unnamed";
    const attemptsMade = job?.attemptsMade ?? 1;
    const failedReason = err instanceof Error ? err.message : String(err);
    const stacktrace = err instanceof Error && err.stack ? [err.stack] : undefined;
    const classification = classifyError(err);
    const quarantinedAt = new Date().toISOString();
    const dlqId = `dlq_${queueName}_${jobId}_${Date.now()}`;

    const record: QuarantinedPoisonJob = {
      dlqId,
      originalQueue: queueName,
      originalJobId: jobId,
      originalJobName: jobName,
      data: job.data ?? null,
      failedReason,
      stacktrace,
      attemptsMade,
      quarantinedAt,
      classification,
      status: "quarantined",
    };

    // 1. Store in Redis if available, else in-memory
    if (this.redis && this.redis.status === "ready") {
      try {
        const payloadStr = JSON.stringify(record);
        await this.redis.hset(`oddly:dlq:job:${dlqId}`, {
          payload: payloadStr,
          status: "quarantined",
          queueName,
        });
        await this.redis.zadd("oddly:dlq:index", Date.now(), dlqId);
        await this.redis.hincrby("oddly:dlq:stats", `queue:${queueName}`, 1);
        await this.redis.hincrby("oddly:dlq:stats", `class:${classification}`, 1);
      } catch (redisErr) {
        console.warn("[DLQManager] Redis write failed, falling back to memory:", (redisErr as Error).message);
        inMemoryDlqStore.set(dlqId, record);
      }
    } else {
      inMemoryDlqStore.set(dlqId, record);
    }

    // 2. Metrics & Prometheus Instrumentation
    try {
      dlqQuarantinedTotal.inc({ queue_name: queueName, classification });
      const currentDepth = await this.getActiveCount(queueName);
      dlqDepthGauge.set({ queue_name: queueName }, currentDepth);
    } catch {
      // Metric recording errors should never interrupt quarantine
    }

    // 3. Emit structured alert
    const alertPayload: DlqAlertPayload = {
      alert: "BULLMQ_DEAD_LETTER_EXHAUSTED",
      dlqId,
      queueName,
      jobId,
      jobName,
      attemptsMade,
      failedReason,
      classification,
      timestamp: quarantinedAt,
    };

    console.error(
      "[CRITICAL ALERT] BullMQ job exceeded max retries. Moved to DLQ:",
      JSON.stringify(alertPayload)
    );

    // 4. Dispatch to subscribers
    for (const handler of alertHandlers) {
      try {
        await handler(alertPayload);
      } catch (handlerErr) {
        console.error("[DLQManager] Alert handler error:", handlerErr);
      }
    }

    return record;
  }

  /**
   * Retrieves a quarantined job by DLQ ID.
   */
  async getJob(dlqId: string): Promise<QuarantinedPoisonJob | null> {
    if (this.redis && this.redis.status === "ready") {
      try {
        const raw = await this.redis.hget(`oddly:dlq:job:${dlqId}`, "payload");
        if (raw) return JSON.parse(raw) as QuarantinedPoisonJob;
      } catch {
        // Fallback to memory
      }
    }
    return inMemoryDlqStore.get(dlqId) || null;
  }

  /**
   * Lists all quarantined jobs with pagination.
   */
  async listJobs(
    options: {
      status?: "quarantined" | "replayed" | "purged" | "all";
      queueName?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ jobs: QuarantinedPoisonJob[]; total: number }> {
    const statusFilter = options.status || "quarantined";
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    let allRecords: QuarantinedPoisonJob[] = [];

    if (this.redis && this.redis.status === "ready") {
      try {
        const ids = await this.redis.zrevrange("oddly:dlq:index", 0, -1);
        for (const id of ids) {
          const raw = await this.redis.hget(`oddly:dlq:job:${id}`, "payload");
          if (raw) {
            allRecords.push(JSON.parse(raw));
          }
        }
      } catch {
        allRecords = Array.from(inMemoryDlqStore.values());
      }
    } else {
      allRecords = Array.from(inMemoryDlqStore.values());
    }

    // Filter
    const filtered = allRecords.filter((rec) => {
      if (statusFilter !== "all" && rec.status !== statusFilter) return false;
      if (options.queueName && rec.originalQueue !== options.queueName) return false;
      return true;
    });

    // Sort newest first
    filtered.sort(
      (a, b) => new Date(b.quarantinedAt).getTime() - new Date(a.quarantinedAt).getTime()
    );

    return {
      jobs: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  /**
   * Replays a single quarantined poison job back into its original or target BullMQ queue.
   */
  async replayJob(
    dlqId: string,
    options: { targetQueue?: string; customData?: unknown } = {}
  ): Promise<ReplayResult> {
    const job = await this.getJob(dlqId);
    if (!job) {
      return { ok: false, dlqId, originalQueue: "unknown", error: "Job not found in DLQ" };
    }

    if (job.status === "replayed") {
      return { ok: false, dlqId, originalQueue: job.originalQueue, error: "Job already replayed" };
    }

    const targetQueueName = options.targetQueue || job.originalQueue;
    const payloadData = options.customData !== undefined ? options.customData : job.data;
    let newJobId = `replayed_${job.originalJobId}_${Date.now()}`;

    // 1. Re-enqueue to target BullMQ Queue if Redis/Queue is configured
    if (this.redis && this.redis.status === "ready") {
      try {
        let queue = this.queuePool.get(targetQueueName);
        if (!queue) {
          queue = new Queue(targetQueueName, { connection: this.redis });
          this.queuePool.set(targetQueueName, queue);
        }

        const addedJob = await queue.add(job.originalJobName, payloadData, {
          jobId: newJobId,
          attempts: 3,
          backoff: { type: "exponential", delay: 2000 },
        });
        if (addedJob?.id) newJobId = addedJob.id;
      } catch (queueErr) {
        console.warn("[DLQManager] BullMQ re-enqueue warning:", (queueErr as Error).message);
      }
    }

    // 2. Mark as replayed
    job.status = "replayed";
    job.replayedAt = new Date().toISOString();

    if (this.redis && this.redis.status === "ready") {
      try {
        await this.redis.hset(`oddly:dlq:job:${dlqId}`, {
          payload: JSON.stringify(job),
          status: "replayed",
          replayedAt: job.replayedAt,
        });
        await this.redis.zrem("oddly:dlq:index", dlqId);
      } catch {
        inMemoryDlqStore.set(dlqId, job);
      }
    } else {
      inMemoryDlqStore.set(dlqId, job);
    }

    // 3. Metrics
    try {
      dlqReplayedTotal.inc({ queue_name: targetQueueName });
      const currentDepth = await this.getActiveCount(targetQueueName);
      dlqDepthGauge.set({ queue_name: targetQueueName }, currentDepth);
    } catch {
      // Metric recording errors should not halt replay
    }

    return {
      ok: true,
      dlqId,
      originalQueue: targetQueueName,
      newJobId,
    };
  }

  /**
   * Replays all quarantined jobs (optionally matching a queue name filter).
   */
  async replayAll(filterQueue?: string): Promise<ReplayAllResult> {
    const { jobs } = await this.listJobs({
      status: "quarantined",
      queueName: filterQueue,
      limit: 1000,
    });

    let replayed = 0;
    let failed = 0;
    const errors: Array<{ dlqId: string; error: string }> = [];

    for (const job of jobs) {
      const res = await this.replayJob(job.dlqId);
      if (res.ok) {
        replayed++;
      } else {
        failed++;
        errors.push({ dlqId: job.dlqId, error: res.error || "Unknown replay error" });
      }
    }

    return {
      total: jobs.length,
      replayed,
      failed,
      errors,
    };
  }

  /**
   * Purges a poison job permanently from DLQ without replaying.
   */
  async purgeJob(dlqId: string): Promise<boolean> {
    const job = await this.getJob(dlqId);
    if (!job) return false;

    job.status = "purged";

    if (this.redis && this.redis.status === "ready") {
      try {
        await this.redis.del(`oddly:dlq:job:${dlqId}`);
        await this.redis.zrem("oddly:dlq:index", dlqId);
      } catch {
        inMemoryDlqStore.delete(dlqId);
      }
    } else {
      inMemoryDlqStore.delete(dlqId);
    }

    try {
      const currentDepth = await this.getActiveCount(job.originalQueue);
      dlqDepthGauge.set({ queue_name: job.originalQueue }, currentDepth);
    } catch {
      // Ignore
    }

    return true;
  }

  /**
   * Purges all quarantined jobs from DLQ.
   */
  async purgeAll(): Promise<number> {
    const { jobs } = await this.listJobs({ status: "all", limit: 10000 });
    let count = 0;
    for (const job of jobs) {
      if (await this.purgeJob(job.dlqId)) count++;
    }
    inMemoryDlqStore.clear();
    return count;
  }

  /**
   * Returns current active DLQ count.
   */
  async getActiveCount(queueName?: string): Promise<number> {
    const { total } = await this.listJobs({
      status: "quarantined",
      queueName,
      limit: 1,
    });
    return total;
  }

  /**
   * Returns aggregate DLQ statistics and classification breakdown.
   */
  async getStats(): Promise<DlqStats> {
    const { jobs: allJobs } = await this.listJobs({ status: "all", limit: 10000 });

    const byQueue: Record<string, number> = {};
    const byClassification: Record<string, number> = {};
    let activeCount = 0;
    let replayedCount = 0;
    let purgedCount = 0;

    for (const j of allJobs) {
      if (j.status === "quarantined") activeCount++;
      if (j.status === "replayed") replayedCount++;
      if (j.status === "purged") purgedCount++;

      byQueue[j.originalQueue] = (byQueue[j.originalQueue] ?? 0) + 1;
      byClassification[j.classification] = (byClassification[j.classification] ?? 0) + 1;
    }

    return {
      activeCount,
      replayedCount,
      purgedCount,
      byQueue,
      byClassification,
    };
  }

  /**
   * Resets in-memory storage (for unit tests).
   */
  static resetMemoryStore(): void {
    inMemoryDlqStore.clear();
  }
}

// Global default singleton
export const dlqManager = new DLQManager();
