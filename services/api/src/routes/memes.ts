/**
 * @file memes.ts
 * @package @oddly/api
 *
 * Meme Lab Routes (Stage M3 / Phase 10G / Tasks P10G.02, P10G.05, P10G.07, P10G.08).
 *
 * Implements:
 * - POST /v1/memes/submissions: Meme Lab submission API (Turnstile, duplicate check, 100 char limit)
 * - GET /v1/memes/templates: List active curated vector illustration templates
 * - GET /v1/memes/submissions/mine: List player's own meme submissions and their status
 *
 * Invariants:
 * - Rule 18: Scoped free-text exception strictly <= 100 characters.
 * - Zero public exposure until passed through human moderation queue in Mission Control.
 * - Daily submission cap (default 2 per author per day).
 * - Exact and Levenshtein near-duplicate rejection within template.
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { MemesRepository } from "../db/memes.repo.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import { resolveAuthenticatedAdmin } from "../auth/admin-auth.js";
import { DegradationManager } from "../resilience/degradation.js";
import {
  CreateMemeSubmissionSchema,
  type CreateMemeSubmissionInput,
  RateMemeSchema,
  type RateMemeInput,
  CandidatePromotionSchema,
  type CandidatePromotionInput,
  CandidateApprovalSchema,
  type CandidateApprovalInput,
  calculateWilsonScore,
  isTurnstileValid,
  isDuplicateOrNearDuplicate,
} from "@oddly/shared";

export const memeRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/memes/templates
   * Lists active meme illustration templates available for captioning.
   */
  app.get(
    "/v1/memes/templates",
    {
      schema: {
        response: {
          200: z.object({
            ok: z.boolean(),
            templates: z.array(
              z.object({
                id: z.string(),
                key: z.string(),
                illustration_registry_key: z.string(),
                aspect: z.string(),
                alt_text_i18n: z.record(z.string(), z.unknown()),
                license_note: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (_req, reply) => {
      const templates = await prisma.memeTemplate.findMany({
        where: { status: "active" },
        select: {
          id: true,
          key: true,
          illustration_registry_key: true,
          aspect: true,
          alt_text_i18n: true,
          license_note: true,
        },
        orderBy: { key: "asc" },
      });

      return reply.status(200).send({
        ok: true,
        templates: templates.map((t) => ({
          ...t,
          alt_text_i18n: t.alt_text_i18n as Record<string, unknown>,
        })),
      });
    }
  );

  /**
   * GET /v1/memes/corner
   * Fetches the next tailored Meme Corner card for the authenticated player (P10G.06).
   * Runs the 80/20 exposure engine (80% exploitation top Wilson score, 20% exploration),
   * enforcing author exclusion, no-repeat limits, and template diversity caps.
   */
  app.get(
    "/v1/memes/corner",
    {
      schema: {
        response: {
          200: z.object({
            ok: z.boolean(),
            meme: z
              .object({
                id: z.string(),
                template_id: z.string(),
                template_key: z.string(),
                illustration_registry_key: z.string(),
                caption_text: z.string(),
                aspect: z.string(),
                alt_text: z.string().optional(),
                wilson_lb: z.number(),
                is_exploration: z.boolean(),
              })
              .nullable(),
          }),
        },
      },
    },
    async (req, reply) => {
      // 1. Degradation Shedding Check
      const degradationLevel = await DegradationManager.getLevel();
      if (degradationLevel >= 2) {
        return reply.status(503).send({
          ok: false,
          error: "SERVICE_DEGRADED",
          message: "Meme Corner is temporarily paused under high traffic.",
        });
      }

      // 2. Authentication Check
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to view Meme Corner",
        });
      }

      // 3. Exposure Engine Selection
      const memesRepo = new MemesRepository(prisma);
      const selected = await memesRepo.selectMemeForPlayer(player.id);

      return reply.status(200).send({
        ok: true,
        meme: selected,
      });
    }
  );

  /**
   * POST /v1/memes/submissions
   * Submits a user-authored caption for an active meme template.
   * Enforces Rule 18 (<= 100 chars), Turnstile, duplicate checking, and daily rate limit.
   */
  app.post(
    "/v1/memes/submissions",
    {
      schema: {
        body: CreateMemeSubmissionSchema,
        response: {
          201: z.object({
            ok: z.boolean(),
            submission: z.object({
              id: z.string(),
              author_player_id: z.string(),
              template_id: z.string(),
              caption_text: z.string(),
              status: z.string(),
              created_at: z.string(),
            }),
          }),
        },
      },
    },
    async (req, reply) => {
      // 1. Degradation Shedding Check
      const degradationLevel = await DegradationManager.getLevel();
      if (degradationLevel >= 2) {
        return reply.status(503).send({
          ok: false,
          error: "SERVICE_DEGRADED",
          message: "Meme submissions are temporarily paused under high traffic. Please try again later.",
        });
      }

      // 2. Authentication Check
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to submit memes",
        });
      }

      const { template_id, caption_text, turnstile_token } = req.body as CreateMemeSubmissionInput;

      // 3. Turnstile Human Verification Check
      if (!isTurnstileValid(turnstile_token)) {
        return reply.status(400).send({
          ok: false,
          error: "INVALID_TURNSTILE",
          message: "Turnstile human verification challenge failed",
        });
      }

      // 4. Validate Template Existence and Active Status
      const template = await prisma.memeTemplate.findFirst({
        where: {
          OR: [{ id: template_id }, { key: template_id }],
          status: "active",
        },
      });

      if (!template) {
        return reply.status(404).send({
          ok: false,
          error: "TEMPLATE_NOT_FOUND",
          message: "Meme template not found or is currently inactive",
        });
      }

      // 5. Daily Submission Cap Check (default 2 per day)
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const dailyCount = await prisma.memeSubmission.count({
        where: {
          author_player_id: player.id,
          created_at: { gte: startOfDay },
        },
      });

      if (dailyCount >= 2) {
        return reply.status(429).send({
          ok: false,
          error: "DAILY_LIMIT_EXCEEDED",
          message: "Daily submission limit reached (max 2 per day)",
        });
      }

      // 6. Duplicate & Near-Duplicate Detection Check
      const trimmedCaption = caption_text.trim();
      const existingSubmissions = await prisma.memeSubmission.findMany({
        where: {
          template_id: template.id,
          status: { in: ["queued", "approved"] },
        },
        select: { caption_text: true },
      });

      const existingCaptions = existingSubmissions.map((s) => s.caption_text);
      const dupCheck = isDuplicateOrNearDuplicate(trimmedCaption, existingCaptions, 2);

      if (dupCheck.isDuplicate) {
        return reply.status(409).send({
          ok: false,
          error: "DUPLICATE_CAPTION",
          message:
            dupCheck.reason === "exact"
              ? "An identical caption already exists for this template"
              : "A very similar caption already exists for this template",
        });
      }

      // 7. Persist Meme Submission and Initialize Stats (Rule 18: status = 'queued')
      const submission = await prisma.memeSubmission.create({
        data: {
          author_player_id: player.id,
          template_id: template.id,
          caption_text: trimmedCaption,
          status: "queued",
          turnstile_verified: true,
          originality_attested_at: new Date(),
          stats: {
            create: {
              impressions: 0,
              raters: 0,
              funny_count: 0,
              not_for_me_count: 0,
              wilson_lb: 0.0,
            },
          },
        },
        select: {
          id: true,
          author_player_id: true,
          template_id: true,
          caption_text: true,
          status: true,
          created_at: true,
        },
      });

      return reply.status(201).send({
        ok: true,
        submission: {
          ...submission,
          created_at: submission.created_at.toISOString(),
        },
      });
    }
  );

  /**
   * GET /v1/memes/submissions/mine
   * Lists the authenticated player's own meme submissions and their review status.
   */
  app.get(
    "/v1/memes/submissions/mine",
    {
      schema: {
        response: {
          200: z.object({
            ok: z.boolean(),
            submissions: z.array(
              z.object({
                id: z.string(),
                template_id: z.string(),
                caption_text: z.string(),
                status: z.string(),
                moderation_reason: z.string().nullable(),
                created_at: z.string(),
              })
            ),
          }),
        },
      },
    },
    async (req, reply) => {
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to view your meme submissions",
        });
      }

      const submissions = await prisma.memeSubmission.findMany({
        where: { author_player_id: player.id },
        select: {
          id: true,
          template_id: true,
          caption_text: true,
          status: true,
          moderation_reason: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
      });

      return reply.status(200).send({
        ok: true,
        submissions: submissions.map((s) => ({
          ...s,
          created_at: s.created_at.toISOString(),
        })),
      });
    }
  );

  /**
   * POST /v1/memes/:id/rating
   * Ingests a binary reaction ("funny" | "not_for_me") for a meme submission.
   * Enforces 1 rating per player per submission, sheds at degradation L2+,
   * updates raters counters, and recalculates Wilson score lower bound.
   */
  app.post(
    "/v1/memes/:id/rating",
    {
      schema: {
        params: z.object({
          id: z.string().min(1, "Meme submission ID is required"),
        }),
        body: RateMemeSchema,
        response: {
          200: z.object({
            ok: z.boolean(),
            submission_id: z.string(),
            rating: z.enum(["funny", "not_for_me"]),
            raters: z.number(),
            wilson_lb: z.number(),
          }),
        },
      },
    },
    async (req, reply) => {
      // 1. Degradation Shedding Check
      const degradationLevel = await DegradationManager.getLevel();
      if (degradationLevel >= 2) {
        return reply.status(503).send({
          ok: false,
          error: "SERVICE_DEGRADED",
          message: "Meme rating ingestion is temporarily paused under high traffic.",
        });
      }

      // 2. Authentication Check
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to rate memes",
        });
      }

      const { id: submissionId } = req.params as { id: string };
      const { rating } = req.body as RateMemeInput;

      // 3. Validate Submission Existence
      const submission = await prisma.memeSubmission.findUnique({
        where: { id: submissionId },
        include: { stats: true },
      });

      if (!submission) {
        return reply.status(404).send({
          ok: false,
          error: "MEME_NOT_FOUND",
          message: "Meme submission not found",
        });
      }

      // 4. Check for Existing Rating by this Player
      const existingRating = await prisma.memeRating.findUnique({
        where: {
          submission_rater_unique: {
            submission_id: submissionId,
            rater_player_id: player.id,
          },
        },
      });

      if (existingRating) {
        return reply.status(409).send({
          ok: false,
          error: "ALREADY_RATED",
          message: "You have already rated this meme submission",
        });
      }

      // 5. Ingest Rating & Update Stats in Transaction
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      try {
        const result = await prisma.$transaction(async (tx) => {
          await tx.memeRating.create({
            data: {
              submission_id: submissionId,
              rater_player_id: player.id,
              rating,
              drop_date: today,
            },
          });

          const currentStats = await tx.memeStat.findUnique({
            where: { submission_id: submissionId },
          });

          const newRaters = (currentStats?.raters ?? 0) + 1;
          const newFunny = (currentStats?.funny_count ?? 0) + (rating === "funny" ? 1 : 0);
          const newNotForMe = (currentStats?.not_for_me_count ?? 0) + (rating === "not_for_me" ? 1 : 0);

          // ADR 043: Minimum 200 raters required before Wilson score activates
          const minRatersWilson = 200;
          const newWilson =
            newRaters >= minRatersWilson ? calculateWilsonScore(newFunny, newRaters) : 0.0;

          const updatedStats = await tx.memeStat.upsert({
            where: { submission_id: submissionId },
            create: {
              submission_id: submissionId,
              impressions: 1,
              raters: newRaters,
              funny_count: newFunny,
              not_for_me_count: newNotForMe,
              wilson_lb: newWilson,
              last_shown_at: new Date(),
            },
            update: {
              raters: newRaters,
              funny_count: newFunny,
              not_for_me_count: newNotForMe,
              wilson_lb: newWilson,
              last_shown_at: new Date(),
            },
          });

          return updatedStats;
        });

        return reply.status(200).send({
          ok: true,
          submission_id: submissionId,
          rating,
          raters: result.raters,
          wilson_lb: result.wilson_lb,
        });
      } catch (err: unknown) {
        const error = err as { code?: string };
        if (error.code === "P2002") {
          return reply.status(409).send({
            ok: false,
            error: "ALREADY_RATED",
            message: "You have already rated this meme submission",
          });
        }
        throw err;
      }
    }
  );

  /**
   * GET /v1/admin/memes/candidates
   * Lists high-scoring community memes eligible for daily Drop promotion (P10G.07, Spec Section A5.2).
   * Threshold: raters >= 200, wilson_lb >= 0.70.
   */
  app.get(
    "/v1/admin/memes/candidates",
    {
      schema: {
        response: {
          200: z.object({
            ok: z.boolean(),
            count: z.number(),
            candidates: z.array(
              z.object({
                id: z.string(),
                caption_text: z.string(),
                template_key: z.string(),
                illustration_registry_key: z.string(),
                raters: z.number(),
                funny_count: z.number(),
                funny_percentage: z.number(),
                wilson_lb: z.number(),
                status: z.string(),
                promoted_by: z.string().nullable(),
                promoted_at: z.string().nullable(),
                approved_by: z.string().nullable(),
                approved_at: z.string().nullable(),
                is_dual_approved: z.boolean(),
              })
            ),
          }),
        },
      },
    },
    async (req, reply) => {
      const admin = await resolveAuthenticatedAdmin(req);
      if (!admin || !["owner", "admin", "approver", "editor"].includes(admin.role)) {
        return reply.status(403).send({
          ok: false,
          error: "FORBIDDEN",
          message: "Admin or Approver credentials required to view Drop candidates",
        });
      }

      const minWilson = 0.70;
      const minRaters = 200;

      const candidates = await prisma.memeSubmission.findMany({
        where: {
          status: "approved",
          stats: {
            wilson_lb: { gte: minWilson },
            raters: { gte: minRaters },
          },
        },
        include: {
          template: true,
          stats: true,
          moderationActions: {
            where: {
              action: { in: ["promote_candidate", "approve_candidate", "reject_candidate"] },
            },
            orderBy: { created_at: "asc" },
          },
        },
        orderBy: {
          stats: { wilson_lb: "desc" },
        },
      });

      const items = candidates.map((c) => {
        const promoteAction = c.moderationActions.find((a) => a.action === "promote_candidate");
        const approveAction = c.moderationActions.find((a) => a.action === "approve_candidate");
        const rejectAction = c.moderationActions.find((a) => a.action === "reject_candidate");

        const isPromoted = !!promoteAction && !rejectAction;
        const isDualApproved =
          isPromoted && !!approveAction && approveAction.admin_id !== promoteAction.admin_id;

        return {
          id: c.id,
          caption_text: c.caption_text,
          template_key: c.template.key,
          illustration_registry_key: c.template.illustration_registry_key,
          raters: c.stats?.raters ?? 0,
          funny_count: c.stats?.funny_count ?? 0,
          funny_percentage:
            (c.stats?.raters ?? 0) > 0
              ? Math.round(((c.stats?.funny_count ?? 0) / (c.stats?.raters ?? 1)) * 100)
              : 0,
          wilson_lb: c.stats?.wilson_lb ?? 0.0,
          status: isDualApproved
            ? "dual_approved"
            : isPromoted
            ? "pending_second_approval"
            : rejectAction
            ? "rejected"
            : "eligible_unpromoted",
          promoted_by: promoteAction?.admin_id ?? null,
          promoted_at: promoteAction?.created_at.toISOString() ?? null,
          approved_by: approveAction?.admin_id ?? null,
          approved_at: approveAction?.created_at.toISOString() ?? null,
          is_dual_approved: isDualApproved,
        };
      });

      return reply.status(200).send({
        ok: true,
        count: items.length,
        candidates: items,
      });
    }
  );

  /**
   * POST /v1/admin/memes/:id/promote
   * Promotes an eligible meme into the Drop candidate pool (Step 1 of two-person workflow).
   */
  app.post(
    "/v1/admin/memes/:id/promote",
    {
      schema: {
        params: z.object({
          id: z.string().min(1, "Meme submission ID is required"),
        }),
        body: CandidatePromotionSchema,
        response: {
          200: z.object({
            ok: z.boolean(),
            submission_id: z.string(),
            status: z.string(),
            promoted_by: z.string(),
            action_id: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const admin = await resolveAuthenticatedAdmin(req);
      if (!admin || !["owner", "admin", "editor"].includes(admin.role)) {
        return reply.status(403).send({
          ok: false,
          error: "FORBIDDEN",
          message: "Editor, Admin, or Owner credentials required to promote Drop candidates",
        });
      }

      const { id: submissionId } = req.params as { id: string };
      const { reason, target_drop_date } = req.body as CandidatePromotionInput;

      const submission = await prisma.memeSubmission.findUnique({
        where: { id: submissionId },
        include: {
          stats: true,
          moderationActions: {
            where: { action: { in: ["promote_candidate", "approve_candidate"] } },
          },
        },
      });

      if (!submission) {
        return reply.status(404).send({
          ok: false,
          error: "MEME_NOT_FOUND",
          message: "Meme submission not found",
        });
      }

      const raters = submission.stats?.raters ?? 0;
      const wilson = submission.stats?.wilson_lb ?? 0.0;
      if (raters < 200 || wilson < 0.70) {
        return reply.status(400).send({
          ok: false,
          error: "CRITERIA_NOT_MET",
          message: `Submission does not meet candidate criteria (requires raters >= 200 and wilson_lb >= 0.70; has raters=${raters}, wilson_lb=${wilson.toFixed(3)})`,
        });
      }

      const existingPromotion = submission.moderationActions.find(
        (a) => a.action === "promote_candidate"
      );
      if (existingPromotion) {
        return reply.status(409).send({
          ok: false,
          error: "ALREADY_PROMOTED",
          message: `Meme already promoted by admin ${existingPromotion.admin_id} on ${existingPromotion.created_at.toISOString()}`,
        });
      }

      const note = target_drop_date ? `Target Drop: ${target_drop_date}` : undefined;
      const action = await prisma.moderationAction.create({
        data: {
          submission_id: submissionId,
          action: "promote_candidate",
          reason: reason || "Promoted to Drop candidate pool",
          note,
          admin_id: admin.id,
        },
      });

      return reply.status(200).send({
        ok: true,
        submission_id: submissionId,
        status: "pending_second_approval",
        promoted_by: admin.id,
        action_id: action.id,
        message: "Meme successfully promoted to candidate pool; awaiting second admin approval.",
      });
    }
  );

  /**
   * POST /v1/admin/memes/:id/approve-candidate
   * Grants the second admin approval for a Drop candidate (Two-Person Approval Rule).
   * Enforces: Approver cannot be the admin who promoted the candidate.
   */
  app.post(
    "/v1/admin/memes/:id/approve-candidate",
    {
      schema: {
        params: z.object({
          id: z.string().min(1, "Meme submission ID is required"),
        }),
        body: CandidateApprovalSchema,
        response: {
          200: z.object({
            ok: z.boolean(),
            submission_id: z.string(),
            status: z.string(),
            promoted_by: z.string(),
            approved_by: z.string(),
            action_id: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const admin = await resolveAuthenticatedAdmin(req);
      if (!admin || !["owner", "admin", "approver"].includes(admin.role)) {
        return reply.status(403).send({
          ok: false,
          error: "FORBIDDEN",
          message: "Approver, Admin, or Owner credentials required to approve Drop candidates",
        });
      }

      const { id: submissionId } = req.params as { id: string };
      const { note } = req.body as CandidateApprovalInput;

      const submission = await prisma.memeSubmission.findUnique({
        where: { id: submissionId },
        include: {
          moderationActions: {
            where: {
              action: { in: ["promote_candidate", "approve_candidate", "reject_candidate"] },
            },
            orderBy: { created_at: "desc" },
          },
        },
      });

      if (!submission) {
        return reply.status(404).send({
          ok: false,
          error: "MEME_NOT_FOUND",
          message: "Meme submission not found",
        });
      }

      const promotion = submission.moderationActions.find(
        (a) => a.action === "promote_candidate"
      );
      if (!promotion) {
        return reply.status(400).send({
          ok: false,
          error: "NOT_PROMOTED",
          message: "Meme must be promoted to the candidate pool before second approval can be granted",
        });
      }

      // TWO-PERSON APPROVAL INVARIANT (ADR 043, Spec Section A5.2)
      if (promotion.admin_id === admin.id) {
        return reply.status(403).send({
          ok: false,
          error: "TWO_PERSON_RULE_VIOLATION",
          message:
            "Two-person approval violation: Approver cannot be the same admin who promoted the candidate",
        });
      }

      const existingApproval = submission.moderationActions.find(
        (a) => a.action === "approve_candidate"
      );
      if (existingApproval) {
        return reply.status(409).send({
          ok: false,
          error: "ALREADY_DUAL_APPROVED",
          message: "This candidate has already received dual-admin approval",
        });
      }

      const action = await prisma.moderationAction.create({
        data: {
          submission_id: submissionId,
          action: "approve_candidate",
          reason: "Two-person approval confirmed",
          note: note || "Candidate approved for Drop scheduling",
          admin_id: admin.id,
        },
      });

      return reply.status(200).send({
        ok: true,
        submission_id: submissionId,
        status: "dual_approved",
        promoted_by: promotion.admin_id,
        approved_by: admin.id,
        action_id: action.id,
        message: "Dual-admin approval confirmed. Candidate is now verified for Drop scheduling.",
      });
    }
  );

  /**
   * POST /v1/admin/memes/:id/reject-candidate
   * Rejects a promoted Drop candidate from the pool.
   */
  app.post(
    "/v1/admin/memes/:id/reject-candidate",
    {
      schema: {
        params: z.object({
          id: z.string().min(1, "Meme submission ID is required"),
        }),
        body: z.object({
          reason: z.string().min(1, "Rejection reason is required"),
        }),
        response: {
          200: z.object({
            ok: z.boolean(),
            submission_id: z.string(),
            status: z.string(),
            rejected_by: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const admin = await resolveAuthenticatedAdmin(req);
      if (!admin || !["owner", "admin", "approver"].includes(admin.role)) {
        return reply.status(403).send({
          ok: false,
          error: "FORBIDDEN",
          message: "Approver, Admin, or Owner credentials required to reject Drop candidates",
        });
      }

      const { id: submissionId } = req.params as { id: string };
      const { reason } = req.body as { reason: string };

      const submission = await prisma.memeSubmission.findUnique({
        where: { id: submissionId },
      });

      if (!submission) {
        return reply.status(404).send({
          ok: false,
          error: "MEME_NOT_FOUND",
          message: "Meme submission not found",
        });
      }

      await prisma.moderationAction.create({
        data: {
          submission_id: submissionId,
          action: "reject_candidate",
          reason: reason || "Rejected from Drop candidate pool",
          admin_id: admin.id,
        },
      });

      return reply.status(200).send({
        ok: true,
        submission_id: submissionId,
        status: "candidate_rejected",
        rejected_by: admin.id,
        message: "Candidate promotion rejected.",
      });
    }
  );
};
