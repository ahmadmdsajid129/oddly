import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

export async function verifyPartitions(): Promise<{ ok: boolean; results: Record<string, string> }> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const requiredTables = ["submissions", "matches", "submission_answers", "answer_stats"];
    const query = `
      SELECT relname, relkind 
      FROM pg_class 
      WHERE relname = ANY($1::text[]);
    `;
    const res = await client.query(query, [requiredTables]);
    const results: Record<string, string> = {};

    for (const row of res.rows) {
      results[row.relname] = row.relkind;
    }

    let allValid = true;
    for (const table of requiredTables) {
      const kind = results[table];
      if (kind !== "p") {
        console.error(`[CI Guard ERROR] Table '${table}' must be partitioned (relkind 'p'), found: '${kind ?? "MISSING"}'`);
        allValid = false;
      }
    }

    // Verify default partitions exist
    const defaultTables = ["submissions_default", "matches_default", "submission_answers_default", "answer_stats_default"];
    const defRes = await client.query(`
      SELECT relname FROM pg_class WHERE relname = ANY($1::text[]);
    `, [defaultTables]);
    const foundDefaults = new Set(defRes.rows.map((r) => r.relname));

    for (const defTable of defaultTables) {
      if (!foundDefaults.has(defTable)) {
        console.error(`[CI Guard ERROR] Default partition '${defTable}' is missing!`);
        allValid = false;
      }
    }

    if (!allValid) {
      throw new Error("Partition verification guard failed: some partitioned tables or default partitions are invalid.");
    }

    console.log("[CI Guard] All 4 tables are verified partitioned ('p') with DEFAULT partitions present.");
    return { ok: true, results };
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.includes("guard-partitions")) {
  verifyPartitions()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

