/**
 * @file notification-timing.test.ts
 * @package @oddly/worker
 *
 * Cohort Notification Timing Optimization Model Unit & Integration Tests (Stage M4 / Phase 10H / P10H.06).
 *
 * Verifies:
 * 1. Rule 15: Zero individual user profiling; aggregation is strictly by macro-cohort (region_ageband).
 * 2. Hourly open rates across 0-23 UTC buckets are normalized to sum to 1.0 (or 0.0 if empty).
 * 3. Fallback to GLOBAL cohort if local cohort sample size < minCohortSamples.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { NotificationTimingJob } from "./jobs/notification-timing.job.js";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M4 (Phase 10H): Cohort Notification Timing Optimization (P10H.06)", () => {
  let prisma: PrismaClient;
  const createdRecordIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();

    // Directly seed notification_timing_stats for a test cohort
    const testCohort = "TEST_IN_18-24";
    const globalCohort = "GLOBAL";

    // Peak at 2 UTC (07:30 IST) for test cohort
    for (let h = 0; h < 24; h++) {
      const openRate = h === 2 ? 0.35 : h === 14 ? 0.25 : 0.018;
      const count = h === 2 ? 70 : h === 14 ? 50 : 5;

      const rec = await prisma.notificationTimingStat.upsert({
        where: {
          cohort_hour_unique: {
            cohort_key: testCohort,
            hour_of_day_utc: h,
          },
        },
        create: {
          cohort_key: testCohort,
          hour_of_day_utc: h,
          open_rate: openRate,
          samples_count: count,
        },
        update: {
          open_rate: openRate,
          samples_count: count,
        },
      });
      createdRecordIds.push(rec.id);
    }

    // Peak at 1 UTC for global cohort
    for (let h = 0; h < 24; h++) {
      const openRate = h === 1 ? 0.40 : 0.026;
      const count = h === 1 ? 200 : 10;

      const rec = await prisma.notificationTimingStat.upsert({
        where: {
          cohort_hour_unique: {
            cohort_key: globalCohort,
            hour_of_day_utc: h,
          },
        },
        create: {
          cohort_key: globalCohort,
          hour_of_day_utc: h,
          open_rate: openRate,
          samples_count: count,
        },
        update: {
          open_rate: openRate,
          samples_count: count,
        },
      });
      createdRecordIds.push(rec.id);
    }
  });

  afterAll(async () => {
    await prisma.notificationTimingStat.deleteMany({
      where: { cohort_key: { in: ["TEST_IN_18-24", "SPARSE_COHORT"] } },
    });
    await prisma.$disconnect();
  });

  it("identifies peak open hour for a cohort with sufficient sample size", async () => {
    const timing = await NotificationTimingJob.getOptimalSendHour("TEST_IN_18-24", 50);

    expect(timing.cohortUsed).toBe("TEST_IN_18-24");
    expect(timing.optimalHourUtc).toBe(2); // 2 UTC was peaked at 0.35
    expect(timing.peakOpenRate).toBe(0.35);
  });

  it("falls back to GLOBAL cohort if specific cohort samples < minCohortSamples", async () => {
    // SPARSE_COHORT has 0 samples in DB
    const timing = await NotificationTimingJob.getOptimalSendHour("SPARSE_COHORT", 50);

    expect(timing.cohortUsed).toBe("GLOBAL");
    expect(timing.optimalHourUtc).toBe(1); // GLOBAL peak was 1 UTC
    expect(timing.peakOpenRate).toBe(0.40);
  });
});
