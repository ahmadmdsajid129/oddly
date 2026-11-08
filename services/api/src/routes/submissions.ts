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
  BruteForceMatchingStrategy,
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
import { DropsRepository } from "../db/drops.repo.js";

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

      // 1. Check idempotency: if request_id already exists, return existing submission
      const existingRequest = await SubmissionsRepository.findByRequestId(request_id);
      if (existingRequest) {
        const existingScore = await prisma.oddnessScore.findUnique({
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
      if (!isDayOpen(dropDateStr)) {
        reply.status(400).send({
          ok: false,
          error: "DROP_CLOSED",
          message: "Submissions for this drop are currently closed.",
        });
        return;
      }

      // 3. Prevent duplicate submission by player for the same drop
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

      const submission = await SubmissionsRepository.createSubmission({
        drop_id,
        player_id,
        request_id,
        answers: storedAnswers,
      });

      if (isBotFlagged) {
        await prisma.submission.update({
          where: { id: submission.id },
          data: { is_bot_flagged: true },
        });
      }

      // 6. Update running answer frequencies in DB
      for (const a of storedAnswers) {
        const valStr = Array.isArray(a.value) ? a.value.join(",") : String(a.value);
        await prisma.answerFrequency.upsert({
          where: {
            question_id_value: {
              question_id: a.question_id,
              value: valStr,
            },
          },
          update: {
            count: { increment: 1 },
          },
          create: {
            question_id: a.question_id,
            value: valStr,
            count: 1,
            probability: 0,
          },
        });
      }

      // 7. Load frequency table for scoring
      const allFrequencies = await prisma.answerFrequency.findMany({
        where: { question_id: { in: drop.questions.map((q) => q.id) } },
      });

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
          raw_score: rawScore,
          percentile: pct,
          tier,
        },
      });

      // 9. Instant Stage A Matching (P3.06, D-009)
      const otherSubmissions = await SubmissionsRepository.listByDrop(drop_id);
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

      const matcher = new BruteForceMatchingStrategy();
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
    }
  );
};
