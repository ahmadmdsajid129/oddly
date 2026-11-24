/**
 * @file data-safety.test.ts
 * @package @oddly/shared
 *
 * Data Safety & Lane ID Integrity Tests (Stage B0 / Section C1).
 *
 * Proves:
 * 1. Duplicate drop cannot be created for the same lane and drop_date.
 * 2. Drop with NULL lane_id cannot be created (asserts CHECK constraint).
 * 3. Submission uniqueness: One submission per player per lane per drop_date.
 * 4. Multi-lane freedom: Same player can submit to multiple different lanes on the same drop_date.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "./db.js";

const prisma = new PrismaClient();

const EVERYDAY_LANE_ID = "00000000-0000-4000-a000-000000000001";
const MEMES_LANE_ID = "00000000-0000-4000-a000-000000000002";
const TEST_DATE = "2029-12-31";
const TEST_PLAYER_ID = "00000000-0000-4000-b000-000000000099";

describe("Stage B0 Section C1: Data Safety & Integrity", () => {
  beforeAll(async () => {
    // Clean up test drops and submissions if left over
    await prisma.$executeRawUnsafe(
      `DELETE FROM submissions WHERE drop_date = '${TEST_DATE}';`
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM drops WHERE drop_date = '${TEST_DATE}';`
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO players (id, did, region, age_band, created_at)
       VALUES ('${TEST_PLAYER_ID}', 'did-safety-test', 'IN', '18-24', NOW())
       ON CONFLICT (id) DO NOTHING;`
    );
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      `DELETE FROM submissions WHERE drop_date = '${TEST_DATE}';`
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM drops WHERE drop_date = '${TEST_DATE}';`
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM players WHERE id = '${TEST_PLAYER_ID}';`
    );
    await prisma.$disconnect();
  });

  it("proves duplicate drop cannot be created for the same lane and date", async () => {
    // 1. First insert should succeed
    await prisma.$executeRawUnsafe(
      `INSERT INTO drops (id, drop_date, opens_at, closes_at, lane_id, status)
       VALUES ('test-drop-1', '${TEST_DATE}', NOW(), NOW() + interval '24 hours', '${EVERYDAY_LANE_ID}', 'live');`
    );

    // 2. Duplicate insert in the same lane should throw unique violation
    let duplicateFailed = false;
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO drops (id, drop_date, opens_at, closes_at, lane_id, status)
         VALUES ('test-drop-2', '${TEST_DATE}', NOW(), NOW() + interval '24 hours', '${EVERYDAY_LANE_ID}', 'live');`
      );
    } catch (err: any) {
      duplicateFailed = true;
      expect(err.message).toMatch(/23505|already exists|unique/i);
    }
    expect(duplicateFailed).toBe(true);
  });

  it("proves drop with NULL lane_id cannot be created", async () => {
    let nullFailed = false;
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO drops (id, drop_date, opens_at, closes_at, lane_id, status)
         VALUES ('test-drop-null', '${TEST_DATE}', NOW(), NOW() + interval '24 hours', NULL, 'live');`
      );
    } catch (err: any) {
      nullFailed = true;
      expect(err.message).toMatch(/violates check constraint "chk_drops_lane_not_null"/i);
    }
    expect(nullFailed).toBe(true);
  });

  it("allows separate drops on the same date for DIFFERENT lanes", async () => {
    // Memes lane drop on same test date
    await prisma.$executeRawUnsafe(
      `INSERT INTO drops (id, drop_date, opens_at, closes_at, lane_id, status)
       VALUES ('test-drop-memes', '${TEST_DATE}', NOW(), NOW() + interval '24 hours', '${MEMES_LANE_ID}', 'live');`
    );

    const res = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT count(*)::int as cnt FROM drops WHERE drop_date = '${TEST_DATE}';`
    );
    // Both Everyday and Memes drops exist without collision
    expect(res[0]?.cnt).toBe(2);
  });

  it("proves a player can submit to multiple different lanes on the same day, but not twice to the same lane", async () => {
    // 1. Submit to Everyday lane
    await prisma.$executeRawUnsafe(
      `INSERT INTO submissions (id, drop_date, drop_id, player_id, lane_id, request_id, answers, submitted_at)
       VALUES ('sub-ev-1', '${TEST_DATE}', 'test-drop-1', '${TEST_PLAYER_ID}', '${EVERYDAY_LANE_ID}', 'req-1', '[]'::jsonb, NOW());`
    );

    // 2. Submit to Memes lane on the same drop_date -> SHOULD SUCCEED (D5)
    await prisma.$executeRawUnsafe(
      `INSERT INTO submissions (id, drop_date, drop_id, player_id, lane_id, request_id, answers, submitted_at)
       VALUES ('sub-me-1', '${TEST_DATE}', 'test-drop-memes', '${TEST_PLAYER_ID}', '${MEMES_LANE_ID}', 'req-2', '[]'::jsonb, NOW());`
    );

    // 3. Duplicate submission to Everyday lane -> MUST FAIL
    let duplicateSubFailed = false;
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO submissions (id, drop_date, drop_id, player_id, lane_id, request_id, answers, submitted_at)
         VALUES ('sub-ev-dup', '${TEST_DATE}', 'test-drop-1', '${TEST_PLAYER_ID}', '${EVERYDAY_LANE_ID}', 'req-3', '[]'::jsonb, NOW());`
      );
    } catch (err: any) {
      duplicateSubFailed = true;
      expect(err.message).toMatch(/23505|already exists|unique/i);
    }
    expect(duplicateSubFailed).toBe(true);
  });
});
