/**
 * @file events.ts
 * @package @oddly/api
 *
 * Consented telemetry events ingestion and DPDP consent management endpoints (P10F.03, P10F.04, P10F.09).
 *
 * Invariants:
 * 1. 202 Accepted response for events ingestion; client fire-and-forget.
 * 2. Resource Rank 7 shedding: 50% sampling at L1, 100% load shed at L2+.
 * 3. DPDP Default OFF: events are dropped unless 'analytics' consent is actively granted.
 * 4. Pseudonymous isolation: events are keyed strictly by analytics_id, severed from player_id.
 * 5. Strict schema allowlist: zero IPs, zero PII, zero arbitrary free text.
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/client.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";
import { DegradationManager } from "../resilience/degradation.js";
import {
  EventsBatchRequestSchema,
  UpdateConsentRequestSchema,
  type EventsBatchRequest,
  type UpdateConsentRequest,
  type Prisma,
} from "@oddly/shared";

export const eventsRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * POST /v1/events
   * Ingest consented telemetry batch in low-priority background lane (P10F.03, P10F.09).
   */
  app.post(
    "/v1/events",
    {
      schema: {
        tags: ["Signals"],
        summary: "Ingest client telemetry events batch (consented, fire-and-forget)",
        body: EventsBatchRequestSchema,
        response: {
          202: z.object({
            ok: z.boolean(),
            accepted: z.number().int(),
            dropped: z.boolean().optional(),
            consented: z.boolean().optional(),
          }),
        },
      },
    },
    async (req, reply) => {
      // 1. Degradation Check (Resource Rank 7 Load Shedding - P10F.09)
      const degradationLevel = await DegradationManager.getLevel();

      // At L2+ (Protect Core / Survive): Shed 100% of telemetry immediately
      if (degradationLevel >= 2) {
        return reply.status(202).send({
          ok: true,
          accepted: 0,
          dropped: true,
        });
      }

      // At L1 (Conserve): Deterministic 50% sampling using request ID hash
      if (degradationLevel === 1) {
        const hashChar = req.id.charCodeAt(req.id.length - 1) || 0;
        if (hashChar % 2 !== 0) {
          return reply.status(202).send({
            ok: true,
            accepted: 0,
            dropped: true,
          });
        }
      }

      // 2. Resolve Player Identity
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        // Without identifiable player, cannot verify DPDP consent -> drop events
        return reply.status(202).send({
          ok: true,
          accepted: 0,
          consented: false,
        });
      }

      // 3. Verify Active 'analytics' Consent (DPDP Default OFF - Rule 13 & P10F.04)
      const consent = await prisma.consent.findUnique({
        where: {
          player_purpose: {
            player_id: player.id,
            purpose: "analytics",
          },
        },
      });

      if (!consent || consent.withdrawn_at !== null) {
        // Not consented -> strictly discard events, return 202
        return reply.status(202).send({
          ok: true,
          accepted: 0,
          consented: false,
        });
      }

      // 4. Resolve or Generate 1:1 Pseudonymous analytics_id (P10F.01)
      let analyticsRecord = await prisma.analyticsId.findUnique({
        where: { player_id: player.id },
      });

      if (!analyticsRecord) {
        analyticsRecord = await prisma.analyticsId.create({
          data: {
            player_id: player.id,
            analytics_id: randomUUID(),
          },
        });
      }

      const { events, session_id } = req.body as EventsBatchRequest;
      const analyticsId = analyticsRecord.analytics_id;

      // 5. Ingest into events_raw (partitioned table)
      const recordsToInsert = events.map((evt) => ({
        id: randomUUID(),
        analytics_id: analyticsId,
        drop_date: new Date(`${evt.drop_date}T00:00:00.000Z`),
        event_name: evt.event_name,
        props: (evt.props ?? {}) as Prisma.InputJsonValue,
        session_id: session_id || null,
        created_at: evt.timestamp_ms ? new Date(evt.timestamp_ms) : new Date(),
      }));

      try {
        await prisma.eventRaw.createMany({
          data: recordsToInsert,
        });
      } catch (err) {
        req.log.warn({ err }, "Non-fatal error inserting events_raw batch");
      }

      return reply.status(202).send({
        ok: true,
        accepted: recordsToInsert.length,
        consented: true,
      });
    }
  );

  /**
   * GET /v1/consents
   * Retrieve active player consent settings (P10F.04).
   */
  app.get(
    "/v1/consents",
    {
      schema: {
        tags: ["DPDP Privacy"],
        summary: "Get current DPDP consent states for caller",
        response: {
          200: z.object({
            ok: z.boolean(),
            analytics: z.boolean(),
            personalisation: z.boolean(),
            policy_version: z.number().int(),
            analytics_id: z.string().nullable().optional(),
          }),
        },
      },
    },
    async (req, reply) => {
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.send({
          ok: true,
          analytics: false,
          personalisation: false,
          policy_version: 1,
          analytics_id: null,
        });
      }

      const consents = await prisma.consent.findMany({
        where: { player_id: player.id },
      });

      const analyticsConsent = consents.find((c) => c.purpose === "analytics");
      const personalisationConsent = consents.find((c) => c.purpose === "personalisation");

      const analyticsActive = Boolean(analyticsConsent && analyticsConsent.withdrawn_at === null);
      const personalisationActive = Boolean(
        personalisationConsent && personalisationConsent.withdrawn_at === null
      );

      const analyticsRecord = analyticsActive
        ? await prisma.analyticsId.findUnique({ where: { player_id: player.id } })
        : null;

      return reply.send({
        ok: true,
        analytics: analyticsActive,
        personalisation: personalisationActive,
        policy_version: analyticsConsent?.policy_version ?? 1,
        analytics_id: analyticsRecord?.analytics_id ?? null,
      });
    }
  );

  /**
   * PUT /v1/consents
   * Update a granular DPDP consent purpose (P10F.04).
   */
  app.put(
    "/v1/consents",
    {
      schema: {
        tags: ["DPDP Privacy"],
        summary: "Grant or withdraw granular DPDP consent",
        body: UpdateConsentRequestSchema,
        response: {
          200: z.object({
            ok: z.boolean(),
            purpose: z.string(),
            granted: z.boolean(),
          }),
          401: z.object({
            ok: z.boolean(),
            error: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const player = await resolveAuthenticatedPlayer(req);
      if (!player) {
        return reply.status(401).send({
          ok: false,
          error: "Authentication required to update consent preferences",
        });
      }

      const { purpose, granted, policy_version = 1 } = req.body as UpdateConsentRequest;
      const now = new Date();

      if (granted) {
        await prisma.consent.upsert({
          where: {
            player_purpose: {
              player_id: player.id,
              purpose,
            },
          },
          update: {
            withdrawn_at: null,
            policy_version,
            updated_at: now,
          },
          create: {
            id: randomUUID(),
            player_id: player.id,
            purpose,
            policy_version,
            granted_at: now,
            withdrawn_at: null,
          },
        });

        // Ensure analytics_id exists when analytics consent granted
        if (purpose === "analytics") {
          await prisma.analyticsId.upsert({
            where: { player_id: player.id },
            update: {},
            create: {
              player_id: player.id,
              analytics_id: randomUUID(),
            },
          });
        }
      } else {
        // Withdrawal
        await prisma.consent.upsert({
          where: {
            player_purpose: {
              player_id: player.id,
              purpose,
            },
          },
          update: {
            withdrawn_at: now,
            updated_at: now,
          },
          create: {
            id: randomUUID(),
            player_id: player.id,
            purpose,
            policy_version,
            granted_at: now,
            withdrawn_at: now,
          },
        });

        // Rule 13 hook: If personalisation consent is withdrawn, purge player_taste if exists
        if (purpose === "personalisation") {
          const aRec = await prisma.analyticsId.findUnique({
            where: { player_id: player.id },
          });
          if (aRec) {
            // Raw SQL safe delete in case player_taste table exists or is created
            try {
              await prisma.$executeRawUnsafe(
                `DO $$ BEGIN IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'player_taste') THEN EXECUTE 'DELETE FROM player_taste WHERE analytics_id = $1' USING $1; END IF; END $$;`,
                aRec.analytics_id
              );
            } catch {
              // Table not yet migrated in Phase 10F (M4 task)
            }
          }
        }
      }

      return reply.send({
        ok: true,
        purpose,
        granted,
      });
    }
  );
};

