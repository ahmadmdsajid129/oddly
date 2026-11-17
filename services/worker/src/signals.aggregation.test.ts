/**
 * @file signals.aggregation.test.ts
 * @package @oddly/worker
 *
 * Automated Test Suite for Stage M2 (Phase 10F): Signals Aggregation & Retention (P10F.06, P10F.07)
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import pg from "pg";
import { SignalsAggregationJob } from "./jobs/signals-aggregation.job.js";
import { RetentionWorker } from "./retention.worker.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M2 (Phase 10F): Signals Aggregation & Retention Jobs", () => {
  let client: pg.Client;
  const testDropDate = "2026-11-20";
  const questionId = randomUUID();
  const tagId = randomUUID();
  const analyticsId = randomUUID();

  beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL });
    await client.connect();

    // 1. Seed Drop, Question, and Tag
    const dropId = randomUUID();
    await client.query(
      `INSERT INTO drops (id, drop_date, opens_at, closes_at, status) VALUES ($1, $2::date, NOW(), NOW() + interval '16 hours', 'live') ON CONFLICT DO NOTHING;`,
      [dropId, testDropDate]
    );

    await client.query(
      `INSERT INTO tags (id, key, label_i18n, category) VALUES ($1, 'test_key', '{"en":"Test"}'::jsonb, 'subject') ON CONFLICT DO NOTHING;`,
      [tagId]
    );

    await client.query(
      `INSERT INTO questions (id, drop_id, position, type, payload) VALUES ($1, $2, 1, 'text', '{"prompt":"Signal test?"}'::jsonb) ON CONFLICT DO NOTHING;`,
      [questionId, dropId]
    );

    await client.query(
      `INSERT INTO question_tags (question_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
      [questionId, tagId]
    );

    // 2. Seed Raw Events
    await client.query(
      `INSERT INTO events_raw (id, analytics_id, drop_date, event_name, session_id, props, created_at)
       VALUES
       ($1, $2, $3::date, 'question_shown', 'sess-1', jsonb_build_object('question_id', $4::text, 'position', 1), NOW()),
       ($5, $2, $3::date, 'question_answered', 'sess-1', jsonb_build_object('question_id', $4::text, 'dwell_ms', 4500), NOW()),
       ($6, $2, $3::date, 'share_clicked', 'sess-1', jsonb_build_object('question_id', $4::text), NOW());`,
      [randomUUID(), analyticsId, testDropDate, questionId, randomUUID(), randomUUID()]
    );
  });

  afterAll(async () => {
    try {
      await client.query(`DELETE FROM question_stats_daily WHERE drop_date = $1::date;`, [testDropDate]);
      await client.query(`DELETE FROM tag_stats_daily WHERE drop_date = $1::date;`, [testDropDate]);
      await client.query(`DELETE FROM events_raw WHERE drop_date = $1::date;`, [testDropDate]);
      await client.query(`DELETE FROM question_tags WHERE question_id = $1;`, [questionId]);
      await client.query(`DELETE FROM questions WHERE id = $1;`, [questionId]);
      await client.query(`DELETE FROM drops WHERE drop_date = $1::date;`, [testDropDate]);
      await client.query(`DELETE FROM tags WHERE id = $1;`, [tagId]);
    } catch {}

    await client.end();
    await SignalsAggregationJob.closePool();
    await RetentionWorker.closePool();
  });

  it("aggregates raw telemetry into question_stats_daily and tag_stats_daily (P10F.06)", async () => {
    const result = await SignalsAggregationJob.runDailyAggregation(testDropDate, DATABASE_URL);
    expect(result.dropDate).toBe(testDropDate);
    expect(result.questionsAggregated).toBeGreaterThanOrEqual(1);

    // Verify question_stats_daily record
    const qRes = await client.query(
      `SELECT * FROM question_stats_daily WHERE drop_date = $1::date AND question_id = $2;`,
      [testDropDate, questionId]
    );
    expect(qRes.rowCount).toBe(1);
    const qRow = qRes.rows[0];
    expect(Number(qRow.shown_count)).toBe(1);
    expect(Number(qRow.answered_count)).toBe(1);
    expect(Number(qRow.dwell_p50_ms)).toBe(4500);

    // Verify tag_stats_daily record
    const tRes = await client.query(
      `SELECT * FROM tag_stats_daily WHERE drop_date = $1::date AND tag_id = $2;`,
      [testDropDate, tagId]
    );
    expect(tRes.rowCount).toBe(1);
    const tRow = tRes.rows[0];
    expect(Number(tRow.share_count)).toBe(1);
  });

  it("retention worker identifies and drops expired events_raw partitions older than 90 days (P10F.07)", async () => {
    // Create an old mock partition for 120 days ago
    const oldPartitionName = "events_raw_y2025_m01_d01";
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${oldPartitionName} PARTITION OF events_raw
      FOR VALUES FROM ('2025-01-01') TO ('2025-01-02');
    `);

    // Run RetentionWorker check
    const result = await RetentionWorker.processRetention({}, new Date(), DATABASE_URL);
    expect(result.partitionsDropped).toContain(oldPartitionName);

    // Verify old partition is dropped
    const checkRes = await client.query(`
      SELECT to_regclass('public.${oldPartitionName}') as tbl;
    `);
    expect(checkRes.rows[0].tbl).toBeNull();
  });
});
