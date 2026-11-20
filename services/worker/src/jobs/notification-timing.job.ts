/**
 * @file notification-timing.job.ts
 * @package @oddly/worker
 *
 * Cohort notification timing optimization model worker (Stage M4 / Phase 10H / P10H.06).
 *
 * Invariants:
 * 1. Rule 15 (No Individual Profiling): Aggregate hourly open rates (0-23 UTC) strictly by macro-cohort (region_ageband).
 * 2. Zero individual vector storage.
 * 3. Fallback to GLOBAL cohort if local cohort sample size is thin (< 50 samples).
 */

import { prisma } from "../db.js";

export interface CohortTimingResult {
  cohortKey: string;
  hourOfDayUtc: number;
  openRate: number;
  samplesCount: number;
}

export interface NotificationTimingJobResult {
  cohortsProcessed: number;
  bucketsUpserted: number;
  totalSamples: number;
}

export class NotificationTimingJob {
  /**
   * Aggregates event open distributions and updates notification_timing_stats.
   */
  static async runCohortTimingAggregation(options?: {
    days?: number;
  }): Promise<NotificationTimingJobResult> {
    const days = options?.days ?? 14;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // 1. Query raw notification/drop engagement events by UTC hour and player cohort
    // Events: 'drop_started', 'push_notification_opened', 'question_shown'
    const hourlyEvents = await prisma.$queryRaw<
      Array<{
        cohort_key: string;
        hour_utc: number;
        sample_count: bigint;
      }>
    >`
      SELECT 
        COALESCE(p.region || '_' || p.age_band, 'GLOBAL') AS cohort_key,
        EXTRACT(HOUR FROM e.created_at)::smallint AS hour_utc,
        COUNT(*)::bigint AS sample_count
      FROM events_raw e
      JOIN analytics_ids a ON a.analytics_id = e.analytics_id
      JOIN players p ON p.id = a.player_id
      WHERE e.created_at >= ${cutoffDate}
        AND e.event_name IN ('drop_started', 'drop_completed', 'push_notification_opened')
      GROUP BY cohort_key, hour_utc
      ORDER BY cohort_key, hour_utc;
    `;

    // Group counts per cohort
    const cohortTotals = new Map<string, number>();
    const cohortHourly = new Map<string, Map<number, number>>();

    for (const row of hourlyEvents) {
      const cohortKey = row.cohort_key;
      const hour = Number(row.hour_utc);
      const count = Number(row.sample_count);

      cohortTotals.set(cohortKey, (cohortTotals.get(cohortKey) || 0) + count);

      let hourMap = cohortHourly.get(cohortKey);
      if (!hourMap) {
        hourMap = new Map();
        cohortHourly.set(cohortKey, hourMap);
      }
      hourMap.set(hour, count);
    }

    let bucketsUpserted = 0;
    let totalSamples = 0;

    const now = new Date();

    for (const [cohortKey, total] of cohortTotals.entries()) {
      totalSamples += total;
      const hourMap = cohortHourly.get(cohortKey) || new Map();

      // Upsert all 24 hours (0-23 UTC) for the cohort
      for (let h = 0; h < 24; h++) {
        const count = hourMap.get(h) || 0;
        const openRate = total > 0 ? Math.round((count / total) * 10000) / 10000 : 0.0;

        await prisma.notificationTimingStat.upsert({
          where: {
            cohort_hour_unique: {
              cohort_key: cohortKey,
              hour_of_day_utc: h,
            },
          },
          create: {
            cohort_key: cohortKey,
            hour_of_day_utc: h,
            open_rate: openRate,
            samples_count: count,
            updated_at: now,
          },
          update: {
            open_rate: openRate,
            samples_count: count,
            updated_at: now,
          },
        });

        bucketsUpserted++;
      }
    }

    return {
      cohortsProcessed: cohortTotals.size,
      bucketsUpserted,
      totalSamples,
    };
  }

  /**
   * Retrieves the optimal UTC send hour for a given cohort.
   * If cohort samples < minCohortSamples, falls back to 'GLOBAL' cohort.
   */
  static async getOptimalSendHour(
    cohortKey: string,
    minCohortSamples: number = 50
  ): Promise<{ optimalHourUtc: number; cohortUsed: string; peakOpenRate: number }> {
    // 1. Try specific cohort
    const stats = await prisma.notificationTimingStat.findMany({
      where: { cohort_key: cohortKey },
      orderBy: { open_rate: "desc" },
    });

    const totalSamples = stats.reduce((acc, s) => acc + s.samples_count, 0);

    if (stats.length > 0 && totalSamples >= minCohortSamples) {
      return {
        optimalHourUtc: stats[0].hour_of_day_utc,
        cohortUsed: cohortKey,
        peakOpenRate: stats[0].open_rate,
      };
    }

    // 2. Fallback to GLOBAL cohort
    const globalStats = await prisma.notificationTimingStat.findMany({
      where: { cohort_key: "GLOBAL" },
      orderBy: { open_rate: "desc" },
    });

    if (globalStats.length > 0) {
      return {
        optimalHourUtc: globalStats[0].hour_of_day_utc,
        cohortUsed: "GLOBAL",
        peakOpenRate: globalStats[0].open_rate,
      };
    }

    // Default 07:00 IST (01:30 UTC -> 1 or 2 UTC)
    return {
      optimalHourUtc: 2,
      cohortUsed: "DEFAULT",
      peakOpenRate: 0.0,
    };
  }
}
