/**
 * @file bench-3workers-worker.ts
 * Real Node worker process for 100,000-player final batch benchmark (R2-PATCH-3 Item 3).
 *
 * Each worker process:
 * 1. Connects to real Postgres 16 and Redis 7.
 * 2. Pre-loads candidate bucket index for bounded twin matching.
 * 3. Loops claiming chunks using Postgres `FOR UPDATE SKIP LOCKED`.
 * 4. Recomputes twin matches and finalizes oddness scores for each chunk.
 * 5. Commits and marks chunk 'completed' in batch_runs.
 */

import { PrismaClient } from "@oddly/shared";
import {
  computeAnswerSubHashes,
  addToBucketWithReservoirCap,
  type StoredAnswer,
  oddnessScore,
  classifyTier,
  type AnswerFrequency,
  type Prisma,
} from "@oddly/shared";

const workerId = process.argv[2] || `worker_${process.pid}`;
const dropId = process.argv[3] || "00000000-0000-4000-e000-000000000001";
const dropDateStr = "2026-11-25";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public&connection_limit=10",
    },
  },
});

type CandidateEntry = {
  id: string;
  player_id: string;
  answers: StoredAnswer[];
  submitted_at: Date;
};

async function runWorker() {
  const tStart = Date.now();
  console.log(`[${workerId}] Process ${process.pid} booted and connecting to Postgres...`);

  // 1. Fetch total submissions and candidate buckets for bounded matching
  const candidateRows = await prisma.$queryRawUnsafe<
    { id: string; player_id: string; answers: unknown; submitted_at: Date }[]
  >(
    `SELECT id, player_id, answers, submitted_at FROM submissions WHERE drop_id = $1 ORDER BY id ASC`,
    dropId
  );

  const totalSubmissions = candidateRows.length;
  const b5 = new Map<string, CandidateEntry[]>();
  const b4 = new Map<string, CandidateEntry[]>();
  const bucketCounts = new Map<string, number>();
  const BUCKET_CAP = 200;

  for (const s of candidateRows) {
    const answers = typeof s.answers === "string" ? JSON.parse(s.answers) : (s.answers as StoredAnswer[]);
    const entry: CandidateEntry = {
      id: s.id,
      player_id: s.player_id,
      answers,
      submitted_at: s.submitted_at,
    };
    const hashes = computeAnswerSubHashes(answers);

    // 5-hash
    let l5 = b5.get(hashes.hash5);
    if (!l5) {
      l5 = [];
      b5.set(hashes.hash5, l5);
    }
    const c5 = (bucketCounts.get(hashes.hash5) || 0) + 1;
    bucketCounts.set(hashes.hash5, c5);
    addToBucketWithReservoirCap(l5, entry, BUCKET_CAP, c5);

    // 4-of-5 sub-hashes
    for (const h4 of hashes.hashes4) {
      let l4 = b4.get(h4);
      if (!l4) {
        l4 = [];
        b4.set(h4, l4);
      }
      const c4 = (bucketCounts.get(h4) || 0) + 1;
      bucketCounts.set(h4, c4);
      addToBucketWithReservoirCap(l4, entry, BUCKET_CAP, c4);
    }
  }

  // Answer frequencies
  const dbFreqs = await prisma.answerStat.findMany({
    where: { drop_id: dropId },
  });
  const frequencies: AnswerFrequency[] = dbFreqs.map((f) => ({
    question_id: f.question_id,
    value: f.value,
    count: f.count,
    probability: totalSubmissions > 0 ? f.count / totalSubmissions : 0,
  }));

  console.log(`[${workerId}] Loaded ${candidateRows.length} candidates into bounded buckets. Starting chunk execution...`);

  let chunksProcessedByThisWorker = 0;
  let playersProcessedByThisWorker = 0;

  // 2. Main processing loop: claim chunks using FOR UPDATE SKIP LOCKED
  while (true) {
    const claimedChunks = await prisma.$queryRawUnsafe<
      { id: string; chunk_index: number; cursor_from: string | null; cursor_to: string | null }[]
    >(
      `UPDATE batch_runs
       SET status = 'processing', started_at = NOW(), attempts = attempts + 1
       WHERE id = (
         SELECT id FROM batch_runs
         WHERE drop_id = $1 AND status = 'pending'
         ORDER BY chunk_index ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, chunk_index, cursor_from, cursor_to`,
      dropId
    );

    if (claimedChunks.length === 0) {
      // No more pending chunks
      break;
    }

    const chunk = claimedChunks[0]!;
    const chunkStart = Date.now();

    // Query submissions for this chunk
    let chunkSubmissions: { id: string; player_id: string; answers: unknown; submitted_at: Date }[] = [];
    if (chunk.cursor_from && chunk.cursor_to) {
      chunkSubmissions = await prisma.$queryRawUnsafe(
        `SELECT id, player_id, answers, submitted_at
         FROM submissions
         WHERE drop_id = $1 AND id >= $2 AND id <= $3
         ORDER BY id ASC`,
        dropId,
        chunk.cursor_from,
        chunk.cursor_to
      );
    } else {
      chunkSubmissions = await prisma.$queryRawUnsafe(
        `SELECT id, player_id, answers, submitted_at
         FROM submissions
         WHERE drop_id = $1
         ORDER BY id ASC
         OFFSET $2 LIMIT 5000`,
        dropId,
        chunk.chunk_index * 5000
      );
    }

    // Recompute best twins and compute oddness scores
    const matchInserts: Prisma.MatchCreateManyInput[] = [];
    const scoreInserts: Prisma.OddnessScoreCreateManyInput[] = [];

    for (const sub of chunkSubmissions) {
      const answers: StoredAnswer[] =
        typeof sub.answers === "string" ? JSON.parse(sub.answers) : (sub.answers as StoredAnswer[]);
      const hashes = computeAnswerSubHashes(answers);

      // Collect bounded candidates
      const candidateList: CandidateEntry[] = [];
      const seenSet = new Set<string>();

      const exactList = b5.get(hashes.hash5) || [];
      for (const c of exactList) {
        if (c.id !== sub.id && !seenSet.has(c.id)) {
          seenSet.add(c.id);
          candidateList.push(c);
          if (candidateList.length >= 2000) break;
        }
      }

      if (candidateList.length < 2000) {
        for (const h4 of hashes.hashes4) {
          const l4 = b4.get(h4) || [];
          for (const c of l4) {
            if (c.id !== sub.id && !seenSet.has(c.id)) {
              seenSet.add(c.id);
              candidateList.push(c);
              if (candidateList.length >= 2000) break;
            }
          }
          if (candidateList.length >= 2000) break;
        }
      }

      // Best twin among candidates
      let bestTwinId: string | null = null;
      let bestScore = 0;

      for (const cand of candidateList) {
        let matches = 0;
        for (let q = 0; q < answers.length; q++) {
          if (answers[q]?.value === cand.answers[q]?.value) matches++;
        }
        const sim = matches / 5.0;
        if (sim > bestScore) {
          bestScore = sim;
          bestTwinId = cand.player_id;
          if (sim === 1.0) break;
        }
      }

      if (bestTwinId) {
        matchInserts.push({
          id: `match_bench_${sub.id}`,
          drop_id: dropId,
          drop_date: new Date(`${dropDateStr}T00:00:00.000Z`),
          player_a_id: sub.player_id,
          player_b_id: bestTwinId,
          similarity_score: bestScore,
          is_provisional: false,
          matched_at: new Date(),
        });
      }

      // Oddness score
      const qIds = answers.map((a: StoredAnswer) => a.question_id);
      const vals = answers.map((a: StoredAnswer) => a.value);
      const rawScore = oddnessScore(qIds, vals, frequencies);
      const pct = Math.min(99.9, Math.max(1.0, Math.round(rawScore * 1000) / 10));
      const tier = classifyTier(pct);

      scoreInserts.push({
        id: `odd_bench_${sub.id}`,
        submission_id: sub.id,
        drop_date: new Date(`${dropDateStr}T00:00:00.000Z`),
        raw_score: rawScore,
        percentile: pct,
        tier,
      });
    }

    // Bulk write matches and oddness scores
    if (matchInserts.length > 0) {
      await prisma.match.createMany({
        data: matchInserts,
        skipDuplicates: true,
      });
    }

    if (scoreInserts.length > 0) {
      await prisma.oddnessScore.createMany({
        data: scoreInserts,
        skipDuplicates: true,
      });
    }

    // Mark chunk completed
    await prisma.batchRun.update({
      where: { id: chunk.id },
      data: {
        status: "completed",
        completed_at: new Date(),
        player_count: chunkSubmissions.length,
      },
    });

    chunksProcessedByThisWorker++;
    playersProcessedByThisWorker += chunkSubmissions.length;
    const chunkMs = Date.now() - chunkStart;
    console.log(
      `[${workerId}] Completed chunk ${chunk.chunk_index} (${chunkSubmissions.length} players) in ${(chunkMs / 1000).toFixed(2)}s`
    );
  }

  const elapsedSec = (Date.now() - tStart) / 1000;
  console.log(
    `[${workerId}] DONE! Processed ${chunksProcessedByThisWorker} chunks (${playersProcessedByThisWorker} players) in ${elapsedSec.toFixed(2)}s.`
  );
  await prisma.$disconnect();
}

runWorker().catch((err) => {
  console.error(`[${workerId}] Fatal error:`, err);
  process.exit(1);
});
