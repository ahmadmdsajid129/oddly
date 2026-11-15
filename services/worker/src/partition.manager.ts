/**
 * @file partition.manager.ts
 * @package @oddly/worker
 *
 * Partition Manager Worker Job (R2.1)
 * Idempotently pre-creates PostgreSQL range partitions for:
 * - submissions
 * - submission_answers
 * - matches
 * - answer_stats
 *
 * Rules:
 * - Pre-creates partitions at least 14 days in advance
 * - Alerts if fewer than 7 future partitions exist
 * - Fully idempotent (uses CREATE TABLE IF NOT EXISTS)
 */

import pg from "pg";
import { getTwinDay, offsetDate } from "@oddly/shared";

export interface PartitionManagerResult {
  createdCount: number;
  existingCount: number;
  futureCount: number;
  alertTriggered: boolean;
  checkedDates: string[];
}

export class PartitionManager {
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
   * Pre-creates range partitions for all partitioned tables for N days ahead.
   * Default daysAhead = 14.
   */
  static async ensureFuturePartitions(
    daysAhead: number = 14,
    referenceDate: Date = new Date(),
    connectionString?: string
  ): Promise<PartitionManagerResult> {
    const pool = this.getPool(connectionString);
    const client = await pool.connect();

    const tables = ["submissions", "submission_answers", "matches", "answer_stats"];
    const baseDate = getTwinDay(referenceDate);
    const checkedDates: string[] = [];

    let createdCount = 0;
    let existingCount = 0;

    try {
      for (let i = 0; i <= daysAhead; i++) {
        const currentDate = offsetDate(baseDate, i);
        const nextDate = offsetDate(currentDate, 1);
        checkedDates.push(currentDate);

        // Format name: submissions_yYYYY_mMM_dDD
        const [year, month, day] = currentDate.split("-");

        for (const table of tables) {
          const partitionName = `${table}_y${year}_m${month}_d${day}`;

          // Check if partition already exists
          const checkRes = await client.query(
            "SELECT relname FROM pg_class WHERE relname = $1",
            [partitionName]
          );

          if (checkRes.rows.length > 0) {
            existingCount++;
          } else {
            const createSql = `
              CREATE TABLE IF NOT EXISTS ${partitionName} PARTITION OF ${table}
              FOR VALUES FROM ('${currentDate}') TO ('${nextDate}');
            `;
            await client.query(createSql);
            createdCount++;
          }
        }
      }

      // Check how many future partitions exist beyond today
      const futureCheck = await this.countFuturePartitions(referenceDate, connectionString);
      const alertTriggered = futureCheck.futureCount < 7;

      if (alertTriggered) {
        console.warn(
          `[PartitionManager ALERT] Warning: Fewer than 7 future partitions exist! Count: ${futureCheck.futureCount}`
        );
        // Log alert row in partition_alerts
        await client.query(
          `INSERT INTO partition_alerts (table_name, drop_date, row_id, alert_message)
           VALUES ($1, $2, $3, $4)`,
          [
            "all_partitioned_tables",
            baseDate,
            "partition_manager_guard",
            `Fewer than 7 future partitions exist: found ${futureCheck.futureCount} days ahead`,
          ]
        );
      }

      return {
        createdCount,
        existingCount,
        futureCount: futureCheck.futureCount,
        alertTriggered,
        checkedDates,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Counts how many distinct future days have complete partitions across all 4 tables.
   */
  static async countFuturePartitions(
    referenceDate: Date = new Date(),
    connectionString?: string
  ): Promise<{ futureCount: number }> {
    const pool = this.getPool(connectionString);
    const client = await pool.connect();
    const baseDate = getTwinDay(referenceDate);

    try {
      // Find all partitions of submissions that represent future dates
      const query = `
        SELECT relname 
        FROM pg_class 
        WHERE relname LIKE 'submissions_y%'
        ORDER BY relname;
      `;
      const res = await client.query(query);

      let futureCount = 0;
      for (const row of res.rows) {
        // Parse submissions_yYYYY_mMM_dDD
        const match = row.relname.match(/^submissions_y(\d{4})_m(\d{2})_d(\d{2})$/);
        if (match) {
          const dateStr = `${match[1]}-${match[2]}-${match[3]}`;
          if (dateStr > baseDate) {
            futureCount++;
          }
        }
      }

      return { futureCount };
    } finally {
      client.release();
    }
  }
}

