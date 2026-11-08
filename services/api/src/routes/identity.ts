/**
 * @file identity.ts
 * @package @oddly/api
 *
 * Guest identity creation and session cookie issuance (P3.04).
 * Zero-friction onboarding: players can play immediately as guests (F1).
 */

import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { calculateStreak, getTwinDay } from "@oddly/shared";
import { PlayersRepository } from "../db/players.repo.js";

export const identityRoutes: FastifyPluginAsyncZod = async (app) => {

  // POST /v1/identity/guest — initialize or refresh guest identity
  app.post<{ Body: { did: string; region: string; age_band: string } }>(
    "/v1/identity/guest",
    {
      schema: {
        description: "Register or verify a guest device identity",
        tags: ["Identity"],
        body: z.object({
          did: z.string().min(16).max(128),
          region: z.string().min(2).max(10).default("IN"),
          age_band: z.string().min(3).max(10).default("18-24"),
        }),
        response: {
          200: z.object({
            player_id: z.string(),
            did: z.string(),
            region: z.string(),
            age_band: z.string(),
            streak: z.number(),
          }),
        },
      },
    },
    async (req, reply) => {
      const { did, region, age_band } = req.body;

      const player = await PlayersRepository.upsertGuest(did, region, age_band);
      const submissionDates = await PlayersRepository.getPlayerSubmissionDates(player.id);
      const streak = calculateStreak(submissionDates, getTwinDay(new Date()));

      // Issue HTTP-only signed cookies for session persistence
      reply.setCookie("oddly_did", player.did, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60, // 1 year
        signed: true,
      });

      reply.setCookie("oddly_at", player.id, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60,
        signed: true,
      });

      return {
        player_id: player.id,
        did: player.did,
        region: player.region,
        age_band: player.age_band,
        streak,
      };
    }
  );

  // GET /v1/me — fetch player profile and streak from session cookie
  app.get(
    "/v1/me",
    {
      schema: {
        description: "Fetch active player profile and streak",
        tags: ["Identity"],
        response: {
          200: z.object({
            authenticated: z.boolean(),
            player_id: z.string().nullable(),
            streak: z.number(),
          }),
        },
      },
    },
    async (req) => {
      const rawCookie = req.cookies.oddly_at;
      if (!rawCookie) {
        return {
          authenticated: false,
          player_id: null,
          streak: 0,
        };
      }

      const unsigned = req.unsignCookie(rawCookie);
      const playerId = (unsigned.valid ? unsigned.value : rawCookie) ?? "";

      if (!playerId) {
        return {
          authenticated: false,
          player_id: null,
          streak: 0,
        };
      }

      const player = await PlayersRepository.getById(playerId);
      if (!player) {
        return {
          authenticated: false,
          player_id: null,
          streak: 0,
        };
      }

      const submissionDates = await PlayersRepository.getPlayerSubmissionDates(player.id);
      const streak = calculateStreak(submissionDates, getTwinDay(new Date()));

      return {
        authenticated: true,
        player_id: player.id,
        streak,
      };
    }
  );
};

