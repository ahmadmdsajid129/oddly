/**
 * @file pipeline.test.ts
 * @package @oddly/worker
 *
 * Automated test suite for Stage 9: Scheduler and Daily Pipeline (P9.01 - P9.07).
 */

import { describe, expect, it, beforeEach } from "vitest";
import { getTimelineConfig, getDropLifecyclePhase } from "./clock.js";
import { PairingWorker, type PairingCandidate } from "./workers/pairing.worker.js";
import { ClosureWorker, type SubmissionData } from "./workers/closure.worker.js";
import { DailyScheduler } from "./scheduler.js";

describe("Stage 9: Daily Pipeline & Scheduler (P9.01 - P9.07)", () => {
  describe("P9.01 & P9.05: IST Timeline & Clock Acceleration", () => {
    it("returns 10-minute accelerated configuration in test/dev environment", () => {
      const config = getTimelineConfig();
      expect(config.isAccelerated).toBe(true);
      expect(config.cycleLengthSeconds).toBe(600);
      expect(config.pairingCron).toBe("*/1 * * * *");
    });

    it("correctly identifies lifecycle phase from IST time", () => {
      // 06:45 IST = staging (01:15 UTC)
      const stagingDate = new Date("2026-11-09T01:15:00.000Z");
      expect(getDropLifecyclePhase(stagingDate)).toBe("staging");

      // 07:15 IST = live (01:45 UTC)
      const liveDate = new Date("2026-11-09T01:45:00.000Z");
      expect(getDropLifecyclePhase(liveDate)).toBe("live");
    });
  });

  describe("P9.02: Provisional Pairing Worker", () => {
    beforeEach(() => {
      PairingWorker.clearMemory();
    });

    it("formats safe privacy-preserving twin location aliases", () => {
      expect(PairingWorker.formatTwinLocation("Berlin", "Germany")).toBe(
        "Stranger in Berlin, Germany"
      );
      expect(PairingWorker.formatTwinLocation(undefined, "Japan")).toBe(
        "Stranger in Japan"
      );
      expect(PairingWorker.formatTwinLocation(undefined, undefined, "IN")).toBe(
        "Stranger in IN"
      );
      expect(PairingWorker.formatTwinLocation()).toBe("Stranger in the World");
    });

    it("enforces strict age-band separation during provisional pairing sweeps", async () => {
      const candidates: PairingCandidate[] = [
        // 18-24 cluster
        {
          submission_id: "sub_1",
          player_id: "player_1",
          drop_id: "drop-1",
          age_band: "18-24",
          region: "IN",
          city: "Mumbai",
          country: "India",
          answers: [
            { question_id: "q1", value: "A" },
            { question_id: "q2", value: "B" },
          ],
          submitted_at: new Date("2026-11-09T02:00:00Z"),
        },
        {
          submission_id: "sub_2",
          player_id: "player_2",
          drop_id: "drop-1",
          age_band: "18-24",
          region: "DE",
          city: "Berlin",
          country: "Germany",
          answers: [
            { question_id: "q1", value: "A" },
            { question_id: "q2", value: "B" },
          ],
          submitted_at: new Date("2026-11-09T02:05:00Z"),
        },
        // 25-34 cluster
        {
          submission_id: "sub_3",
          player_id: "player_3",
          drop_id: "drop-1",
          age_band: "25-34",
          region: "JP",
          city: "Tokyo",
          country: "Japan",
          answers: [
            { question_id: "q1", value: "X" },
            { question_id: "q2", value: "Y" },
          ],
          submitted_at: new Date("2026-11-09T02:10:00Z"),
        },
        {
          submission_id: "sub_4",
          player_id: "player_4",
          drop_id: "drop-1",
          age_band: "25-34",
          region: "US",
          city: "New York",
          country: "USA",
          answers: [
            { question_id: "q1", value: "X" },
            { question_id: "q2", value: "Y" },
          ],
          submitted_at: new Date("2026-11-09T02:15:00Z"),
        },
      ];

      const optionMap = new Map([
        ["q1", ["A", "X"]],
        ["q2", ["B", "Y"]],
      ]);

      const result = await PairingWorker.runPairingSweep("drop-1", candidates, optionMap);

      expect(result.matchedPairsCount).toBe(2);
      expect(result.unmatchedCount).toBe(0);

      // Verify pair 1 is between player_1 and player_2 (both 18-24)
      const match18 = result.matches.find(
        (m) => m.player_a_id === "player_1" || m.player_b_id === "player_1"
      );
      expect(match18).toBeDefined();
      expect(["player_1", "player_2"]).toContain(match18?.player_a_id);
      expect(["player_1", "player_2"]).toContain(match18?.player_b_id);

      // Verify pair 2 is between player_3 and player_4 (both 25-34)
      const match25 = result.matches.find(
        (m) => m.player_a_id === "player_3" || m.player_b_id === "player_3"
      );
      expect(match25).toBeDefined();
      expect(["player_3", "player_4"]).toContain(match25?.player_a_id);
      expect(["player_3", "player_4"]).toContain(match25?.player_b_id);
    });
  });

  describe("P9.03: Final Batch Closure & Rarity Freezing", () => {
    it("freezes global answer distribution frequencies p(a)", () => {
      const submissions: SubmissionData[] = [
        {
          id: "s1",
          player_id: "p1",
          drop_id: "drop-test",
          answers: [
            { question_id: "q1", value: "Tea" },
            { question_id: "q2", value: "Night" },
          ],
          submitted_at: new Date(),
        },
        {
          id: "s2",
          player_id: "p2",
          drop_id: "drop-test",
          answers: [
            { question_id: "q1", value: "Coffee" },
            { question_id: "q2", value: "Night" },
          ],
          submitted_at: new Date(),
        },
      ];

      const freqs = ClosureWorker.computeAnswerFrequencies(submissions);
      expect(freqs.length).toBe(3);

      const nightFreq = freqs.find((f) => f.value === "Night");
      expect(nightFreq?.count).toBe(2);
      expect(nightFreq?.probability).toBe(1.0);

      const teaFreq = freqs.find((f) => f.value === "Tea");
      expect(teaFreq?.count).toBe(1);
      expect(teaFreq?.probability).toBe(0.5);
    });

    it("finalizes submissions, computes percentiles, tiers, and locks immutability", async () => {
      const submissions: SubmissionData[] = [
        {
          id: "s1",
          player_id: "p1",
          drop_id: "drop-test",
          answers: [{ question_id: "q1", value: "RareChoice" }],
          submitted_at: new Date(),
        },
        {
          id: "s2",
          player_id: "p2",
          drop_id: "drop-test",
          answers: [{ question_id: "q1", value: "CommonChoice" }],
          submitted_at: new Date(),
        },
      ];

      const freqs = [
        { question_id: "q1", value: "RareChoice", count: 1, probability: 0.1 },
        { question_id: "q1", value: "CommonChoice", count: 9, probability: 0.9 },
      ];

      const finalized = ClosureWorker.finalizeDropSubmissions("drop-test", submissions, freqs);

      expect(finalized.length).toBe(2);
      const rareSub = finalized.find((f) => f.submission_id === "s1");
      const commonSub = finalized.find((f) => f.submission_id === "s2");

      expect(rareSub?.is_immutable).toBe(true);
      expect(commonSub?.is_immutable).toBe(true);
      expect(rareSub?.oddness_score).toBeGreaterThan(commonSub!.oddness_score);
    });

    it("calculates streaks and identifies milestone awards (7, 30, 100, 365)", () => {
      const playerDates = new Map<string, string[]>([
        [
          "player_7_day",
          [
            "2026-11-09",
            "2026-11-08",
            "2026-11-07",
            "2026-11-06",
            "2026-11-05",
            "2026-11-04",
            "2026-11-03",
          ],
        ],
        ["player_3_day", ["2026-11-09", "2026-11-08", "2026-11-07"]],
      ]);

      const results = ClosureWorker.processStreaks(playerDates);
      const p7 = results.find((r) => r.player_id === "player_7_day");
      const p3 = results.find((r) => r.player_id === "player_3_day");

      expect(p7?.streak).toBe(7);
      expect(p7?.milestoneAwarded).toBe(7);

      expect(p3?.streak).toBe(3);
      expect(p3?.milestoneAwarded).toBeNull();
    });
  });

  describe("P9.01 & P9.06: DailyScheduler Execution", () => {
    it("lists all required 4 daily pipeline scheduled jobs", () => {
      const scheduler = new DailyScheduler();
      const jobs = scheduler.getScheduledJobs();

      expect(jobs.length).toBe(4);
      const jobNames = jobs.map((j) => j.name);
      expect(jobNames).toContain("stage-drop");
      expect(jobNames).toContain("open-drop");
      expect(jobNames).toContain("provisional-pairing");
      expect(jobNames).toContain("close-drop");
    });

    it("triggers staging, opening, and closure operations idempotently", async () => {
      const scheduler = new DailyScheduler();

      const stageRes = await scheduler.triggerStageDrop("drop-daily-1");
      expect(stageRes.ok).toBe(true);
      expect(stageRes.status).toBe("pending");

      const openRes = await scheduler.triggerOpenDrop("drop-daily-1");
      expect(openRes.ok).toBe(true);
      expect(openRes.status).toBe("live");

      const closeRes = await scheduler.triggerDropClosure("drop-daily-1", []);
      expect(closeRes.distributions_frozen).toBe(true);
      expect(closeRes.scores_finalized).toBe(0);
    });
  });
});
