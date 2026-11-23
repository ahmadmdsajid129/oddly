/**
 * @file scheduler.ts
 * @package @oddly/worker
 *
 * Daily Pipeline Timeline Scheduler (P9.01, P9.05, P9.06).
 * Manages repeatable BullMQ jobs for Oddly's daily 24-hour cycle:
 * - 06:30 IST: Stage Drop (verify drop, prepare Redis pre-cache keys)
 * - 07:00 IST: Open Drop (transition to live, notify players)
 * - Every 5 min: Provisional Pairing Sweeps
 * - 06:59 IST: Close Drop (freeze distributions, lock percentiles, award milestones)
 */

import { Queue, type ConnectionOptions } from "bullmq";
import { Redis, type RedisOptions } from "ioredis";
import { getTimelineConfig, type ScheduleTimelineConfig } from "./clock.js";
import { PairingWorker } from "./workers/pairing.worker.js";
import { PipelineWorker } from "./workers/pipeline.worker.js";

export interface ScheduledJobDef {
  name: string;
  cron: string;
  description: string;
}

export class DailyScheduler {
  private timelineConfig: ScheduleTimelineConfig;
  private queue: Queue | null = null;
  private isRunning = false;
  private redisClient: Redis | null = null;

  constructor(timelineConfig = getTimelineConfig()) {
    this.timelineConfig = timelineConfig;
  }

  /**
   * Initializes BullMQ queue with connection.
   */
  initQueue(connection: ConnectionOptions): Queue {
    this.redisClient =
      connection instanceof Redis ? connection : new Redis(connection as RedisOptions);
    this.queue = new Queue("daily-pipeline", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
    return this.queue;
  }

  /**
   * Get all scheduled job definitions.
   */
  getScheduledJobs(): ScheduledJobDef[] {
    return [
      {
        name: "stage-drop",
        cron: this.timelineConfig.stageCron,
        description: "06:30 IST: Stage today's drop and verify questions",
      },
      {
        name: "open-drop",
        cron: this.timelineConfig.openCron,
        description: "07:00 IST: Transition drop to live and trigger broadcast",
      },
      {
        name: "provisional-pairing",
        cron: this.timelineConfig.pairingCron,
        description: "5-min sweep: Run provisional pairing across age bands",
      },
      {
        name: "close-drop",
        cron: this.timelineConfig.archiveCron,
        description: "06:59 IST: Archive drop, freeze distributions p(a), and update streaks",
      },
    ];
  }

  /**
   * Registers all cron schedules into the BullMQ repeatable jobs queue.
   */
  async registerSchedules(): Promise<void> {
    if (!this.queue) {
      throw new Error("DailyScheduler queue is not initialized");
    }

    const jobs = this.getScheduledJobs();
    for (const job of jobs) {
      await this.queue.add(
        job.name,
        { scheduledAt: new Date().toISOString() },
        {
          repeat: {
            pattern: job.cron,
          },
          jobId: `repeatable:${job.name}`,
        }
      );
    }

    this.isRunning = true;
  }

  /**
   * Trigger for staging step (R1.1 / P9.02, P10L.03).
   */
  async triggerStageDrop(dropDate?: string, laneSlug?: string) {
    if (!this.redisClient) throw new Error("Redis client not initialized in scheduler");
    return PipelineWorker.executeStageDrop(this.redisClient, dropDate, laneSlug);
  }

  /**
   * Trigger for opening live drop (R1.1 / P9.03, P10L.03).
   */
  async triggerOpenDrop(dropDate?: string, laneSlug?: string) {
    if (!this.redisClient) throw new Error("Redis client not initialized in scheduler");
    return PipelineWorker.executeOpenDrop(this.redisClient, dropDate, laneSlug);
  }

  /**
   * Trigger for closure (R1.1 / P9.05, P10L.03).
   */
  async triggerDropClosure(dropDate?: string, laneSlug?: string) {
    if (!this.redisClient) throw new Error("Redis client not initialized in scheduler");
    return PipelineWorker.executeCloseDrop(this.redisClient, dropDate, laneSlug);
  }

  /**
   * Trigger for final batch matching (R1.1 / P9.06).
   */
  async triggerMatchFinal(dropId: string, options?: { chunkSize?: number; simulateFailureAtChunk?: number }) {
    if (!this.redisClient) throw new Error("Redis client not initialized in scheduler");
    return PipelineWorker.executeMatchFinal(this.redisClient, dropId, options);
  }

  /**
   * Manual trigger for pairing sweep (P9.04).
   */
  async triggerPairingSweep(dropId: string, candidates: Parameters<typeof PairingWorker.runPairingSweep>[1]) {
    return PairingWorker.runPairingSweep(dropId, candidates);
  }

  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}

