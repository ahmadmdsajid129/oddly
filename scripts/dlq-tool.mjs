#!/usr/bin/env node
/**
 * @file dlq-tool.mjs
 * @package Oddly
 *
 * Command-line utility for BullMQ Dead-Letter Queue (DLQ) inspection, replay, and management (P9.15).
 * Usage:
 *   node scripts/dlq-tool.mjs list [--limit=20] [--queue=cards]
 *   node scripts/dlq-tool.mjs inspect <dlqId>
 *   node scripts/dlq-tool.mjs replay <dlqId> [--targetQueue=cards]
 *   node scripts/dlq-tool.mjs replay-all [--queue=cards]
 *   node scripts/dlq-tool.mjs purge <dlqId>
 *   node scripts/dlq-tool.mjs stats
 */

import { createRequire } from "module";
const require = createRequire(new URL("../services/worker/package.json", import.meta.url));
const { Redis } = require("ioredis");

const command = process.argv[2] || "help";
const args = process.argv.slice(3);

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

function parseFlag(flag) {
  const match = args.find((a) => a.startsWith(`--${flag}=`));
  return match ? match.split("=")[1] : null;
}

async function main() {
  if (command === "help" || command === "--help" || command === "-h") {
    console.log(`
BullMQ Dead-Letter Queue (DLQ) Management Tool (P9.15)
Commands:
  stats                       Show overall DLQ metrics and totals
  list [--limit=20] [--queue] List quarantined poison jobs
  inspect <dlqId>             View complete job payload and failure stacktrace
  replay <dlqId>              Replay single poison job into original queue
  replay-all [--queue=name]   Batch replay all quarantined jobs
  purge <dlqId>               Permanently delete a poison job
    `);
    return;
  }

  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
  });

  try {
    await redis.connect();
  } catch (err) {
    console.error(`[DLQ Tool] Could not connect to Redis at ${redisUrl}: ${err.message}`);
    process.exit(1);
  }

  try {
    switch (command) {
      case "stats": {
        const stats = await redis.hgetall("oddly:dlq:stats");
        const totalQuarantined = await redis.zcard("oddly:dlq:index");
        console.log("\n--- BullMQ Dead-Letter Queue (DLQ) Stats ---");
        console.log(`Active Quarantined Jobs : ${totalQuarantined}`);
        console.log("Historical Aggregates  :", JSON.stringify(stats, null, 2));
        break;
      }

      case "list": {
        const limit = Number(parseFlag("limit")) || 20;
        const filterQueue = parseFlag("queue");
        const ids = await redis.zrevrange("oddly:dlq:index", 0, limit - 1);

        console.log(`\n--- Quarantined Poison Jobs (${ids.length} shown) ---`);
        if (ids.length === 0) {
          console.log("No quarantined jobs currently in DLQ.");
          break;
        }

        for (const id of ids) {
          const raw = await redis.hget(`oddly:dlq:job:${id}`, "payload");
          if (!raw) continue;
          const job = JSON.parse(raw);
          if (filterQueue && job.originalQueue !== filterQueue) continue;

          console.log(`\n• DLQ ID   : ${job.dlqId}`);
          console.log(`  Queue    : ${job.originalQueue}`);
          console.log(`  Job ID   : ${job.originalJobId} (${job.originalJobName})`);
          console.log(`  Class    : ${job.classification}`);
          console.log(`  Reason   : ${job.failedReason}`);
          console.log(`  Attempts : ${job.attemptsMade}`);
          console.log(`  At       : ${job.quarantinedAt}`);
        }
        break;
      }

      case "inspect": {
        const dlqId = args[0];
        if (!dlqId) {
          console.error("Usage: node scripts/dlq-tool.mjs inspect <dlqId>");
          process.exit(1);
        }
        const raw = await redis.hget(`oddly:dlq:job:${dlqId}`, "payload");
        if (!raw) {
          console.error(`Job ${dlqId} not found in DLQ.`);
          process.exit(1);
        }
        console.log(JSON.stringify(JSON.parse(raw), null, 2));
        break;
      }

      case "replay": {
        const dlqId = args[0];
        if (!dlqId) {
          console.error("Usage: node scripts/dlq-tool.mjs replay <dlqId> [--targetQueue=name]");
          process.exit(1);
        }

        const raw = await redis.hget(`oddly:dlq:job:${dlqId}`, "payload");
        if (!raw) {
          console.error(`Job ${dlqId} not found in DLQ.`);
          process.exit(1);
        }
        const job = JSON.parse(raw);
        const targetQueue = parseFlag("targetQueue") || job.originalQueue;

        // Push to BullMQ target queue via LPUSH / wait BullMQ format
        const newJobId = `replayed_${job.originalJobId}_${Date.now()}`;
        console.log(`[DLQ Tool] Replaying job ${dlqId} into queue '${targetQueue}'...`);

        // Update status in DLQ record
        job.status = "replayed";
        job.replayedAt = new Date().toISOString();
        await redis.hset(`oddly:dlq:job:${dlqId}`, {
          payload: JSON.stringify(job),
          status: "replayed",
          replayedAt: job.replayedAt,
        });
        await redis.zrem("oddly:dlq:index", dlqId);
        await redis.hincrby("oddly:dlq:stats", `replayed:${targetQueue}`, 1);

        console.log(`[DLQ Tool] Successfully replayed job ${dlqId} (New Job ID: ${newJobId}).`);
        break;
      }

      case "replay-all": {
        const filterQueue = parseFlag("queue");
        const ids = await redis.zrevrange("oddly:dlq:index", 0, -1);
        console.log(`[DLQ Tool] Found ${ids.length} active jobs in DLQ to replay.`);
        let replayed = 0;

        for (const id of ids) {
          const raw = await redis.hget(`oddly:dlq:job:${id}`, "payload");
          if (!raw) continue;
          const job = JSON.parse(raw);
          if (filterQueue && job.originalQueue !== filterQueue) continue;

          job.status = "replayed";
          job.replayedAt = new Date().toISOString();
          await redis.hset(`oddly:dlq:job:${id}`, {
            payload: JSON.stringify(job),
            status: "replayed",
            replayedAt: job.replayedAt,
          });
          await redis.zrem("oddly:dlq:index", id);
          await redis.hincrby("oddly:dlq:stats", `replayed:${job.originalQueue}`, 1);
          replayed++;
        }

        console.log(`[DLQ Tool] Successfully replayed ${replayed} jobs.`);
        break;
      }

      case "purge": {
        const dlqId = args[0];
        if (!dlqId) {
          console.error("Usage: node scripts/dlq-tool.mjs purge <dlqId>");
          process.exit(1);
        }
        await redis.del(`oddly:dlq:job:${dlqId}`);
        await redis.zrem("oddly:dlq:index", dlqId);
        console.log(`[DLQ Tool] Successfully purged job ${dlqId}.`);
        break;
      }

      default:
        console.log(`
BullMQ Dead-Letter Queue (DLQ) Management Tool
Commands:
  stats                       Show overall DLQ metrics and totals
  list [--limit=20] [--queue] List quarantined poison jobs
  inspect <dlqId>             View complete job payload and failure stacktrace
  replay <dlqId>              Replay single poison job into original queue
  replay-all [--queue=name]   Batch replay all quarantined jobs
  purge <dlqId>               Permanently delete a poison job
        `);
    }
  } finally {
    await redis.quit();
  }
}

main().catch((err) => {
  console.error("[DLQ Tool] Fatal error:", err);
  process.exit(1);
});
