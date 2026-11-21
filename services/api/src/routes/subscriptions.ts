/**
 * @file subscriptions.ts
 * @package @oddly/api
 *
 * Premium Groundwork & Guardrail Routes (Stage M8 / Phase 10K - P10K.02, P10K.03, P10K.04, P10K.05).
 * - GET /v1/plans: Public catalogue of subscription plans.
 * - GET /v1/me/subscription: Player's current active plan, entitlements, and cancellation status.
 * - POST /v1/subscriptions/subscribe: Create or mock activate subscription.
 * - POST /v1/subscriptions/cancel: Self-service single-tap cancellation (Rule 17: zero surveys/retention traps).
 * - POST /v1/subscriptions/webhook: Mock payment provider webhook listener.
 * - GET /v1/paywall/eligibility: Check offer eligibility (Rule 12 non-drop & Rule 17 cooldown checks).
 * - POST /v1/paywall/event: Record paywall impression/dismissal/conversion event.
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import {
  canShowPaywallOffer,
  recordPaywallEvent,
  getPlayerEntitlements,
  ODDLY_PLUS_PLAN_KEY,
} from "@oddly/shared";

export const subscriptionsRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * GET /v1/plans
   * Catalogue of active plans and feature entitlements.
   */
  app.get(
    "/v1/plans",
    {
      schema: {
        tags: ["Subscriptions", "Premium"],
        summary: "List all active subscription plans",
        response: {
          200: z.object({
            ok: z.literal(true),
            plans: z.array(
              z.object({
                id: z.string(),
                key: z.string(),
                name_i18n: z.record(z.string()),
                description_i18n: z.record(z.string()),
                price_inr_cents: z.number(),
                duration_days: z.number(),
                entitlements: z.array(
                  z.object({
                    feature_key: z.string(),
                    config: z.record(z.unknown()),
                  })
                ),
              })
            ),
          }),
        },
      },
    },
    async (_req, reply) => {
      const plans = await prisma.plan.findMany({
        where: { status: "active" },
        include: {
          entitlements: true,
        },
        orderBy: { price_inr_cents: "asc" },
      });

      return reply.send({
        ok: true,
        plans: plans.map((p) => ({
          id: p.id,
          key: p.key,
          name_i18n: p.name_i18n as Record<string, string>,
          description_i18n: p.description_i18n as Record<string, string>,
          price_inr_cents: p.price_inr_cents,
          duration_days: p.duration_days,
          entitlements: p.entitlements.map((e) => ({
            feature_key: e.feature_key,
            config: e.config as Record<string, unknown>,
          })),
        })),
      });
    }
  );

  /**
   * GET /v1/me/subscription
   * Returns authenticated player's subscription status and entitlements.
   */
  app.get(
    "/v1/me/subscription",
    {
      schema: {
        tags: ["Subscriptions", "Me"],
        summary: "Get current player subscription and entitlements",
        response: {
          200: z.object({
            ok: z.literal(true),
            has_subscription: z.boolean(),
            status: z.string().nullable(),
            plan: z
              .object({
                id: z.string(),
                key: z.string(),
                name: z.record(z.string()),
                price_inr_cents: z.number(),
              })
              .nullable(),
            entitlements: z.record(z.unknown()),
            started_at: z.string().nullable(),
            current_period_end: z.string().nullable(),
            cancelled_at: z.string().nullable(),
            is_cancelled: z.boolean(),
            can_cancel: z.boolean(),
          }),
          401: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
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
          message: "Please sign in or link account to view subscription state.",
        });
      }

      const activeSub = await prisma.subscription.findFirst({
        where: {
          player_id: player.id,
          status: { in: ["active", "cancelled"] },
          current_period_end: { gt: new Date() },
        },
        include: {
          plan: {
            include: { entitlements: true },
          },
        },
        orderBy: { current_period_end: "desc" },
      });

      if (!activeSub) {
        return reply.send({
          ok: true,
          has_subscription: false,
          status: null,
          plan: null,
          entitlements: {},
          started_at: null,
          current_period_end: null,
          cancelled_at: null,
          is_cancelled: false,
          can_cancel: false,
        });
      }

      const playerEntitlements = await getPlayerEntitlements(prisma, player.id);

      return reply.send({
        ok: true,
        has_subscription: true,
        status: activeSub.status,
        plan: {
          id: activeSub.plan.id,
          key: activeSub.plan.key,
          name: activeSub.plan.name_i18n as Record<string, string>,
          price_inr_cents: activeSub.plan.price_inr_cents,
        },
        entitlements: playerEntitlements.entitlements,
        started_at: activeSub.started_at.toISOString(),
        current_period_end: activeSub.current_period_end.toISOString(),
        cancelled_at: activeSub.cancelled_at?.toISOString() ?? null,
        is_cancelled: activeSub.status === "cancelled",
        can_cancel: activeSub.status === "active",
      });
    }
  );

  /**
   * POST /v1/subscriptions/subscribe
   * Subscribes player to a plan (mock or test provider).
   */
  app.post<{
    Body: {
      plan_key?: string;
      provider?: string;
    };
  }>(
    "/v1/subscriptions/subscribe",
    {
      schema: {
        tags: ["Subscriptions"],
        summary: "Create or activate subscription for player",
        body: z.object({
          plan_key: z.string().optional().default(ODDLY_PLUS_PLAN_KEY),
          provider: z.string().optional().default("mock"),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            subscription: z.object({
              id: z.string(),
              plan_key: z.string(),
              status: z.string(),
              started_at: z.string(),
              current_period_end: z.string(),
            }),
          }),
          400: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          401: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
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
          message: "Sign in required to activate subscription.",
        });
      }

      const body = req.body as { plan_key?: string; provider?: string };
      const planKey = body.plan_key || ODDLY_PLUS_PLAN_KEY;
      const plan = await prisma.plan.findUnique({
        where: { key: planKey },
      });

      if (!plan || plan.status !== "active") {
        return reply.status(400).send({
          ok: false,
          error: "INVALID_PLAN",
          message: `Plan '${planKey}' not found or inactive.`,
        });
      }

      const now = new Date();
      const periodEnd = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

      const sub = await prisma.subscription.create({
        data: {
          player_id: player.id,
          plan_id: plan.id,
          status: "active",
          started_at: now,
          current_period_end: periodEnd,
          provider: body.provider || "mock",
          provider_subscription_id: `mock_sub_${Date.now()}`,
        },
      });

      return reply.send({
        ok: true,
        subscription: {
          id: sub.id,
          plan_key: plan.key,
          status: sub.status,
          started_at: sub.started_at.toISOString(),
          current_period_end: sub.current_period_end.toISOString(),
        },
      });
    }
  );

  /**
   * POST /v1/subscriptions/cancel
   * Single-tap self-service cancellation (P10K.05 & Rule 17).
   *
   * Invariants:
   * - Exactly ONE tap.
   * - ZERO retention surveys.
   * - ZERO confirmation dialog traps.
   * - Retains full access until current_period_end.
   */
  app.post(
    "/v1/subscriptions/cancel",
    {
      schema: {
        tags: ["Subscriptions"],
        summary: "Single-tap cancellation without dark patterns (Rule 17)",
        response: {
          200: z.object({
            ok: z.literal(true),
            message: z.string(),
            subscription_id: z.string(),
            cancelled_at: z.string(),
            access_until: z.string(),
          }),
          400: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          401: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
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
          message: "Sign in required to manage subscriptions.",
        });
      }

      const now = new Date();
      const activeSub = await prisma.subscription.findFirst({
        where: {
          player_id: player.id,
          status: "active",
          current_period_end: { gt: now },
        },
        orderBy: { current_period_end: "desc" },
      });

      if (!activeSub) {
        return reply.status(400).send({
          ok: false,
          error: "NO_ACTIVE_SUBSCRIPTION",
          message: "No active subscription found to cancel.",
        });
      }

      const cancelledSub = await prisma.subscription.update({
        where: { id: activeSub.id },
        data: {
          status: "cancelled",
          cancelled_at: now,
        },
      });

      return reply.send({
        ok: true,
        message:
          "Subscription cancelled successfully. You retain full access to all Oddly Plus benefits until the end of your billing cycle.",
        subscription_id: cancelledSub.id,
        cancelled_at: now.toISOString(),
        access_until: cancelledSub.current_period_end.toISOString(),
      });
    }
  );

  /**
   * POST /v1/subscriptions/webhook
   * Webhook listener for payment provider events.
   */
  app.post<{
    Body: {
      event: string;
      subscription_id?: string;
      provider_subscription_id?: string;
    };
  }>(
    "/v1/subscriptions/webhook",
    {
      schema: {
        tags: ["Subscriptions", "Webhooks"],
        summary: "Payment provider webhook notification handler",
        body: z.object({
          event: z.string(),
          subscription_id: z.string().optional(),
          provider_subscription_id: z.string().optional(),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            handled: z.boolean(),
            event: z.string(),
          }),
          400: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const body = req.body as {
        event: string;
        subscription_id?: string;
        provider_subscription_id?: string;
      };

      if (!body.subscription_id && !body.provider_subscription_id) {
        return reply.status(400).send({
          ok: false,
          error: "MISSING_IDENTIFIER",
          message: "Webhook payload must specify subscription_id or provider_subscription_id",
        });
      }

      const sub = await prisma.subscription.findFirst({
        where: {
          OR: [
            body.subscription_id ? { id: body.subscription_id } : {},
            body.provider_subscription_id
              ? { provider_subscription_id: body.provider_subscription_id }
              : {},
          ],
        },
      });

      if (!sub) {
        return reply.status(400).send({
          ok: false,
          error: "SUBSCRIPTION_NOT_FOUND",
          message: "Subscription target not found",
        });
      }

      if (body.event === "subscription.charged") {
        const nextPeriodEnd = new Date(
          sub.current_period_end.getTime() + 30 * 24 * 60 * 60 * 1000
        );
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "active",
            current_period_end: nextPeriodEnd,
          },
        });
      } else if (body.event === "subscription.cancelled") {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "cancelled",
            cancelled_at: new Date(),
          },
        });
      } else if (body.event === "subscription.halted") {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "past_due",
          },
        });
      }

      return reply.send({
        ok: true,
        handled: true,
        event: body.event,
      });
    }
  );

  /**
   * GET /v1/paywall/eligibility
   * Evaluates whether a paywall offer can be shown on a surface (Rule 12 & Rule 17).
   */
  app.get<{
    Querystring: {
      surface: string;
    };
  }>(
    "/v1/paywall/eligibility",
    {
      schema: {
        tags: ["Subscriptions", "Paywall"],
        summary: "Check paywall offer eligibility under Rule 12 & Rule 17",
        querystring: z.object({
          surface: z.string(),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            eligibility: z.object({
              canShow: z.boolean(),
              reason: z.string(),
              cooldownRemainingDays: z.number().optional(),
              dismissalHaltRemainingDays: z.number().optional(),
            }),
          }),
          401: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
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
          message: "Player identification required.",
        });
      }

      const surface = (req.query as { surface: string }).surface;
      const eligibility = await canShowPaywallOffer(prisma, player.id, surface);

      return reply.send({
        ok: true,
        eligibility,
      });
    }
  );

  /**
   * POST /v1/paywall/event
   * Record impression, dismissal, or conversion event for paywalls.
   */
  app.post<{
    Body: {
      surface: string;
      event_type: "offer_shown" | "dismissed" | "converted";
    };
  }>(
    "/v1/paywall/event",
    {
      schema: {
        tags: ["Subscriptions", "Paywall"],
        summary: "Record paywall event with surface validation",
        body: z.object({
          surface: z.string(),
          event_type: z.enum(["offer_shown", "dismissed", "converted"]),
        }),
        response: {
          200: z.object({
            ok: z.literal(true),
            event_id: z.string(),
          }),
          400: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
          }),
          401: z.object({
            ok: z.literal(false),
            error: z.string(),
            message: z.string(),
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
          message: "Player identification required.",
        });
      }

      const body = req.body as {
        surface: string;
        event_type: "offer_shown" | "dismissed" | "converted";
      };

      try {
        const ev = await recordPaywallEvent(
          prisma,
          player.id,
          body.surface,
          body.event_type
        );
        return reply.send({
          ok: true,
          event_id: ev.id,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Invalid paywall event";
        return reply.status(400).send({
          ok: false,
          error: "GUARDRAIL_VIOLATION",
          message,
        });
      }
    }
  );
};

