/**
 * @file telepathy.repo.ts
 * @package @oddly/api
 *
 * Repository for Telepathy (Instinct Sync) (Stage F3 / Phase 10C).
 * Invariants:
 * - Active only after both players in the Orbit have submitted today's Drop.
 * - Permanent guess lock-in: Once locked, a guess cannot be modified or re-submitted (409 Conflict).
 * - Scoped Rule 4 reveal exception: Partner pick is revealed strictly for the designated
 *   Telepathy question and strictly AFTER caller's own guess is locked.
 * - Real statistical baseline: sum(p(a)^2) across option probabilities.
 * - Sync score unlock: Surfaced after 5 completed rounds.
 */

import { prisma } from "./client.js";
import { randomUUID } from "node:crypto";
import {
  getTwinDay,
  selectTelepathyQuestion,
  calculateLuckBaseline,
  calculateSyncScore,
  type AnswerFrequency,
  type TelepathySyncSummary,
} from "@oddly/shared";

export interface TelepathyRoundState {
  drop_date: string;
  question: {
    id: string;
    position: number;
    type: "text" | "image";
    prompt: string;
    answer_options: Array<{
      id: string;
      label: string;
      value: string;
      display_order: number;
      illustration_key?: string | null;
    }>;
  } | null;
  has_both_submitted: boolean;
  caller_submitted: boolean;
  partner_submitted: boolean;
  my_guess: {
    guessed_option: string;
    locked_at: string;
  } | null;
  partner_guess_locked: boolean;
  reveal: {
    partner_pick: string;
    is_match: boolean;
    baseline_p: number;
  } | null;
  sync_summary: TelepathySyncSummary | null;
}

export class TelepathyRepository {
  /**
   * Fetch current Telepathy round state for an Orbit partner.
   */
  static async getRoundState(
    orbitId: string,
    playerId: string,
    targetDateStr?: string
  ): Promise<TelepathyRoundState> {
    const orbit = await prisma.orbit.findUnique({
      where: { id: orbitId },
    });

    if (!orbit) {
      throw new Error("ORBIT_NOT_FOUND");
    }

    if (orbit.player_a_id !== playerId && orbit.player_b_id !== playerId) {
      throw new Error("FORBIDDEN");
    }

    const partnerId = orbit.player_a_id === playerId ? orbit.player_b_id : orbit.player_a_id;
    const dateStr = targetDateStr || getTwinDay(new Date());
    const dropDateObj = new Date(`${dateStr}T00:00:00.000Z`);

    // 1. Fetch drop for today
    const drop = await prisma.drop.findUnique({
      where: { drop_date: dropDateObj },
      include: {
        questions: {
          include: { answerOptions: true },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!drop) {
      return {
        drop_date: dateStr,
        question: null,
        has_both_submitted: false,
        caller_submitted: false,
        partner_submitted: false,
        my_guess: null,
        partner_guess_locked: false,
        reveal: null,
        sync_summary: null,
      };
    }

    // 2. Select designated Telepathy question
    let designatedQ = drop.telepathy_question_id
      ? drop.questions.find((q) => q.id === drop.telepathy_question_id)
      : selectTelepathyQuestion(drop.questions);

    if (!designatedQ && drop.questions.length > 0) {
      designatedQ = drop.questions[0];
    }

    // 3. Check submissions from both players
    const [callerSub, partnerSub] = await Promise.all([
      prisma.submission.findUnique({
        where: {
          drop_date_player_id: {
            drop_date: dropDateObj,
            player_id: playerId,
          },
        },
      }),
      prisma.submission.findUnique({
        where: {
          drop_date_player_id: {
            drop_date: dropDateObj,
            player_id: partnerId,
          },
        },
      }),
    ]);

    const callerSubmitted = Boolean(callerSub);
    const partnerSubmitted = Boolean(partnerSub);
    const hasBothSubmitted = callerSubmitted && partnerSubmitted;

    // 4. Fetch caller and partner guesses
    const [callerGuess, partnerGuess] = await Promise.all([
      prisma.telepathyGuess.findUnique({
        where: {
          orbit_id_drop_date_guesser_player_id: {
            orbit_id: orbitId,
            drop_date: dropDateObj,
            guesser_player_id: playerId,
          },
        },
      }),
      prisma.telepathyGuess.findUnique({
        where: {
          orbit_id_drop_date_guesser_player_id: {
            orbit_id: orbitId,
            drop_date: dropDateObj,
            guesser_player_id: partnerId,
          },
        },
      }),
    ]);

    // 5. Scoped Reveal Exception (Rule 4)
    // Partner's actual pick is revealed ONLY if caller has already locked their own guess!
    let reveal: TelepathyRoundState["reveal"] = null;

    if (callerGuess && partnerSub && designatedQ) {
      let partnerActualPick: string | null = null;
      if (Array.isArray(partnerSub.answers)) {
        const found = (partnerSub.answers as Array<{ question_id: string; value: any }>).find(
          (a) => a.question_id === designatedQ!.id
        );
        if (found) {
          partnerActualPick = Array.isArray(found.value) ? found.value.join(",") : String(found.value);
        }
      }

      const isMatch = callerGuess.hit ?? (partnerActualPick === callerGuess.guessed_option_key);
      reveal = {
        partner_pick: partnerActualPick || "—",
        is_match: Boolean(isMatch),
        baseline_p: callerGuess.baseline_p,
      };
    }

    // 6. Compute running Sync summary across all rounds for this orbit
    const allRounds = await prisma.telepathyGuess.findMany({
      where: {
        orbit_id: orbitId,
        guesser_player_id: playerId,
      },
      select: {
        hit: true,
        baseline_p: true,
      },
    });

    const syncSummary = calculateSyncScore(
      allRounds.map((r) => ({ hit: r.hit, baseline_p: r.baseline_p })),
      5
    );

    // Format question details
    let formattedQuestion: TelepathyRoundState["question"] = null;
    if (designatedQ) {
      const qPayload = designatedQ.payload as any;
      const promptText = qPayload?.prompt || "Which option did your twin pick?";

      let options = designatedQ.answerOptions.map((opt) => ({
        id: opt.id,
        label: opt.label,
        value: opt.value,
        display_order: opt.display_order,
        illustration_key: opt.illustration_key,
      }));

      // Fallback to payload options if answerOptions not materialized
      if (options.length === 0 && qPayload?.options) {
        options = qPayload.options.map((opt: any, i: number) => ({
          id: `opt-${i + 1}`,
          label: opt.label,
          value: opt.value,
          display_order: i + 1,
          illustration_key: opt.illustration_key ?? null,
        }));
      }

      formattedQuestion = {
        id: designatedQ.id,
        position: designatedQ.position,
        type: designatedQ.type as "text" | "image",
        prompt: promptText,
        answer_options: options,
      };
    }

    return {
      drop_date: dateStr,
      question: formattedQuestion,
      has_both_submitted: hasBothSubmitted,
      caller_submitted: callerSubmitted,
      partner_submitted: partnerSubmitted,
      my_guess: callerGuess
        ? {
            guessed_option: callerGuess.guessed_option_key,
            locked_at: callerGuess.created_at.toISOString(),
          }
        : null,
      partner_guess_locked: Boolean(partnerGuess),
      reveal,
      sync_summary: syncSummary,
    };
  }

  /**
   * Lock in caller's guess for today's Telepathy round.
   * Throws 409 GUESS_ALREADY_LOCKED if caller already submitted.
   * Throws 422 SUBMISSION_REQUIRED if both players have not yet completed today's Drop.
   */
  static async lockInGuess(
    orbitId: string,
    playerId: string,
    guessedOption: string,
    targetDateStr?: string
  ): Promise<TelepathyRoundState> {
    const orbit = await prisma.orbit.findUnique({
      where: { id: orbitId },
    });

    if (!orbit) {
      throw new Error("ORBIT_NOT_FOUND");
    }

    if (orbit.player_a_id !== playerId && orbit.player_b_id !== playerId) {
      throw new Error("FORBIDDEN");
    }

    if (orbit.status !== "active") {
      throw new Error("ORBIT_NOT_ACTIVE");
    }

    const partnerId = orbit.player_a_id === playerId ? orbit.player_b_id : orbit.player_a_id;
    const dateStr = targetDateStr || getTwinDay(new Date());
    const dropDateObj = new Date(`${dateStr}T00:00:00.000Z`);

    // 1. Fetch drop and designated question
    const drop = await prisma.drop.findUnique({
      where: { drop_date: dropDateObj },
      include: {
        questions: {
          include: { answerOptions: true },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!drop) {
      throw new Error("DROP_NOT_FOUND");
    }

    let designatedQ = drop.telepathy_question_id
      ? drop.questions.find((q) => q.id === drop.telepathy_question_id)
      : selectTelepathyQuestion(drop.questions);

    if (!designatedQ && drop.questions.length > 0) {
      designatedQ = drop.questions[0];
    }

    if (!designatedQ) {
      throw new Error("TELEPATHY_QUESTION_NOT_FOUND");
    }

    // 2. Both players must have submitted today
    const [callerSub, partnerSub] = await Promise.all([
      prisma.submission.findUnique({
        where: {
          drop_date_player_id: {
            drop_date: dropDateObj,
            player_id: playerId,
          },
        },
      }),
      prisma.submission.findUnique({
        where: {
          drop_date_player_id: {
            drop_date: dropDateObj,
            player_id: partnerId,
          },
        },
      }),
    ]);

    if (!callerSub || !partnerSub) {
      throw new Error("SUBMISSION_REQUIRED");
    }

    // 3. Permanent lock-in check: once locked, cannot change
    const existingGuess = await prisma.telepathyGuess.findUnique({
      where: {
        orbit_id_drop_date_guesser_player_id: {
          orbit_id: orbitId,
          drop_date: dropDateObj,
          guesser_player_id: playerId,
        },
      },
    });

    if (existingGuess) {
      throw new Error("GUESS_ALREADY_LOCKED");
    }

    // 4. Determine partner's actual choice on the designated question
    let partnerActualPick: string | null = null;
    if (Array.isArray(partnerSub.answers)) {
      const found = (partnerSub.answers as Array<{ question_id: string; value: any }>).find(
        (a) => a.question_id === designatedQ!.id
      );
      if (found) {
        partnerActualPick = Array.isArray(found.value) ? found.value.join(",") : String(found.value);
      }
    }

    const hit = partnerActualPick !== null ? partnerActualPick === guessedOption : false;

    // 5. Calculate baseline probability from answer_stats or default 1/K
    const stats = await prisma.answerStat.findMany({
      where: {
        drop_date: dropDateObj,
        question_id: designatedQ.id,
      },
    });

    const frequencies: AnswerFrequency[] = stats.map((s) => ({
      question_id: s.question_id,
      value: s.value,
      count: s.count,
      probability: s.probability,
    }));

    const optionCount = designatedQ.answerOptions.length || 4;
    const baselineP = calculateLuckBaseline(designatedQ.id, frequencies, optionCount);

    // 6. Record guess in telepathy_guesses table
    await prisma.telepathyGuess.create({
      data: {
        id: randomUUID(),
        orbit_id: orbitId,
        drop_date: dropDateObj,
        guesser_player_id: playerId,
        question_id: designatedQ.id,
        guessed_option_key: guessedOption,
        partner_option_key: partnerActualPick,
        hit,
        baseline_p: baselineP,
      },
    });

    // 7. Return refreshed round state with reveal
    return this.getRoundState(orbitId, playerId, dateStr);
  }
}
