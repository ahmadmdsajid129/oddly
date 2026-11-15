/**
 * @file antitwin.repo.ts
 * @package @oddly/api
 *
 * Repository for Anti-Twin ("Your Opposite Today") (Stage F4 / Phase 10D / F21 / ADR-040).
 *
 * Invariants:
 * 1. Decoupled asynchronous computation: Enqueued/executed on demand with bounded sample (<= 2,000).
 * 2. Low-pool graceful hide: If pool < 200 players, returns honest notice and hides opposite card.
 * 3. Zero-pick privacy invariant: Never exposes or stores the opposite player's answer choices or vectors.
 * 4. Microcopy: Playful, affirming, kind microcopy adhering to Rule 4.
 */

import { prisma } from "./client.js";
import {
  computeAntiTwin,
  type AntiTwinCandidate,
  type AntiTwinCalculationResult,
} from "@oddly/shared";

export interface OwnDifferedQuestionDetail {
  question_id: string;
  position: number;
  prompt: string;
  your_answer: string;
}

export interface AntiTwinResponseDto {
  ok: boolean;
  drop_id: string;
  drop_date: string;
  pool_insufficient?: boolean;
  pool_count?: number;
  min_pool_size?: number;
  notice?: string;
  differed_count?: number;
  sample_size?: number;
  opposite?: {
    region: string;
    age_band: string;
  };
  own_differed_questions?: OwnDifferedQuestionDetail[];
  note?: string;
}

export class AntiTwinRepository {
  /**
   * Retrieves or computes Anti-Twin for a given player and drop.
   */
  static async getOrComputeAntiTwin(
    dropId: string,
    playerId: string,
    sampleSizeLimit: number = 2000,
    minPoolSize: number = 200
  ): Promise<AntiTwinResponseDto> {
    // 1. Fetch drop details
    const drop = await prisma.drop.findUnique({
      where: { id: dropId },
      include: {
        questions: {
          orderBy: { position: "asc" },
          include: { answerOptions: true },
        },
      },
    });

    if (!drop) {
      throw new Error(`Drop not found: ${dropId}`);
    }

    const dropDate = drop.drop_date;
    const dropDateStr = dropDate.toISOString().split("T")[0]!;

    // 2. Fetch target player's submission for this drop
    const targetSubmission = await prisma.submission.findFirst({
      where: {
        drop_id: dropId,
        player_id: playerId,
      },
    });

    if (!targetSubmission) {
      return {
        ok: false,
        drop_id: dropId,
        drop_date: dropDateStr,
        notice: "Submission required before viewing Anti-Twin.",
      };
    }

    const targetAnswers = Array.isArray(targetSubmission.answers)
      ? (targetSubmission.answers as Array<{ question_id: string; value: string }>)
      : [];

    // 3. Check if Anti-Twin was already computed and stored in DB
    const existing = await prisma.antiTwinResult.findUnique({
      where: {
        drop_date_player_id: {
          drop_date: dropDate,
          player_id: playerId,
        },
      },
    });

    // Option map & question map for lookup
    const optionMap = new Map<string, string[]>();
    const questionMap = new Map<string, { position: number; prompt: string; options: Map<string, string> }>();
    for (const q of drop.questions) {
      const optKeys = q.answerOptions.map((o) => o.value);
      optionMap.set(q.id, optKeys);

      const labelMap = new Map<string, string>();
      for (const o of q.answerOptions) {
        labelMap.set(o.value, o.label);
      }
      const payloadObj = (q.payload && typeof q.payload === "object" ? q.payload : {}) as { prompt?: string; text?: string };
      questionMap.set(q.id, {
        position: q.position,
        prompt: payloadObj.prompt || payloadObj.text || `Question ${q.position}`,
        options: labelMap,
      });
    }

    if (existing) {
      // Reconstruct user's differed question breakdown from target's own answers
      // We look up the opposite submission to verify which of caller's own questions differed
      const oppositeSub = await prisma.submission.findFirst({
        where: {
          id: existing.opposite_submission_ref,
        },
        include: {
          player: {
            select: {
              region: true,
              age_band: true,
            },
          },
        },
      });

      const oppAnswers = Array.isArray(oppositeSub?.answers)
        ? (oppositeSub.answers as Array<{ question_id: string; value: string }>)
        : [];
      const oppMap = new Map<string, string>();
      for (const a of oppAnswers) {
        oppMap.set(a.question_id, a.value);
      }

      const ownDiffered: OwnDifferedQuestionDetail[] = [];
      for (const a of targetAnswers) {
        const oppVal = oppMap.get(a.question_id);
        if (!oppVal || oppVal !== a.value) {
          const qMeta = questionMap.get(a.question_id);
          ownDiffered.push({
            question_id: a.question_id,
            position: qMeta?.position ?? 0,
            prompt: qMeta?.prompt ?? "Question",
            your_answer: qMeta?.options.get(a.value) || a.value,
          });
        }
      }

      return {
        ok: true,
        drop_id: dropId,
        drop_date: dropDateStr,
        differed_count: existing.differed_count,
        sample_size: existing.sample_size,
        opposite: {
          region: oppositeSub?.player?.region || "Global",
          age_band: oppositeSub?.player?.age_band || "18+",
        },
        own_differed_questions: ownDiffered,
        note: `Differed on ${existing.differed_count} of ${targetAnswers.length || 5}. Opposite instincts make the world interesting!`,
      };
    }

    // 4. Check total candidate pool size
    const totalPoolCount = await prisma.submission.count({
      where: {
        drop_id: dropId,
        player_id: { not: playerId },
        is_bot_flagged: false,
      },
    });

    if (totalPoolCount < minPoolSize) {
      return {
        ok: true,
        drop_id: dropId,
        drop_date: dropDateStr,
        pool_insufficient: true,
        pool_count: totalPoolCount,
        min_pool_size: minPoolSize,
        notice: "Not enough players yet today to find a genuine opposite. Check back this evening.",
      };
    }

    // 5. Fetch bounded candidate sample (<= sampleSizeLimit)
    const candidateSubmissions = await prisma.submission.findMany({
      where: {
        drop_id: dropId,
        player_id: { not: playerId },
        is_bot_flagged: false,
      },
      take: sampleSizeLimit,
      select: {
        id: true,
        player_id: true,
        answers: true,
        player: {
          select: {
            region: true,
            age_band: true,
          },
        },
      },
    });

    const targetCandidate: AntiTwinCandidate = {
      submission_id: targetSubmission.id,
      player_id: targetSubmission.player_id,
      country: targetSubmission.player_id ? undefined : undefined,
      answers: targetAnswers.map((a) => ({
        question_id: a.question_id,
        answer_key: a.value,
      })),
    };

    const candidates: AntiTwinCandidate[] = candidateSubmissions.map((s) => ({
      submission_id: s.id,
      player_id: s.player_id,
      region: s.player?.region,
      age_band: s.player?.age_band,
      country: s.player?.region,
      answers: (Array.isArray(s.answers)
        ? (s.answers as Array<{ question_id: string; value: string }>)
        : []
      ).map((a) => ({
        question_id: a.question_id,
        answer_key: a.value,
      })),
    }));

    // 6. Compute Anti-Twin
    const result: AntiTwinCalculationResult | null = computeAntiTwin(
      targetCandidate,
      candidates,
      optionMap,
      dropId,
      sampleSizeLimit
    );

    if (!result) {
      return {
        ok: true,
        drop_id: dropId,
        drop_date: dropDateStr,
        pool_insufficient: true,
        pool_count: totalPoolCount,
        min_pool_size: minPoolSize,
        notice: "Not enough distinct opposites found yet today. Check back later.",
      };
    }

    // 7. Persist to anti_twin_results (7-day retention)
    await prisma.antiTwinResult.upsert({
      where: {
        drop_date_player_id: {
          drop_date: dropDate,
          player_id: playerId,
        },
      },
      update: {
        opposite_submission_ref: result.opposite_submission_ref,
        differed_count: result.differed_count,
        sample_size: result.sample_size,
        computed_at: new Date(),
      },
      create: {
        drop_date: dropDate,
        player_id: playerId,
        opposite_submission_ref: result.opposite_submission_ref,
        differed_count: result.differed_count,
        sample_size: result.sample_size,
        computed_at: new Date(),
      },
    });

    // 8. Build user's own differed questions list
    const ownDiffered: OwnDifferedQuestionDetail[] = [];
    const differedSet = new Set(result.differed_question_ids);
    for (const a of targetAnswers) {
      if (differedSet.has(a.question_id)) {
        const qMeta = questionMap.get(a.question_id);
        ownDiffered.push({
          question_id: a.question_id,
          position: qMeta?.position ?? 0,
          prompt: qMeta?.prompt ?? "Question",
          your_answer: qMeta?.options.get(a.value) || a.value,
        });
      }
    }

    return {
      ok: true,
      drop_id: dropId,
      drop_date: dropDateStr,
      differed_count: result.differed_count,
      sample_size: result.sample_size,
      opposite: {
        region: result.opposite_region,
        age_band: result.opposite_age_band,
      },
      own_differed_questions: ownDiffered,
      note: result.note,
    };
  }
}
