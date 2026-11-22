/**
 * @file submit-persist.test.ts
 * @package @oddly/worker
 *
 * Automated test suite for Mode B Asynchronous Persistence & Reconciliation (Task P3.16).
 * Verifies micro-batched ingestion, idempotency, answer stat updates, oddness calculation,
 * and reconciliation parity guarantees with zero data loss.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubmitPersistWorker, type ModeBSubmissionPayload } from "./workers/submit-persist.worker.js";
import { PersistReconciliationJob } from "./jobs/persist-reconciliation.job.js";
import { prisma } from "./db.js";
import type { Redis } from "ioredis";

// Mock the shared database client
vi.mock("./db.js", () => ({
  prisma: {
    submission: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    answerStat: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    oddnessScore: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
  executeWorkerWithTimeout: vi.fn((fn) => fn()),
}));

type MockRedis = {
  sadd: ReturnType<typeof vi.fn>;
  smembers: ReturnType<typeof vi.fn>;
  rpop: ReturnType<typeof vi.fn>;
  lpush: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
};

describe("Stage 3 (Task P3.16): Mode B Asynchronous Persistence & Reconciliation", () => {
  let mockRedis: MockRedis;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis = {
      sadd: vi.fn().mockResolvedValue(1),
      smembers: vi.fn().mockResolvedValue([]),
      rpop: vi.fn().mockResolvedValue(null),
      lpush: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      exists: vi.fn().mockResolvedValue(1),
    };
  });

  const samplePayload: ModeBSubmissionPayload = {
    drop_id: "drop-test-123",
    drop_date: "2026-11-22T00:00:00.000Z",
    player_id: "player-456",
    request_id: "req-unique-789",
    answers: [
      { question_id: "q1", value: "option_a" },
      { question_id: "q2", value: "option_b" },
      { question_id: "q3", value: "option_a" },
      { question_id: "q4", value: "option_c" },
      { question_id: "q5", value: "option_a" },
    ],
    timing_ms: 1250,
    is_bot_flagged: false,
    submitted_at: "2026-11-22T10:00:00.000Z",
  };

  describe("SubmitPersistWorker.persistSubmission", () => {
    it("idempotently skips database insertion if request_id already exists", async () => {
      const existingSubmission = {
        id: "sub-existing-1",
        request_id: "req-unique-789",
        drop_id: "drop-test-123",
        player_id: "player-456",
      };

      vi.mocked(prisma.submission.findFirst).mockResolvedValue(existingSubmission as any);

      const result = await SubmitPersistWorker.persistSubmission(samplePayload, mockRedis as unknown as Redis);

      expect(result).toEqual(existingSubmission);
      expect(prisma.submission.create).not.toHaveBeenCalled();
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        "drop:drop-test-123:persisted_requests",
        "req-unique-789"
      );
    });

    it("inserts submission, updates frequencies, computes oddness, and records persistence", async () => {
      vi.mocked(prisma.submission.findFirst).mockResolvedValue(null);

      const createdSub = {
        id: "sub-new-999",
        drop_id: "drop-test-123",
        player_id: "player-456",
        request_id: "req-unique-789",
      };
      vi.mocked(prisma.submission.create).mockResolvedValue(createdSub as any);
      vi.mocked(prisma.answerStat.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.submission.count).mockResolvedValue(10);
      vi.mocked(prisma.answerStat.findMany).mockResolvedValue([
        { question_id: "q1", value: "option_a", count: 5 } as any,
        { question_id: "q2", value: "option_b", count: 2 } as any,
        { question_id: "q3", value: "option_a", count: 8 } as any,
        { question_id: "q4", value: "option_c", count: 1 } as any,
        { question_id: "q5", value: "option_a", count: 4 } as any,
      ]);
      vi.mocked(prisma.oddnessScore.findMany).mockResolvedValue([
        { raw_score: 0.3 } as any,
        { raw_score: 0.7 } as any,
      ]);
      vi.mocked(prisma.oddnessScore.create).mockResolvedValue({} as any);

      const result = await SubmitPersistWorker.persistSubmission(samplePayload, mockRedis as unknown as Redis);

      expect(result).toEqual(createdSub);
      expect(prisma.submission.create).toHaveBeenCalledTimes(1);
      expect(prisma.answerStat.upsert).toHaveBeenCalledTimes(5);
      expect(prisma.oddnessScore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            submission_id: "sub-new-999",
            raw_score: expect.any(Number),
            percentile: expect.any(Number),
            tier: expect.any(String),
          }),
        })
      );
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        "drop:drop-test-123:persisted_requests",
        "req-unique-789"
      );
    });
  });

  describe("SubmitPersistWorker.drainQueue", () => {
    it("drains batch of submissions until queue is empty", async () => {
      vi.mocked(prisma.submission.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.submission.create).mockResolvedValue({ id: "sub-drained" } as any);
      vi.mocked(prisma.answerStat.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.submission.count).mockResolvedValue(1);
      vi.mocked(prisma.answerStat.findMany).mockResolvedValue([]);
      vi.mocked(prisma.oddnessScore.findMany).mockResolvedValue([]);
      vi.mocked(prisma.oddnessScore.create).mockResolvedValue({} as any);

      const queuePayload1 = JSON.stringify({ ...samplePayload, request_id: "req-1" });
      const queuePayload2 = JSON.stringify({ ...samplePayload, request_id: "req-2" });

      vi.mocked(mockRedis.rpop)
        .mockResolvedValueOnce(queuePayload1)
        .mockResolvedValueOnce(queuePayload2)
        .mockResolvedValueOnce(null);

      const processed = await SubmitPersistWorker.drainQueue(mockRedis as unknown as Redis, 10);

      expect(processed).toBe(2);
      expect(mockRedis.rpop).toHaveBeenCalledTimes(3);
      expect(prisma.submission.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("PersistReconciliationJob.reconcile", () => {
    it("verifies 100% parity when all acknowledged requests are persisted", async () => {
      const dropId = "drop-audit-123";
      vi.mocked(mockRedis.smembers)
        .mockResolvedValueOnce(["req-1", "req-2", "req-3"]) // acknowledged_requests
        .mockResolvedValueOnce(["req-1", "req-2"]); // persisted_requests in Redis

      vi.mocked(prisma.submission.findMany).mockResolvedValue([
        { request_id: "req-3" } as any,
      ]);

      const report = await PersistReconciliationJob.reconcile(dropId, mockRedis as unknown as Redis);

      expect(report.acknowledged_count).toBe(3);
      expect(report.persisted_count).toBe(3);
      expect(report.parity_percentage).toBe(100);
      expect(report.missing_count).toBe(0);
      expect(report.re_enqueued_count).toBe(0);
      expect(report.reconciled).toBe(true);
    });

    it("detects missing submissions and automatically re-enqueues them from durable Redis payload", async () => {
      const dropId = "drop-audit-456";
      vi.mocked(mockRedis.smembers)
        .mockResolvedValueOnce(["req-1", "req-missing-2"]) // acknowledged_requests
        .mockResolvedValueOnce(["req-1"]); // persisted_requests in Redis

      vi.mocked(prisma.submission.findMany).mockResolvedValue([
        { request_id: "req-1" } as any,
      ]);

      const durablePayload = JSON.stringify({ ...samplePayload, request_id: "req-missing-2" });
      vi.mocked(mockRedis.get).mockResolvedValue(durablePayload);

      const report = await PersistReconciliationJob.reconcile(dropId, mockRedis as unknown as Redis);

      expect(report.acknowledged_count).toBe(2);
      expect(report.persisted_count).toBe(1);
      expect(report.parity_percentage).toBe(50);
      expect(report.missing_count).toBe(1);
      expect(report.re_enqueued_count).toBe(1);
      expect(report.reconciled).toBe(false);

      expect(mockRedis.get).toHaveBeenCalledWith("submission:payload:req-missing-2");
      expect(mockRedis.lpush).toHaveBeenCalledWith("oddly:queue:submit-persist", durablePayload);
    });

    it("handles empty drop state with 100% parity", async () => {
      const dropId = "drop-empty-789";
      vi.mocked(mockRedis.smembers)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      vi.mocked(prisma.submission.findMany).mockResolvedValue([]);

      const report = await PersistReconciliationJob.reconcile(dropId, mockRedis as unknown as Redis);

      expect(report.acknowledged_count).toBe(0);
      expect(report.persisted_count).toBe(0);
      expect(report.parity_percentage).toBe(100);
      expect(report.missing_count).toBe(0);
      expect(report.reconciled).toBe(true);
    });
  });
});

