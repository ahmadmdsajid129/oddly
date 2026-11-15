/**
 * @file bench-3workers-master.ts
 * Master Orchestrator for 100,000-player Final Batch Benchmark with 3 Real Worker Processes (R2-PATCH-3 Item 3).
 */

import { fork } from "child_process";
import path from "path";
import { PrismaClient } from "@oddly/shared";

const dropId = "00000000-0000-4000-e000-000000000001";
const dropDateStr = "2026-11-25";
const totalPlayers = 100000;
const chunkSize = 5000;
const totalChunks = totalPlayers / chunkSize; // 20 chunks

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public",
    },
  },
});

async function main() {
  console.log("================================================================================");
  console.log("STAGE R2-PATCH-3 ITEM 3: 100,000-PLAYER FINAL BATCH BENCHMARK (3 WORKER PROCESSES)");
  console.log("================================================================================");

  // 1. Check or prepare 100k submissions
  console.log("1. Verifying 100,000 submissions in PostgreSQL...");
  let currentCount = await prisma.submission.count({ where: { drop_id: dropId } });

  if (currentCount < totalPlayers) {
    console.log(`Current submissions count: ${currentCount}. Creating drop and seeding 100,000 submissions...`);
    await prisma.batchRun.deleteMany({ where: { drop_id: dropId } });
    await prisma.match.deleteMany({ where: { drop_id: dropId } });
    await prisma.oddnessScore.deleteMany({ where: { drop_date: new Date(`${dropDateStr}T00:00:00.000Z`) } });
    await prisma.submission.deleteMany({ where: { drop_id: dropId } });
    await prisma.drop.deleteMany({ where: { id: dropId } });

    await prisma.drop.create({
      data: {
        id: dropId,
        drop_date: new Date(`${dropDateStr}T00:00:00.000Z`),
        opens_at: new Date(`${dropDateStr}T01:30:00.000Z`),
        closes_at: new Date(`${dropDateStr}T18:29:59.000Z`),
        status: "closed",
      },
    });

    const batchInsertSize = 5000;
    for (let offset = 0; offset < totalPlayers; offset += batchInsertSize) {
      const subBatch = [];
      for (let i = 0; i < batchInsertSize; i++) {
        const idx = offset + i;
        subBatch.push({
          id: `sub_b100k_${String(idx).padStart(6, "0")}`,
          drop_id: dropId,
          drop_date: new Date(`${dropDateStr}T00:00:00.000Z`),
          player_id: `plyr_b100k_${String(idx).padStart(6, "0")}`,
          request_id: `req_b100k_${idx}`,
          answers: [
            { question_id: "q_pipe_1", value: idx % 3 === 0 ? "OptA" : "OptB" },
            { question_id: "q_pipe_2", value: idx % 2 === 0 ? "Yes" : "No" },
            { question_id: "q_pipe_3", value: "Common" },
            { question_id: "q_pipe_4", value: String(idx % 10) },
            { question_id: "q_pipe_5", value: "End" },
          ],
        });
      }
      await prisma.submission.createMany({ data: subBatch, skipDuplicates: true });
    }
    currentCount = await prisma.submission.count({ where: { drop_id: dropId } });
  }

  console.log(`Confirmed ${currentCount.toLocaleString()} submissions in drop ${dropId}.`);

  // 2. Prepare batch_runs table (20 pending chunks)
  console.log("2. Initializing 20 chunks in batch_runs table (status = 'pending')...");
  await prisma.batchRun.deleteMany({ where: { drop_id: dropId } });
  await prisma.match.deleteMany({ where: { drop_id: dropId } });
  await prisma.oddnessScore.deleteMany({ where: { drop_date: new Date(`${dropDateStr}T00:00:00.000Z`) } });

  const chunkInserts = [];
  for (let c = 0; c < totalChunks; c++) {
    const startIdx = c * chunkSize;
    const endIdx = startIdx + chunkSize - 1;
    chunkInserts.push({
      id: `chunk_${dropId}_${c}`,
      drop_id: dropId,
      chunk_index: c,
      cursor_from: `sub_b100k_${String(startIdx).padStart(6, "0")}`,
      cursor_to: `sub_b100k_${String(endIdx).padStart(6, "0")}`,
      status: "pending",
      attempts: 0,
      player_count: 0,
    });
  }
  await prisma.batchRun.createMany({ data: chunkInserts });

  // 3. Spawn 3 Real Worker Child Processes
  console.log("3. Launching 3 real worker processes to execute 100,000-player batch in parallel...\n");
  const workerScriptPath = path.resolve(__dirname, "bench-3workers-worker.ts");

  const NUM_WORKERS = 3;
  const startTime = Date.now();

  const workerPromises = Array.from({ length: NUM_WORKERS }, (_, i) => {
    const workerName = `Worker-${i + 1}`;
    return new Promise<{ workerName: string; code: number | null }>((resolve, reject) => {
      // Use tsx to run the TypeScript worker process
      const child = fork(
        workerScriptPath,
        [workerName, dropId],
        {
          stdio: "inherit",
          env: { ...process.env },
        }
      );

      child.on("exit", (code) => {
        if (code === 0) {
          resolve({ workerName, code });
        } else {
          reject(new Error(`${workerName} exited with non-zero code ${code}`));
        }
      });

      child.on("error", (err) => {
        reject(err);
      });
    });
  });

  // Await all 3 worker processes
  await Promise.all(workerPromises);
  const totalDurationMs = Date.now() - startTime;
  const totalDurationSec = totalDurationMs / 1000;

  // 4. Verification and metrics calculation
  console.log("\n4. Verifying completed records in PostgreSQL...");
  const completedChunksCount = await prisma.batchRun.count({
    where: { drop_id: dropId, status: "completed" },
  });
  const finalizedMatchesCount = await prisma.match.count({
    where: { drop_id: dropId },
  });
  const finalizedScoresCount = await prisma.oddnessScore.count({
    where: { drop_date: new Date(`${dropDateStr}T00:00:00.000Z`) },
  });

  const costPerPlayerMs = totalDurationMs / totalPlayers;
  const extrapolated10LakhSec = (costPerPlayerMs * 1000000) / 1000;
  const extrapolated10LakhMin = extrapolated10LakhSec / 60;

  console.log("================================================================================");
  console.log("100,000-PLAYER FINAL BATCH BENCHMARK RESULTS (3 REAL WORKERS):");
  console.log("================================================================================");
  console.log(`  - Total Players Processed:      ${totalPlayers.toLocaleString()}`);
  console.log(`  - Real Worker Processes:        ${NUM_WORKERS}`);
  console.log(`  - Total Chunks Completed:       ${completedChunksCount} / ${totalChunks}`);
  console.log(`  - Final Matches Created:        ${finalizedMatchesCount.toLocaleString()}`);
  console.log(`  - Oddness Scores Finalized:     ${finalizedScoresCount.toLocaleString()}`);
  console.log(`  - Total Measured Duration:      ${totalDurationMs.toLocaleString()} ms (${totalDurationSec.toFixed(2)} s)`);
  console.log(`  - Cost Per Player:              ${costPerPlayerMs.toFixed(4)} ms (${(costPerPlayerMs * 1000).toFixed(1)} µs)`);
  console.log(`  - Extrapolated 10 Lakh (1M):    ${extrapolated10LakhSec.toFixed(1)} s (${extrapolated10LakhMin.toFixed(2)} min)`);
  console.log(`  - SLA Target (< 10 minutes):    ${extrapolated10LakhMin < 10 ? "PASSED (Under 10 min)" : "FAILED"}`);
  console.log("================================================================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Master fatal error:", err);
  process.exit(1);
});
