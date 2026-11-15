/**
 * @file partition.test.ts
 * @package @oddly/worker
 *
 * Automated Test Suite for R2.1: Table Partitioning and Retention
 * Tested against REAL PostgreSQL 16 (Docker)
 */

import { describe, expect, it, afterAll, beforeAll } from "vitest";
import pg from "pg";
import { PartitionManager } from "./partition.manager.js";
import { RetentionWorker } from "./retention.worker.js";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage R2.1: Table Partitioning and Retention (Real PostgreSQL 16)", () => {
  let client: pg.Client;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await PartitionManager.closePool();
    await RetentionWorker.closePool();
  });

  describe("Partition Pruning via EXPLAIN", () => {
    it("proves partition pruning on hot submit lookup (only targeted partition scanned)", async () => {
      // Create partitions for day A and day B
      const dateA = "2026-12-01";
      const dateB = "2026-12-02";
      const dateC = "2026-12-03";

      await client.query(`
        CREATE TABLE IF NOT EXISTS submissions_y2026_m12_d01 PARTITION OF submissions
        FOR VALUES FROM ('${dateA}') TO ('${dateB}');
        CREATE TABLE IF NOT EXISTS submissions_y2026_m12_d02 PARTITION OF submissions
        FOR VALUES FROM ('${dateB}') TO ('${dateC}');
      `);

      // Seed a row in dateA
      await client.query(`
        INSERT INTO submissions (id, drop_id, drop_date, player_id, request_id, answers)
        VALUES ('sub_prune_1', 'drop_prune_1', '${dateA}', 'plyr_prune_1', 'req_prune_1', '[]'::jsonb)
        ON CONFLICT (drop_date, request_id) DO NOTHING;
      `);

      // Explain query with drop_date = dateA
      const res = await client.query(`
        EXPLAIN (FORMAT JSON)
        SELECT id FROM submissions WHERE drop_date = '${dateA}' AND request_id = 'req_prune_1';
      `);

      const planStr = JSON.stringify(res.rows[0]);
      expect(planStr).toContain("submissions_y2026_m12_d01");
      expect(planStr).not.toContain("submissions_y2026_m12_d02");
    });

    it("proves partition pruning on final batch chunk scan", async () => {
      const dateA = "2026-12-01";
      const res = await client.query(`
        EXPLAIN (FORMAT JSON)
        SELECT id, player_id FROM submissions WHERE drop_date = '${dateA}' LIMIT 5000;
      `);

      const planStr = JSON.stringify(res.rows[0]);
      expect(planStr).toContain("submissions_y2026_m12_d01");
      expect(planStr).not.toContain("submissions_y2026_m12_d02");
    });
  });

  describe("DEFAULT Partition Fallback and Alert Trigger", () => {
    it("captures row with missing partition into DEFAULT partition and triggers alert", async () => {
      // Date far in future with no explicit partition: 2029-01-01
      const unpartitionedDate = "2029-01-01";
      const uniqueReqId = `req_fallback_${Date.now()}`;
      const uniqueSubId = `sub_fallback_${Date.now()}`;
      const uniquePlayerId = `plyr_fallback_${Date.now()}`;

      // Insert row into submissions for unpartitioned date
      await client.query(`
        INSERT INTO submissions (id, drop_id, drop_date, player_id, request_id, answers)
        VALUES ($1, 'drop_fallback', $2, $3, $4, '[]'::jsonb);
      `, [uniqueSubId, unpartitionedDate, uniquePlayerId, uniqueReqId]);

      // Verify row exists in submissions_default
      const defaultRowRes = await client.query(
        "SELECT id FROM submissions_default WHERE id = $1",
        [uniqueSubId]
      );
      expect(defaultRowRes.rows.length).toBe(1);

      // Verify alert was automatically inserted into partition_alerts by trigger
      const alertRes = await client.query(
        "SELECT * FROM partition_alerts WHERE row_id = $1",
        [uniqueSubId]
      );
      expect(alertRes.rows.length).toBeGreaterThanOrEqual(1);
      expect(alertRes.rows[0].table_name).toBe("submissions_default");
      expect(alertRes.rows[0].alert_message).toContain("Row inserted into DEFAULT partition");
    });
  });

  describe("Partition Manager Scheduled Job", () => {
    it("idempotently pre-creates partitions 14 days ahead and reports future count", async () => {
      const testRefDate = new Date("2026-11-15T00:00:00.000Z");
      const result = await PartitionManager.ensureFuturePartitions(14, testRefDate, DATABASE_URL);

      expect(result.checkedDates.length).toBe(15); // today + 14 days
      expect(result.futureCount).toBeGreaterThanOrEqual(7);
      expect(result.alertTriggered).toBe(false);

      // Running it a second time is idempotent (createdCount = 0)
      const rerun = await PartitionManager.ensureFuturePartitions(14, testRefDate, DATABASE_URL);
      expect(rerun.createdCount).toBe(0);
      expect(rerun.existingCount).toBeGreaterThan(0);
    });

    it("triggers alert when fewer than 7 future partitions exist", async () => {
      // Reference date far ahead in 2035 where only 2 partitions exist
      const futureDate = new Date("2035-06-01T00:00:00.000Z");
      // Pre-create only 2 days ahead
      const result = await PartitionManager.ensureFuturePartitions(2, futureDate, DATABASE_URL);
      expect(result.futureCount).toBeLessThan(7);
      expect(result.alertTriggered).toBe(true);

      // Verify alert in partition_alerts table
      const alertRes = await client.query(`
        SELECT * FROM partition_alerts 
        WHERE row_id = 'partition_manager_guard'
        ORDER BY created_at DESC LIMIT 1;
      `);
      expect(alertRes.rows.length).toBe(1);
      expect(alertRes.rows[0].alert_message).toContain("Fewer than 7 future partitions exist");
    });
  });

  describe("Retention Worker Job", () => {
    it("compacts player history into user_history_summaries before dropping raw partition", async () => {
      const oldDropDate = "2026-05-01";
      const nextDay = "2026-05-02";

      // 1. Create a partition for this old date
      await client.query(`
        CREATE TABLE IF NOT EXISTS submission_answers_y2026_m05_d01 PARTITION OF submission_answers
        FOR VALUES FROM ('${oldDropDate}') TO ('${nextDay}');
      `);

      // 2. Ensure player, submission, and match exist
      const playerId = `plyr_ret_${Date.now()}`;
      const twinId = `twin_ret_${Date.now()}`;
      await client.query(`
        INSERT INTO players (id, did, region, age_band)
        VALUES ('${playerId}', 'did_${playerId}', 'IN', '25-34'),
               ('${twinId}', 'did_${twinId}', 'US', '25-34')
        ON CONFLICT DO NOTHING;
      `);

      const dropId = `drop_ret_${Date.now()}`;
      await client.query(`
        INSERT INTO drops (id, drop_date, opens_at, closes_at, status)
        VALUES ('${dropId}', '${oldDropDate}', NOW(), NOW(), 'closed')
        ON CONFLICT (drop_date) DO NOTHING;
      `);

      const subId = `sub_ret_${Date.now()}`;
      await client.query(`
        INSERT INTO submissions (id, drop_id, drop_date, player_id, request_id, answers)
        VALUES ('${subId}', '${dropId}', '${oldDropDate}', '${playerId}', 'req_${subId}', '[{"question_id":"q1","value":"Tea"}]'::jsonb);
      `);

      await client.query(`
        INSERT INTO submission_answers (id, submission_id, drop_id, drop_date, player_id, question_id, value)
        VALUES ('ans_${subId}', '${subId}', '${dropId}', '${oldDropDate}', '${playerId}', 'q1', 'Tea');
      `);

      await client.query(`
        INSERT INTO matches (id, drop_id, drop_date, player_a_id, player_b_id, similarity_score, is_provisional)
        VALUES ('match_${subId}', '${dropId}', '${oldDropDate}', '${playerId}', '${twinId}', 0.85, false);
      `);

      // 3. Run retention with reference date in November 2026 (> 90 days after May 2026)
      const refDate = new Date("2026-11-15T00:00:00.000Z");
      const retentionResult = await RetentionWorker.processRetention(
        { retentionAnswersDays: 90 },
        refDate,
        DATABASE_URL
      );

      // Verify partition was detached and dropped
      expect(retentionResult.partitionsDetached).toContain("submission_answers_y2026_m05_d01");
      expect(retentionResult.partitionsDropped).toContain("submission_answers_y2026_m05_d01");

      // 4. Verify user_history_summaries contains the compacted player record
      const summaryRes = await client.query(
        "SELECT * FROM user_history_summaries WHERE player_id = $1 AND drop_date = $2",
        [playerId, oldDropDate]
      );
      expect(summaryRes.rows.length).toBe(1);
      expect(summaryRes.rows[0].similarity_score).toBe(0.85);
      expect(summaryRes.rows[0].twin_player_id).toBe(twinId);
      expect(summaryRes.rows[0].summary_json.retained_via).toBe("90_day_compaction");

      // Verify the dropped table no longer exists in pg_class
      const tableCheck = await client.query(
        "SELECT relname FROM pg_class WHERE relname = 'submission_answers_y2026_m05_d01'"
      );
      expect(tableCheck.rows.length).toBe(0);
    });

    it("prunes inactive unlinked guest players after retention_guest_days", async () => {
      const oldGuestDate = new Date(Date.now() - 100 * 86400000); // 100 days old
      const oldGuestId = `guest_inactive_${Date.now()}`;

      await client.query(`
        INSERT INTO players (id, did, region, age_band, account_id, created_at)
        VALUES ('${oldGuestId}', 'did_${oldGuestId}', 'IN', '18-24', NULL, $1);
      `, [oldGuestDate]);

      const res = await RetentionWorker.processRetention(
        { retentionGuestDays: 90 },
        new Date(),
        DATABASE_URL
      );

      expect(res.inactiveGuestsPruned).toBeGreaterThanOrEqual(1);

      // Confirm guest player is pruned
      const check = await client.query("SELECT id FROM players WHERE id = $1", [oldGuestId]);
      expect(check.rows.length).toBe(0);
    });
  });
});
