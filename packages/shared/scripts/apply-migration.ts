import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

async function applyMigrations() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const migrationPath = path.resolve(__dirname, "../prisma/migrations/001_partitioning.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");
    console.log(`[Migration] Applying ${migrationPath} to ${DATABASE_URL}...`);
    await client.query(sql);
    console.log("[Migration] Migration applied successfully.");
  } catch (err) {
    console.error("[Migration] Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigrations();

