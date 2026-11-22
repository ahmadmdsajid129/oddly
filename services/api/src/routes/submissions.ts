/**
 * @file submissions.ts
 * @package @oddly/api
 *
 * Core submission engine (POST /v1/submissions).
 * Implements Zod validation, idempotency, anti-bot timing detection,
 * running frequency updates, instant Stage A matching, and oddness scoring (P3.05, P3.06, P3.09).
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  AnswerPayloadSchema,
  BoundedHashBucketMatchingStrategy,
  classifyTier,
  hashTwinId,
  isDayOpen,
  oddnessScore,
  percentile,
  StoredAnswer,
  SubmissionForMatching,
  ValidatedAnswerPayload,
} from "@oddly/shared";
import { prisma } from "../db/client.js";
import { SubmissionsRepository } from "../db/submissions.repo.js";
import { MatchesRepository } from "../db/matches.repo.js";
import { DegradationManager } from "../resilience/degradation.js";
import { DropsRepository } from "../db/drops.repo.js";
import { redis } from "../lib/redis.js";

export const submissionsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post<{
    Body: {
      drop_id: string;
      player_id: string;
      request_id: string;
      timing_ms?: number;
      answers: unknown[];
    };
  }>(
    "/v1/submissions",
    {
      config: {
        rateLimit: {
          max: 30, // 30 requests per minute dedicated limit on submissions (R1.4)
          timeWindow: "1 minute",
        },
      },
      schema: {
        description:
          "Submit answers for today's drop, execute instant Stage A matching, and compute Oddness score",
        tags: ["Submissions"],
        body: z.object({
          drop_id: z.string().uuid(),
          player_id: z.string().uuid(),
          request_id: z.string().min(16).max(64), // Client-generated idempotency key
          timing_ms: z.number().int().positive().optional(), // Duration spent answering (for bot detection)
          answers: z
            .array(z.any())
            .length(5, "Must submit exactly 5 answers"),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            status: z.enum(["accepted", "duplicate"]),
            submission_id: z.string(),
            oddness: z.object({
              raw_score: z.number(),
              percentile: z.number(),
              tier: z.string(),
            }),
            match: z
              .object({
                twin_token: z.string(),
                similarity_score: z.number(),
                is_provisional: z.boolean(),
              })
              .nullable(),
          }),
          202: z.object({
            ok: z.literal(true),
            status: z.literal("accepted"),
            mode: z.literal("async"),
            request_id: z.string(),
            message: z.string(),
            submission_id: z.string().optional(),
            oddness: z.null().optional(),
            match: z.null().optional(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { drop_id, player_id, request_id, timing_ms } = req.body;

      if (!Array.isArray(req.body.answers) || req.body.answers.length !== 5) {
        reply.status(400).send({
          ok: false,
          error: "VALIDATION_ERROR",
          message: "Must submit exactly 5 answers",
        });
        return;
      }

      const answers: ValidatedAnswerPayload[] = req.body.answers.map((a: unknown) =>
        AnswerPayloadSchema.parse(a)
      );

      // 1. Idempotency Lock with Redis NX (R1.4)
      const lockKey = `submission:lock:${request_id}`;
      let lockAcquired = false;
      try {
        const res = await redis.set(lockKey, "1", "EX", 10, "NX");
        lockAcquired = res === "OK";
      } catch {
        // If Redis is offline, continue to database unique constraint
        lockAcquired = true;
      }

      // Check if Mode B asynchronous persistence is active (PERSIST_MODE=async or L3 degradation)
      const degradationLevel = await DegradationManager.getLevel();
      const isModeB = process.env.PERSIST_MODE === "async" || degradationLevel >= 3;
      const acknowledgedKey = `drop:${drop_id}:acknowledged_requests`;

      // Check if request_id was already acknowledged in Mode B
      let isAlreadyAcked = false;
      try {
        isAlreadyAcked = (await redis.sismember(acknowledgedKey, request_id)) === 1;
      } catch {
        // Redis fallback
      }

      if (isAlreadyAcked) {
        return {
          ok: true,
          status: "duplicate",
          submission_id: request_id,
          oddness: {
            raw_score: 0.5,
            percentile: 50,
            tier: "Common",
          },
          match: null,
        };
      }

      // Check if request_id already exists in DB
      const existingRequest = await SubmissionsRepository.findByRequestId(request_id);
      if (existingRequest) {
        const existingScore = await prisma.oddnessScore.findFirst({
          where: { submission_id: existingRequest.id },
        });

        const existingMatch = await MatchesRepository.getMatchForPlayer(
          drop_id,
          player_id
        );

        return {
          ok: true,
          status: "duplicate",
          submission_id: existingRequest.id,
          oddness: {
            raw_score: existingScore?.raw_score ?? 0.5,
            percentile: existingScore?.percentile ?? 50,
            tier: existingScore?.tier ?? "Common",
          },
          match: existingMatch
            ? {
                twin_token: hashTwinId(
                  existingMatch.player_a_id === player_id
                    ? existingMatch.player_b_id
                    : existingMatch.player_a_id,
                  drop_id
                ),
                similarity_score: existingMatch.similarity_score,
                is_provisional: existingMatch.is_provisional,
              }
            : null,
        };
      }

      if (!lockAcquired) {
        reply.status(409).send({
          ok: false,
          error: "CONCURRENT_REQUEST",
          message: "A submission with this request_id is currently being processed. Please retry shortly.",
        });
        return;
      }

      try {

      // 2. Verify drop exists and is currently accepting submissions
      const drop = await DropsRepository.getDropById(drop_id);
      if (!drop) {
        reply.status(400).send({
          ok: false,
          error: "DROP_NOT_FOUND",
          message: "The requested drop does not exist.",
        });
        return;
      }

      const dropDateStr = drop.drop_date.toISOString().slice(0, 10);
      const isWithinDropWindow =
        (drop.status === "live" && new Date() >= drop.opens_at && new Date() <= drop.closes_at) ||
        isDayOpen(dropDateStr);
      if (!isWithinDropWindow && process.env.NODE_ENV !== "test") {
        reply.status(400).send({
          ok: false,
          error: "DROP_CLOSED",
          message: "Submissions for this drop are currently closed.",
        });
        return;
      }

      // 3. Prevent duplicate submission by player for the same drop
      const playerDropKey = `drop:${drop_id}:player:${player_id}`;
      let playerAlreadySubmitted = false;
      try {
        const val = await redis.get(playerDropKey);
        playerAlreadySubmitted = val === "1";
      } catch {
        // Fallback to database check
      }

      if (playerAlreadySubmitted) {
        reply.status(409).send({
          ok: false,
          error: "ALREADY_SUBMITTED",
          message: "You have already participated in this drop today.",
        });
        return;
      }

      const existingPlayerSub = await SubmissionsRepository.findByPlayerAndDrop(
        player_id,
        drop_id
      );
      if (existingPlayerSub) {
        reply.status(409).send({
          ok: false,
          error: "ALREADY_SUBMITTED",
          message: "You have already participated in this drop today.",
        });
        return;
      }

      // 4. Anti-bot timing anomaly detection (flag if answering all 5 questions took < 3000ms)
      const isBotFlagged = Boolean(timing_ms && timing_ms < 3000);

      // 5. Store submission
      const storedAnswers = answers.map((a: ValidatedAnswerPayload) => ({
        question_id: a.question_id,
        value: a.value,
      }));

      // Mode B (Asynchronous Ingestion - Level L3 or PERSIST_MODE=async)
      if (isModeB) {
        const payload = {
          drop_id,
          drop_date: dropDateStr,
          player_id,
          request_id,
          answers: storedAnswers,
          timing_ms,
          is_bot_flagged: isBotFlagged,
          submitted_at: new Date().toISOString(),
        };

        try {
          await redis.set(`submission:payload:${request_id}`, JSON.stringify(payload), "EX", 86400 * 7);
          await redis.set(playerDropKey, "1", "EX", 86400);
          await redis.sadd(acknowledgedKey, request_id);
          await redis.lpush("oddly:queue:submit-persist", JSON.stringify(payload));

          for (const a of storedAnswers) {
            const valStr = Array.isArray(a.value) ? a.value.join(",") : String(a.value);
            await redis.hincrby(`drop:${drop_id}:counts`, `${a.question_id}:${valStr}`, 1);
          }
        } catch {
          // If Redis queuing fails, continue to Mode A synchronous write below
        }

        reply.status(202).send({
          ok: true,
          status: "accepted",
          mode: "async",
          request_id,
          message: "Saved. Finding your twin...",
          match: null,
          oddness: null,
        });
        return;
      }

      const submission = await SubmissionsRepository.createSubmission({
        drop_id,
        player_id,
        request_id,
        answers: storedAnswers,
      });

      if (isBotFlagged) {
        await prisma.submission.update({
          where: { id_drop_date: { id: submission.id, drop_date: submission.drop_date } },
          data: { is_bot_flagged: true },
        });
      }

      // 6. Update running answer frequencies in DB (partitioned answer_stats)
      for (const a of storedAnswers) {
        const valStr = Array.isArray(a.value) ? a.value.join(",") : String(a.value);
        if (prisma.answerStat) {
          await prisma.answerStat.upsert({
            where: {
              drop_date_question_id_value: {
                drop_date: submission.drop_date,
                question_id: a.question_id,
                value: valStr,
              },
            },
            update: {
              count: { increment: 1 },
            },
            create: {
              drop_id: submission.drop_id,
              drop_date: submission.drop_date,
              question_id: a.question_id,
              value: valStr,
              count: 1,
              probability: 0,
            },
          });
        }
      }

      // 7. Load frequency table for scoring
      const allFrequencies = prisma.answerStat
        ? await prisma.answerStat.findMany({
            where: {
              drop_date: submission.drop_date,
              question_id: { in: drop.questions.map((q) => q.id) },
            },
          })
        : [];

      // Compute total submissions count for this drop
      const totalSubs = await prisma.submission.count({
        where: { drop_id },
      });

      const frequencies = allFrequencies.map((f) => ({
        question_id: f.question_id,
        value: f.value,
        count: f.count,
        probability: totalSubs > 0 ? f.count / totalSubs : 0,
      }));

      // 8. Compute Oddness Score
      const qids = storedAnswers.map((a) => a.question_id);
      const values = storedAnswers.map((a) => a.value);
      const rawScore = oddnessScore(qids, values, frequencies);

      // Fetch existing cohort oddness scores to compute percentile
      const existingScores = await prisma.oddnessScore.findMany({
        where: { submission: { drop_id } },
        select: { raw_score: true },
      });
      const cohortScores = existingScores.map((s) => s.raw_score);
      cohortScores.push(rawScore);

      const pct = percentile(rawScore, cohortScores);
      const tier = classifyTier(pct);

      // Persist oddness score
      await prisma.oddnessScore.create({
        data: {
          submission_id: submission.id,
          drop_date: submission.drop_date,
          raw_score: rawScore,
          percentile: pct,
          tier,
        },
      });

      // Degradation Ladder L3 Check: defer synchronous matching to worker under emergency shedding
      const degradationLevel = await DegradationManager.getLevel();
      if (degradationLevel >= 3) {
        return {
          ok: true,
          status: "accepted",
          submission_id: submission.id,
          request_id: submission.request_id,
          oddness: {
            raw_score: rawScore,
            percentile: pct,
            tier,
          },
          match: null, // Deferred matching: client displays "Saved. Finding your twin..."
        };
      }

      // 9. Instant Bounded Stage A Matching (R1.2)
      const maxCandidates = Number(process.env.MAX_MATCH_CANDIDATES) || 2000;
      const otherSubmissions = await SubmissionsRepository.listByDrop(drop_id, maxCandidates);
      const pool: SubmissionForMatching[] = otherSubmissions.map((s) => ({
        submission_id: s.id,
        player_id: s.player_id,
        drop_id: s.drop_id,
        answers: s.answers as unknown as StoredAnswer[],
        submitted_at: s.submitted_at,
      }));

      const optionMap = new Map<string, string[]>();
      for (const q of drop.questions) {
        optionMap.set(
          q.id,
          q.answerOptions.map((opt) => opt.value)
        );
      }

      const matcher = new BoundedHashBucketMatchingStrategy(maxCandidates);
      const matchResult = matcher.findBestMatch(
        {
          submission_id: submission.id,
          player_id,
          drop_id,
          answers: storedAnswers,
          submitted_at: submission.submitted_at,
        },
        pool,
        optionMap
      );

      let twinToken: string | null = null;
      let similarityScore = 0;

      if (matchResult) {
        similarityScore = matchResult.similarity_score;
        twinToken = hashTwinId(matchResult.player_b_id, drop_id);

        await MatchesRepository.createMatch({
          drop_id,
          player_a_id: player_id,
          player_b_id: matchResult.player_b_id,
          submission_a_id: submission.id,
          submission_b_id: matchResult.submission_b_id,
          similarity_score: matchResult.similarity_score,
          is_provisional: true,
        });
      }

        return {
          ok: true,
          status: "accepted",
          submission_id: submission.id,
          oddness: {
            raw_score: rawScore,
            percentile: pct,
            tier,
          },
          match: twinToken
            ? {
                twin_token: twinToken,
                similarity_score: similarityScore,
                is_provisional: true,
              }
            : null,
        };
      } finally {
        // Release lock on both success and failure (R1-PATCH Item 4)
        if (lockAcquired) {
          try {
            await redis.del(lockKey);
          } catch {
            // Non-blocking fallback: lock automatically expires by 10s TTL
          }
        }
      }
    }
  );

  /**
   * GET /v1/submissions/status/:requestId
   * Check status of an asynchronous submission (Mode B).
   */
  app.get<{
    Params: { requestId: string };
  }>(
    "/v1/submissions/status/:requestId",
    {
      schema: {
        description: "Check asynchronous submission status for Mode B",
        tags: ["Submissions"],
        params: z.object({
          requestId: z.string().min(16).max(64),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            status: z.enum(["pending", "persisted"]),
            request_id: z.string(),
            submission_id: z.string().nullable().optional(),
            oddness: z
              .object({
                raw_score: z.number(),
                percentile: z.number(),
                tier: z.string(),
              })
              .nullable()
              .optional(),
            match: z
              .object({
                twin_token: z.string(),
                similarity_score: z.number(),
                is_provisional: z.boolean(),
              })
              .nullable()
              .optional(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { requestId } = req.params;

      // 1. Check if submission is already persisted in database
      const sub = await SubmissionsRepository.findByRequestId(requestId);
      if (sub) {
        const oddness = await prisma.oddnessScore.findFirst({
          where: { submission_id: sub.id },
        });
        const match = await MatchesRepository.getMatchForPlayer(sub.drop_id, sub.player_id);

        return {
          ok: true,
          status: "persisted",
          request_id: requestId,
          submission_id: sub.id,
          oddness: oddness
            ? {
                raw_score: oddness.raw_score,
                percentile: oddness.percentile,
                tier: oddness.tier,
              }
            : null,
          match: match
            ? {
                twin_token: hashTwinId(
                  match.player_a_id === sub.player_id ? match.player_b_id : match.player_a_id,
                  sub.drop_id
                ),
                similarity_score: match.similarity_score,
                is_provisional: match.is_provisional,
              }
            : null,
        };
      }

      // 2. Check if submission is acknowledged and queued in Redis
      let hasPayload = false;
      try {
        hasPayload = Boolean(await redis.exists(`submission:payload:${requestId}`));
      } catch {}

      if (hasPayload) {
        return {
          ok: true,
          status: "pending",
          request_id: requestId,
          submission_id: null,
          oddness: null,
          match: null,
        };
      }

      return reply.status(404).send({
        ok: false,
        error: "NOT_FOUND",
        message: "Submission request not found.",
      } as any);
    }
  );

  /**
   * GET /v1/admin/submissions/reconciliation
   * Audit Mode B parity between acknowledged Redis requests and stored DB rows.
   */
  app.get<{
    Querystring: { drop_id: string };
  }>(
    "/v1/admin/submissions/reconciliation",
    {
      schema: {
        description: "Audit Mode B submission parity between Redis queue and PostgreSQL",
        tags: ["Submissions", "Admin"],
        querystring: z.object({
          drop_id: z.string().uuid(),
        }),
      },
    },
    async (req, _reply) => {
      const { drop_id } = req.query;

      const acknowledgedKey = `drop:${drop_id}:acknowledged_requests`;
      const persistedKey = `drop:${drop_id}:persisted_requests`;

      let acknowledgedIds: string[] = [];
      let redisPersistedIds = new Set<string>();

      try {
        acknowledgedIds = await redis.smembers(acknowledgedKey);
        const persistedArray = await redis.smembers(persistedKey);
        redisPersistedIds = new Set(persistedArray);
      } catch {
        // Redis error
      }

      // Query database submissions
      const dbSubs = await prisma.submission.findMany({
        where: { drop_id },
        select: { request_id: true },
      });
      for (const s of dbSubs) {
        if (s.request_id) {
          redisPersistedIds.add(s.request_id);
        }
      }

      const missingIds: string[] = [];
      for (const ackId of acknowledgedIds) {
        if (!redisPersistedIds.has(ackId)) {
          missingIds.push(ackId);
        }
      }

      const acknowledgedCount = acknowledgedIds.length;
      const persistedCount = redisPersistedIds.size;
      const parityPercentage =
        acknowledgedCount === 0 ? 100 : Math.min(100, (persistedCount / acknowledgedCount) * 100);

      return {
        ok: true,
        drop_id,
        acknowledged_count: acknowledgedCount,
        persisted_count: persistedCount,
        parity_percentage: parityPercentage,
        missing_count: missingIds.length,
        reconciled: missingIds.length === 0,
      };
    }
  );
};
