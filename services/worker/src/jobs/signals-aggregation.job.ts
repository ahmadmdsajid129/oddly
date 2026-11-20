/**
 * @file signals-aggregation.job.ts
 * @package @oddly/worker
 *
 * Daily worker aggregation job for telemetry signals (Stage M2 / Phase 10F / P10F.06).
 * Runs at 07:15 IST off-peak after the daily drop closes.
 *
 * Aggregations:
 * 1. events_raw -> question_stats_daily (dwell p50/p90, change/back/abandon rates)
 * 2. events_raw -> tag_stats_daily (completions, share count, dwell by subject tag)
 */

import pg from "pg";

export interface SignalsAggregationResult {
  dropDate: string;
  questionsAggregated: number;
  tagsAggregated: number;
}

export class SignalsAggregationJob {
  private static pool: pg.Pool | null = null;

  static getPool(connectionString?: string): pg.Pool {
    if (!this.pool) {
      const url =
        connectionString ||
        process.env.DATABASE_URL ||
        "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";
      this.pool = new pg.Pool({ connectionString: url });
    }
    return this.pool;
  }

  static async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Run the daily aggregation for a given drop date (YYYY-MM-DD).
   */
  static async runDailyAggregation(
    dropDate: string,
    connectionString?: string
  ): Promise<SignalsAggregationResult> {
    const pool = this.getPool(connectionString);
    const client = await pool.connect();

    try {
      await client.query("BEGIN;");

      // 1. Aggregate Question Quality Metrics
      const questionAggSql = `
        INSERT INTO question_stats_daily (
          drop_date,
          question_id,
          shown_count,
          answered_count,
          dwell_p50_ms,
          dwell_p90_ms,
          change_rate,
          back_rate,
          abandon_rate,
          report_rate,
          entropy,
          updated_at
        )
        SELECT
          $1::date AS drop_date,
          (props->>'question_id') AS question_id,
          COUNT(*) FILTER (WHERE event_name = 'question_shown') AS shown_count,
          COUNT(*) FILTER (WHERE event_name = 'question_answered') AS answered_count,
          COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (props->>'dwell_ms')::numeric) FILTER (WHERE props->>'dwell_ms' IS NOT NULL), 0)::int AS dwell_p50_ms,
          COALESCE(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY (props->>'dwell_ms')::numeric) FILTER (WHERE props->>'dwell_ms' IS NOT NULL), 0)::int AS dwell_p90_ms,
          ROUND((COUNT(*) FILTER (WHERE event_name = 'question_changed')::numeric / GREATEST(1, COUNT(*) FILTER (WHERE event_name = 'question_shown'))), 4)::float AS change_rate,
          ROUND((COUNT(*) FILTER (WHERE event_name = 'question_back')::numeric / GREATEST(1, COUNT(*) FILTER (WHERE event_name = 'question_shown'))), 4)::float AS back_rate,
          GREATEST(0.0, ROUND(1.0 - (COUNT(*) FILTER (WHERE event_name = 'question_answered')::numeric / GREATEST(1, COUNT(*) FILTER (WHERE event_name = 'question_shown'))), 4))::float AS abandon_rate,
          0.0::float AS report_rate,
          0.0::float AS entropy,
          NOW() AS updated_at
        FROM events_raw
        WHERE drop_date = $1::date
          AND props->>'question_id' IS NOT NULL
        GROUP BY (props->>'question_id')
        ON CONFLICT (drop_date, question_id) DO UPDATE SET
          shown_count = EXCLUDED.shown_count,
          answered_count = EXCLUDED.answered_count,
          dwell_p50_ms = EXCLUDED.dwell_p50_ms,
          dwell_p90_ms = EXCLUDED.dwell_p90_ms,
          change_rate = EXCLUDED.change_rate,
          back_rate = EXCLUDED.back_rate,
          abandon_rate = EXCLUDED.abandon_rate,
          updated_at = NOW();
      `;

      const qRes = await client.query(questionAggSql, [dropDate]);
      const questionsAggregated = qRes.rowCount ?? 0;

      // 2. Aggregate Subject Tag Performance Metrics
      const tagAggSql = `
        INSERT INTO tag_stats_daily (
          drop_date,
          tag_id,
          completions,
          share_count,
          dwell_p50_ms,
          updated_at
        )
        SELECT
          $1::date AS drop_date,
          qt.tag_id,
          COUNT(DISTINCT e.session_id) FILTER (WHERE e.event_name = 'drop_completed') AS completions,
          COUNT(*) FILTER (WHERE e.event_name = 'share_clicked') AS share_count,
          COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (e.props->>'dwell_ms')::numeric) FILTER (WHERE e.props->>'dwell_ms' IS NOT NULL), 0)::int AS dwell_p50_ms,
          NOW() AS updated_at
        FROM events_raw e
        JOIN question_tags qt ON qt.question_id = (e.props->>'question_id')
        WHERE e.drop_date = $1::date
        GROUP BY qt.tag_id
        ON CONFLICT (drop_date, tag_id) DO UPDATE SET
          completions = EXCLUDED.completions,
          share_count = EXCLUDED.share_count,
          dwell_p50_ms = EXCLUDED.dwell_p50_ms,
          updated_at = NOW();
      `;

      const tRes = await client.query(tagAggSql, [dropDate]);
      const tagsAggregated = tRes.rowCount ?? 0;

      await client.query("COMMIT;");

      return {
        dropDate,
        questionsAggregated,
        tagsAggregated,
      };
    } catch (err) {
      await client.query("ROLLBACK;");
      throw err;
    } finally {
      client.release();
    }
  }
}

