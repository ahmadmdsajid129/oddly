/**
 * @file retention.worker.ts
 * @package @oddly/worker
 *
 * Retention Worker Job (R2.1)
 * Enforces data retention and minimization policies (DPDP Act 2023):
 * - retention_answers_days: 90 days
 * - retention_guest_days: 90 days
 * - retention_matches_days: 365 days
 *
 * Protocol:
 * 1. Before detaching or dropping raw submission_answers partitions, compact
 *    and ensure per-user summaries exist in `user_history_summaries`.
 * 2. Detach and drop the expired partition (`DETACH PARTITION` then `DROP TABLE`).
 * 3. History continues to serve seamlessly from `matches` and `user_history_summaries`.
 * 4. Inactive unlinked guest records are pruned after retention_guest_days.
 */

import pg from "pg";
import { getTwinDay, offsetDate } from "@oddly/shared";

export interface RetentionConfig {
  retentionAnswersDays: number;
  retentionGuestDays: number;
  retentionMatchesDays: number;
}

export interface RetentionResult {
  summariesCreated: number;
  partitionsDetached: string[];
  partitionsDropped: string[];
  inactiveGuestsPruned: number;
}

export class RetentionWorker {
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
   * Compacts player submission & match data into user_history_summaries before partition drop.
   */
  static async compactDropHistory(
    dropDate: string,
    client: pg.PoolClient
  ): Promise<number> {
    const compactSql = `
      INSERT INTO user_history_summaries (
        id, player_id, account_id, drop_id, drop_date,
        similarity_score, oddness_score, percentile, tier,
        twin_player_id, twin_region, summary_json, created_at
      )
      SELECT 
        gen_random_uuid()::text,
        s.player_id,
        p.account_id,
        s.drop_id,
        s.drop_date,
        COALESCE(m.similarity_score, 0) as similarity_score,
        COALESCE(o.raw_score, 0) as oddness_score,
        COALESCE(o.percentile, 0) as percentile,
        COALESCE(o.tier, 'Common') as tier,
        CASE 
          WHEN m.player_a_id = s.player_id THEN m.player_b_id 
          ELSE m.player_a_id 
        END as twin_player_id,
        twin_p.region as twin_region,
        jsonb_build_object(
          'answers_summary', s.answers,
          'matched_at', m.matched_at,
          'finalized_at', m.finalized_at,
          'retained_via', '90_day_compaction'
        ) as summary_json,
        NOW()
      FROM submissions s
      JOIN players p ON s.player_id = p.id
      LEFT JOIN matches m ON (m.drop_date = s.drop_date AND (m.player_a_id = s.player_id OR m.player_b_id = s.player_id))
      LEFT JOIN players twin_p ON (
        twin_p.id = CASE 
          WHEN m.player_a_id = s.player_id THEN m.player_b_id 
          ELSE m.player_a_id 
        END
      )
      LEFT JOIN oddness_scores o ON (o.submission_id = s.id AND o.drop_date = s.drop_date)
      WHERE s.drop_date = $1
      ON CONFLICT (player_id, drop_date) DO NOTHING;
    `;

    const res = await client.query(compactSql, [dropDate]);
    return res.rowCount ?? 0;
  }

  /**
   * Detaches and drops expired partitions older than retention cutoff.
   */
  static async processRetention(
    config: Partial<RetentionConfig> = {},
    referenceDate: Date = new Date(),
    connectionString?: string
  ): Promise<RetentionResult> {
    const retentionAnswersDays = config.retentionAnswersDays ?? 90;
    const retentionGuestDays = config.retentionGuestDays ?? 90;
    const retentionMatchesDays = config.retentionMatchesDays ?? 365;

    const pool = this.getPool(connectionString);
    const client = await pool.connect();

    const baseDate = getTwinDay(referenceDate);
    const answersCutoffDate = offsetDate(baseDate, -retentionAnswersDays);
    const matchesCutoffDate = offsetDate(baseDate, -retentionMatchesDays);
    const guestCutoffDate = offsetDate(baseDate, -retentionGuestDays);

    let totalSummaries = 0;
    const detached: string[] = [];
    const dropped: string[] = [];
    let inactiveGuestsPruned = 0;

    try {
      // 1. Identify submission_answers partitions older than answersCutoffDate
      const answersPartitionsQuery = `
        SELECT relname 
        FROM pg_class 
        WHERE relname LIKE 'submission_answers_y%'
        ORDER BY relname;
      `;
      const ansRes = await client.query(answersPartitionsQuery);

      for (const row of ansRes.rows) {
        const match = row.relname.match(/^submission_answers_y(\d{4})_m(\d{2})_d(\d{2})$/);
        if (match) {
          const partDate = `${match[1]}-${match[2]}-${match[3]}`;
          if (partDate < answersCutoffDate) {
            // A. Ensure summaries exist before dropping
            const compacted = await this.compactDropHistory(partDate, client);
            totalSummaries += compacted;

            // B. Detach and drop submission_answers partition
            await client.query(`ALTER TABLE submission_answers DETACH PARTITION ${row.relname}`);
            detached.push(row.relname);
            await client.query(`DROP TABLE IF EXISTS ${row.relname}`);
            dropped.push(row.relname);
          }
        }
      }

      // 2. Identify matches partitions older than matchesCutoffDate (365 days)
      const matchesPartitionsQuery = `
        SELECT relname 
        FROM pg_class 
        WHERE relname LIKE 'matches_y%'
        ORDER BY relname;
      `;
      const matchRes = await client.query(matchesPartitionsQuery);

      for (const row of matchRes.rows) {
        const match = row.relname.match(/^matches_y(\d{4})_m(\d{2})_d(\d{2})$/);
        if (match) {
          const partDate = `${match[1]}-${match[2]}-${match[3]}`;
          if (partDate < matchesCutoffDate) {
            await client.query(`ALTER TABLE matches DETACH PARTITION ${row.relname}`);
            detached.push(row.relname);
            await client.query(`DROP TABLE IF EXISTS ${row.relname}`);
            dropped.push(row.relname);
          }
        }
      }

      // 3. Purge inactive guest devices (unlinked to any account, no activity past retention window)
      const pruneGuestSql = `
        DELETE FROM players p
        WHERE p.account_id IS NULL
          AND p.created_at < $1::date
          AND NOT EXISTS (
            SELECT 1 FROM submissions s 
            WHERE s.player_id = p.id 
              AND s.submitted_at >= $1::date
          );
      `;
      const guestRes = await client.query(pruneGuestSql, [guestCutoffDate]);
      inactiveGuestsPruned = guestRes.rowCount ?? 0;

      return {
        summariesCreated: totalSummaries,
        partitionsDetached: detached,
        partitionsDropped: dropped,
        inactiveGuestsPruned,
      };
    } finally {
      client.release();
    }
  }
}

