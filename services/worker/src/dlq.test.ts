/**
 * @file dlq.test.ts
 * @package @oddly/worker
 *
 * Comprehensive automated test suite for Task P9.15:
 * BullMQ Dead-Letter Queue (DLQ) Quarantine, Alert Triggers & Replay Engine (Architecture Sec 9 & Failure Modes Sec 2).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DLQManager,
  classifyError,
  triggerDeadLetterAlert,
  type DlqAlertPayload,
} from "./index.js";

describe("Stage 9: BullMQ Dead-Letter Queue (DLQ) & Poison Job Quarantine (P9.15)", () => {
  let dlq: DLQManager;

  beforeEach(() => {
    dlq = new DLQManager();
    DLQManager.resetMemoryStore();
    DLQManager.clearAlertHandlers();
  });

  afterEach(() => {
    DLQManager.resetMemoryStore();
    DLQManager.clearAlertHandlers();
    vi.restoreAllMocks();
  });

  describe("Error Classification Engine", () => {
    it("classifies database and execution statement timeouts", () => {
      expect(classifyError(new Error("canceling statement due to statement timeout"))).toBe("timeout");
      expect(classifyError("Error: 57014 PostgreSQL timeout")).toBe("timeout");
      expect(classifyError(new Error("Request deadline exceeded after 3000ms"))).toBe("timeout");
    });

    it("classifies syntax and JSON parse errors", () => {
      expect(classifyError(new Error("Unexpected token < in JSON at position 0"))).toBe("syntax_error");
      expect(classifyError("SyntaxError: parse error in worker payload")).toBe("syntax_error");
    });

    it("classifies database connectivity and network partitions", () => {
      expect(classifyError(new Error("connect ECONNREFUSED 127.0.0.1:5432"))).toBe("db_connection");
      expect(classifyError(new Error("Connection terminated unexpectedly on replica"))).toBe("db_connection");
      expect(classifyError("Can't reach database server at localhost:5432")).toBe("db_connection");
    });

    it("classifies payload schema and validation errors", () => {
      expect(classifyError(new Error("ZodError: [{\"path\": [\"answers\"], \"message\": \"Required\"}]"))).toBe("bad_payload");
      expect(classifyError("Validation error: bad payload for job")).toBe("bad_payload");
    });

    it("falls back to unknown for unclassified generic errors", () => {
      expect(classifyError(new Error("Something completely bizarre happened"))).toBe("unknown");
    });
  });

  describe("Poison Job Quarantine & Metadata Capture", () => {
    it("quarantines exhausted worker job into DLQ with full diagnostic metadata", async () => {
      const mockJob = {
        id: "job_poison_101",
        name: "stage-drop",
        queueName: "daily-pipeline",
        data: { dropDate: "2026-11-22" },
        attemptsMade: 3,
        opts: { attempts: 3 },
      };

      const error = new Error("canceling statement due to statement timeout");
      const record = await dlq.quarantineJob(mockJob, error);

      expect(record.dlqId).toMatch(/^dlq_daily-pipeline_job_poison_101_/);
      expect(record.originalQueue).toBe("daily-pipeline");
      expect(record.originalJobId).toBe("job_poison_101");
      expect(record.originalJobName).toBe("stage-drop");
      expect(record.data).toEqual({ dropDate: "2026-11-22" });
      expect(record.failedReason).toBe("canceling statement due to statement timeout");
      expect(record.classification).toBe("timeout");
      expect(record.attemptsMade).toBe(3);
      expect(record.status).toBe("quarantined");
      expect(record.quarantinedAt).toBeDefined();

      const retrieved = await dlq.getJob(record.dlqId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.dlqId).toBe(record.dlqId);
    });
  });

  describe("Alert Triggers & Subscriber Notifications", () => {
    it("dispatches structured alert payload to registered alert handlers", async () => {
      const receivedAlerts: DlqAlertPayload[] = [];
      DLQManager.registerAlertHandler((alert) => {
        receivedAlerts.push(alert);
      });

      const mockJob = {
        id: "job_card_999",
        name: "render-share-card",
        queueName: "cards",
        data: { shortId: "c_abc123", format: "story" },
        attemptsMade: 3,
      };

      await dlq.quarantineJob(mockJob, new Error("connect ECONNREFUSED 127.0.0.1:5432"));

      expect(receivedAlerts.length).toBe(1);
      const alert = receivedAlerts[0];
      expect(alert.alert).toBe("BULLMQ_DEAD_LETTER_EXHAUSTED");
      expect(alert.queueName).toBe("cards");
      expect(alert.jobId).toBe("job_card_999");
      expect(alert.jobName).toBe("render-share-card");
      expect(alert.classification).toBe("db_connection");
      expect(alert.attemptsMade).toBe(3);
      expect(alert.timestamp).toBeDefined();
    });
  });

  describe("DLQ Listing, Filtering & Statistics", () => {
    it("lists quarantined jobs filtered by queue name and status", async () => {
      await dlq.quarantineJob(
        { id: "pipe_1", name: "open-drop", queueName: "daily-pipeline", attemptsMade: 3 },
        new Error("timeout error")
      );
      await dlq.quarantineJob(
        { id: "pipe_2", name: "close-drop", queueName: "daily-pipeline", attemptsMade: 3 },
        new Error("timeout error")
      );
      await dlq.quarantineJob(
        { id: "card_1", name: "render-card", queueName: "cards", attemptsMade: 3 },
        new Error("validation error")
      );

      // List all
      const all = await dlq.listJobs({ status: "all" });
      expect(all.total).toBe(3);

      // Filter by queue
      const pipelineOnly = await dlq.listJobs({ queueName: "daily-pipeline" });
      expect(pipelineOnly.total).toBe(2);
      expect(pipelineOnly.jobs.every((j) => j.originalQueue === "daily-pipeline")).toBe(true);

      const cardsOnly = await dlq.listJobs({ queueName: "cards" });
      expect(cardsOnly.total).toBe(1);
      expect(cardsOnly.jobs[0].originalJobId).toBe("card_1");

      // Verify stats aggregation
      const stats = await dlq.getStats();
      expect(stats.activeCount).toBe(3);
      expect(stats.byQueue["daily-pipeline"]).toBe(2);
      expect(stats.byQueue["cards"]).toBe(1);
      expect(stats.byClassification["timeout"]).toBe(2);
      expect(stats.byClassification["bad_payload"]).toBe(1);
    });
  });

  describe("Replay Engine & Poison Job Recovery", () => {
    it("replays single poison job back into its original queue", async () => {
      const record = await dlq.quarantineJob(
        {
          id: "job_replay_1",
          name: "match-final",
          queueName: "daily-pipeline",
          data: { dropId: "drop_uuid_123" },
          attemptsMade: 3,
        },
        new Error("Transient connection error")
      );

      expect(await dlq.getActiveCount("daily-pipeline")).toBe(1);

      const result = await dlq.replayJob(record.dlqId);
      expect(result.ok).toBe(true);
      expect(result.dlqId).toBe(record.dlqId);
      expect(result.originalQueue).toBe("daily-pipeline");
      expect(result.newJobId).toBeDefined();

      // Check job status updated to replayed
      const updated = await dlq.getJob(record.dlqId);
      expect(updated?.status).toBe("replayed");
      expect(updated?.replayedAt).toBeDefined();

      // Active DLQ count drops to 0
      expect(await dlq.getActiveCount("daily-pipeline")).toBe(0);

      // Duplicate replay is rejected gracefully
      const secondReplay = await dlq.replayJob(record.dlqId);
      expect(secondReplay.ok).toBe(false);
      expect(secondReplay.error).toBe("Job already replayed");
    });

    it("batch replays all quarantined jobs across multiple queues", async () => {
      await dlq.quarantineJob({ id: "q1", name: "task_a", queueName: "cards", attemptsMade: 3 }, "err1");
      await dlq.quarantineJob({ id: "q2", name: "task_b", queueName: "cards", attemptsMade: 3 }, "err2");
      await dlq.quarantineJob({ id: "q3", name: "task_c", queueName: "daily-pipeline", attemptsMade: 3 }, "err3");

      expect(await dlq.getActiveCount()).toBe(3);

      const batchResult = await dlq.replayAll();
      expect(batchResult.total).toBe(3);
      expect(batchResult.replayed).toBe(3);
      expect(batchResult.failed).toBe(0);

      expect(await dlq.getActiveCount()).toBe(0);

      const stats = await dlq.getStats();
      expect(stats.activeCount).toBe(0);
      expect(stats.replayedCount).toBe(3);
    });

    it("filters batch replay by target queue", async () => {
      await dlq.quarantineJob({ id: "q_card", name: "render", queueName: "cards", attemptsMade: 3 }, "err");
      await dlq.quarantineJob({ id: "q_pipe", name: "stage", queueName: "daily-pipeline", attemptsMade: 3 }, "err");

      const res = await dlq.replayAll("cards");
      expect(res.total).toBe(1);
      expect(res.replayed).toBe(1);

      // Pipeline job is still active in DLQ
      expect(await dlq.getActiveCount("cards")).toBe(0);
      expect(await dlq.getActiveCount("daily-pipeline")).toBe(1);
    });
  });

  describe("Purge Operations", () => {
    it("purges single unrecoverable poison job from DLQ", async () => {
      const record = await dlq.quarantineJob(
        { id: "poison_malformed", name: "bad-job", queueName: "cards", attemptsMade: 5 },
        new Error("SyntaxError: unrepairable malformed JSON")
      );

      expect(await dlq.getActiveCount()).toBe(1);

      const purged = await dlq.purgeJob(record.dlqId);
      expect(purged).toBe(true);
      expect(await dlq.getActiveCount()).toBe(0);

      const nonExistent = await dlq.purgeJob("non_existent_dlq_id");
      expect(nonExistent).toBe(false);
    });

    it("purges all jobs from DLQ completely", async () => {
      await dlq.quarantineJob({ id: "p1", queueName: "cards", attemptsMade: 3 }, "err");
      await dlq.quarantineJob({ id: "p2", queueName: "cards", attemptsMade: 3 }, "err");

      expect(await dlq.getActiveCount()).toBe(2);
      const purgedCount = await dlq.purgeAll();
      expect(purgedCount).toBe(2);
      expect(await dlq.getActiveCount()).toBe(0);
    });
  });

  describe("Worker Failed Event Hook Integration", () => {
    it("triggerDeadLetterAlert automatically moves job to DLQ", async () => {
      const mockJob = {
        id: "hook_job_1",
        name: "provisional-pairing",
        queueName: "daily-pipeline",
        data: { dropId: "today" },
        attemptsMade: 3,
        opts: { attempts: 3 },
      };

      const record = await triggerDeadLetterAlert(mockJob as any, new Error("Redis connection dropped"));

      expect(record).toBeDefined();
      expect(record?.originalJobId).toBe("hook_job_1");
      expect(record?.classification).toBe("db_connection");

      const found = await dlq.getJob(record!.dlqId);
      expect(found).not.toBeNull();
      expect(found?.status).toBe("quarantined");
    });
  });
});
