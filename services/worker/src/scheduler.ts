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
import { getTimelineConfig, type ScheduleTimelineConfig } from "./clock.js";
import { PairingWorker } from "./workers/pairing.worker.js";
import { ClosureWorker } from "./workers/closure.worker.js";

export interface ScheduledJobDef {
  name: string;
  cron: string;
  description: string;
}

export class DailyScheduler {
  private timelineConfig: ScheduleTimelineConfig;
  private queue: Queue | null = null;
  private isRunning = false;

  constructor(timelineConfig = getTimelineConfig()) {
    this.timelineConfig = timelineConfig;
  }

  /**
   * Initializes BullMQ queue with connection.
   */
  initQueue(connection: ConnectionOptions): Queue {
    this.queue = new Queue("daily-pipeline", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
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
   * Manual trigger for staging step (P9.01).
   */
  async triggerStageDrop(dropId: string): Promise<{ ok: boolean; dropId: string; status: "pending" }> {
    return {
      ok: true,
      dropId,
      status: "pending",
    };
  }

  /**
   * Manual trigger for opening live drop (P9.01).
   */
  async triggerOpenDrop(dropId: string): Promise<{ ok: boolean; dropId: string; status: "live" }> {
    return {
      ok: true,
      dropId,
      status: "live",
    };
  }

  /**
   * Manual trigger for pairing sweep (P9.02).
   */
  async triggerPairingSweep(dropId: string, candidates: Parameters<typeof PairingWorker.runPairingSweep>[1]) {
    return PairingWorker.runPairingSweep(dropId, candidates);
  }

  /**
   * Manual trigger for closure and freeze (P9.03).
   */
  async triggerDropClosure(
    dropId: string,
    submissions: Parameters<typeof ClosureWorker.runBatchClosure>[1],
    playerHistoricalDates?: Map<string, string[]>
  ) {
    return ClosureWorker.runBatchClosure(dropId, submissions, playerHistoricalDates);
  }

  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
}
