#!/usr/bin/env node
/**
 * @file backfill-lanes.mjs
 * @package oddly
 *
 * Idempotent, resumable backfill script assigning all existing historical Drops,
 * Questions, Submissions, Answers, Matches, and secondary objects to Everyday lane (P10L.02).
 *
 * Invariants:
 * 1. Batched processing (5,000 rows/batch) with throttling to prevent replication lag.
 * 2. Idempotent: safe to run multiple times, only processes WHERE lane_id IS NULL.
 * 3. Validation: asserts zero NULLs remain before reporting success.
 * 4. Transactional safety per batch.
 */

import { createRequire } from "node:module";
const require = createRequire(new URL("../packages/shared/package.json", import.meta.url));
const { Client } = require("pg");

const EVERYDAY_LANE_ID = "00000000-0000-4000-a000-000000000001";
const BATCH_SIZE = 5000;
const SLEEP_MS = 50;

const TARGET_TABLES = [
  "drops",
  "questions",
  "submissions",
  "submission_answers",
  "matches",
  "oddness_scores",
  "anti_twin_results",
  "twin_keeps",
  "orbits",
  "orbit_expressions",
  "telepathy_guesses",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runBackfill(connectionString = process.env.DATABASE_URL) {
  const dbUrl = connectionString || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log("==================================================================");
  console.log("Oddly Phase 10L: Everyday Lane Historical Backfill (P10L.02)");
  console.log(`Target Lane: everyday (${EVERYDAY_LANE_ID})`);
  console.log(`Database: ${dbUrl}`);
  console.log("==================================================================\n");

  const results = {};

  try {
    // 1. Verify Everyday lane exists
    const laneCheck = await client.query("SELECT id, slug, status FROM lanes WHERE id = $1;", [EVERYDAY_LANE_ID]);
    if (laneCheck.rows.length === 0) {
      throw new Error(`Everyday lane ${EVERYDAY_LANE_ID} not found in database. Run migration 012 first!`);
    }
    console.log(`[Verify] Verified Everyday lane: slug='${laneCheck.rows[0].slug}', status='${laneCheck.rows[0].status}'\n`);

    // 2. Iterate each target table
    for (const table of TARGET_TABLES) {
      // Check if table exists
      const tableCheck = await client.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1);",
        [table]
      );
      if (!tableCheck.rows[0].exists) {
        console.log(`[Skip] Table '${table}' does not exist in schema. Skipping.`);
        continue;
      }

      // Check if column lane_id exists
      const colCheck = await client.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'lane_id');",
        [table]
      );
      if (!colCheck.rows[0].exists) {
        console.log(`[Skip] Column 'lane_id' does not exist on table '${table}'. Skipping.`);
        continue;
      }

      // Count null rows
      const countRes = await client.query(`SELECT COUNT(*)::int as cnt FROM "${table}" WHERE lane_id IS NULL;`);
      const initialNulls = countRes.rows[0].cnt;

      if (initialNulls === 0) {
        console.log(`[Clean] Table '${table}': 0 rows with NULL lane_id.`);
        results[table] = { updated: 0, remainingNulls: 0, status: "ALREADY_CLEAN" };
        continue;
      }

      console.log(`[Backfill] Table '${table}': ${initialNulls} rows to update in batches of ${BATCH_SIZE}...`);
      let totalUpdated = 0;

      while (true) {
        const updateRes = await client.query(
          `UPDATE "${table}" 
           SET lane_id = $1 
           WHERE ctid IN (
             SELECT ctid FROM "${table}" 
             WHERE lane_id IS NULL 
             LIMIT $2
           );`,
          [EVERYDAY_LANE_ID, BATCH_SIZE]
        );

        const rowsUpdated = updateRes.rowCount;
        totalUpdated += rowsUpdated;
        console.log(`  -> Updated ${rowsUpdated} rows (total: ${totalUpdated}/${initialNulls})`);

        if (rowsUpdated < BATCH_SIZE) break;
        await sleep(SLEEP_MS);
      }

      // Verify zero nulls remain
      const finalCount = await client.query(`SELECT COUNT(*)::int as cnt FROM "${table}" WHERE lane_id IS NULL;`);
      const remaining = finalCount.rows[0].cnt;

      if (remaining > 0) {
        throw new Error(`Integrity Check Failed: Table '${table}' still has ${remaining} NULL lane_id rows!`);
      }

      results[table] = { updated: totalUpdated, remainingNulls: 0, status: "OK" };
    }

    console.log("\n==================================================================");
    console.log("Backfill Completed Successfully!");
    console.table(results);
    console.log("==================================================================");

    return { ok: true, results };
  } finally {
    await client.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith("backfill-lanes.mjs")) {
  runBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Fatal Error]", err);
      process.exit(1);
    });
}

