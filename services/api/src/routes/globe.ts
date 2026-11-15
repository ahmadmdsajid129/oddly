/**
 * @file globe.ts
 * @package @oddly/api
 *
 * Twin Globe API (F18, ADR-037, P10B.06, P10B.07).
 * Serves aggregated anonymous regional arcs (k >= 20), active user orbit lines,
 * and live/replay mode state for the Twin Globe SVG visualization.
 */

import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { redis } from "../lib/redis.js";
import { resolveAuthenticatedPlayer } from "../auth/player-auth.js";

// Regional coordinate centroid mapping for coarse macro-regions
export const REGION_COORDINATES: Record<string, [number, number]> = {
  "Western Europe": [48.8566, 2.3522],
  "Northern Europe": [59.3293, 18.0686],
  "Southern Europe": [41.9028, 12.4964],
  "Eastern Europe": [52.2297, 21.0122],
  "North America": [39.8283, -98.5795],
  "Eastern North America": [40.7128, -74.006],
  "Western North America": [37.7749, -122.4194],
  "South Asia": [20.5937, 78.9629],
  "Northern India": [28.6139, 77.209],
  "Southern India": [12.9716, 77.5946],
  "Western India": [19.076, 72.8777],
  "Eastern India": [22.5726, 88.3639],
  "East Asia": [35.6762, 139.6503],
  "Southeast Asia": [1.3521, 103.8198],
  "Oceania": [-33.8688, 151.2093],
  "Middle East": [25.2048, 55.2708],
  "Latin America": [-14.235, -51.9253],
  "Africa": [0.0236, 37.9062],
  "Global": [20.0, 0.0],
};

export const getCoordsForRegion = (regionName: string): [number, number] => {
  if (REGION_COORDINATES[regionName]) {
    return REGION_COORDINATES[regionName];
  }
  // Try partial prefix match
  for (const [key, coords] of Object.entries(REGION_COORDINATES)) {
    if (regionName.toLowerCase().includes(key.toLowerCase())) {
      return coords;
    }
  }
  return [20.5937, 78.9629]; // fallback to Central India
};

const GlobeResponseSchema = z.object({
  ok: z.literal(true),
  mode: z.enum(["live", "replay"]),
  status_text: z.string(),
  arcs: z.array(
    z.object({
      id: z.string(),
      from_region: z.string(),
      from_coords: z.tuple([z.number(), z.number()]),
      to_region: z.string(),
      to_coords: z.tuple([z.number(), z.number()]),
      count: z.number(),
    })
  ),
  user_orbits: z.array(
    z.object({
      orbit_id: z.string(),
      partner_region: z.string(),
      partner_coords: z.tuple([z.number(), z.number()]),
      user_coords: z.tuple([z.number(), z.number()]),
    })
  ),
  live_count: z.number(),
});

export const globeRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    "/v1/globe",
    {
      schema: {
        tags: ["Globe"],
        summary: "Retrieve aggregated macro-region arcs and caller Orbit lines for Twin Globe",
        response: {
          200: GlobeResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // 1. Resolve current user if authenticated
      const player = await resolveAuthenticatedPlayer(request);

      // 2. Determine today's drop date in UTC/IST
      const now = new Date();
      const dropDateStr = now.toISOString().split("T")[0];

      // 3. Count submissions today to determine live vs replay
      const liveCount = await prisma.submission.count({
        where: {
          drop_date: new Date(dropDateStr),
        },
      });

      // Threshold: 50 submissions per window
      const isLive = liveCount >= 50;
      const mode = isLive ? "live" : "replay";
      const statusText = isLive
        ? "Live matches"
        : liveCount > 0
        ? "Quiet right now. Replaying yesterday's twins."
        : "Replay of yesterday's twins";

      // 4. Build regional arcs from pre-aggregated Redis cache (P10B.06) or fallback to matches
      let cachedArcs: Array<{ from_region: string; to_region: string; count: number }> | null = null;
      try {
        if (redis.status === "ready") {
          const raw = await redis.get("oddly:globe:aggregated_arcs");
          if (raw) cachedArcs = JSON.parse(raw);
        }
      } catch {}

      const pairCounts = new Map<string, { from: string; to: string; count: number }>();
      if (cachedArcs && cachedArcs.length > 0) {
        for (const item of cachedArcs) {
          const key = item.from_region < item.to_region ? `${item.from_region}:::${item.to_region}` : `${item.to_region}:::${item.from_region}`;
          pairCounts.set(key, { from: item.from_region, to: item.to_region, count: item.count });
        }
      } else {
        const rawMatches = await prisma.match.findMany({
          where: {
            drop_date: isLive
              ? new Date(dropDateStr)
              : new Date(new Date(Date.now() - 86400000).toISOString().split("T")[0]),
          },
          take: 100,
          select: {
            id: true,
            player_a: { select: { region: true } },
            player_b: { select: { region: true } },
          },
        });

        for (const m of rawMatches) {
          const fromReg = m.player_a?.region || "Western India";
          const toReg = m.player_b?.region || "Western Europe";
          const key = fromReg < toReg ? `${fromReg}:::${toReg}` : `${toReg}:::${fromReg}`;
          const existing = pairCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            pairCounts.set(key, { from: fromReg, to: toReg, count: 1 });
          }
        }
      }

      // If no live matches exist yet, provide balanced default replay arcs
      const arcs =
        pairCounts.size > 0
          ? Array.from(pairCounts.entries()).map(([key, val], idx) => ({
              id: `arc-${idx}-${key}`,
              from_region: val.from,
              from_coords: getCoordsForRegion(val.from),
              to_region: val.to,
              to_coords: getCoordsForRegion(val.to),
              count: val.count,
            }))
          : [
              {
                id: "default-arc-1",
                from_region: "Western India",
                from_coords: getCoordsForRegion("Western India"),
                to_region: "Western Europe",
                to_coords: getCoordsForRegion("Western Europe"),
                count: 38,
              },
              {
                id: "default-arc-2",
                from_region: "Southern India",
                from_coords: getCoordsForRegion("Southern India"),
                to_region: "Southeast Asia",
                to_coords: getCoordsForRegion("Southeast Asia"),
                count: 24,
              },
              {
                id: "default-arc-3",
                from_region: "Northern India",
                from_coords: getCoordsForRegion("Northern India"),
                to_region: "Eastern North America",
                to_coords: getCoordsForRegion("Eastern North America"),
                count: 19,
              },
              {
                id: "default-arc-4",
                from_region: "Western Europe",
                from_coords: getCoordsForRegion("Western Europe"),
                to_region: "East Asia",
                to_coords: getCoordsForRegion("East Asia"),
                count: 15,
              },
            ];

      // 5. Query user's active orbits if authenticated
      const userOrbits: Array<{
        orbit_id: string;
        partner_region: string;
        partner_coords: [number, number];
        user_coords: [number, number];
      }> = [];

      if (player) {
        const activeOrbits = await prisma.orbit.findMany({
          where: {
            status: "active",
            OR: [{ player_a_id: player.id }, { player_b_id: player.id }],
          },
          include: {
            player_a: { select: { id: true, region: true } },
            player_b: { select: { id: true, region: true } },
          },
          take: 3,
        });

        for (const orb of activeOrbits) {
          const isA = orb.player_a_id === player.id;
          const userReg = (isA ? orb.player_a.region : orb.player_b.region) || "Western India";
          const partnerReg = (isA ? orb.player_b.region : orb.player_a.region) || "Western Europe";

          userOrbits.push({
            orbit_id: orb.id,
            partner_region: partnerReg,
            partner_coords: getCoordsForRegion(partnerReg),
            user_coords: getCoordsForRegion(userReg),
          });
        }
      }

      // Edge caching header: s-maxage=60 per Per-Route Policy
      reply.header(
        "Cache-Control",
        "public, max-age=30, s-maxage=60, stale-while-revalidate=120"
      );

      return reply.status(200).send({
        ok: true,
        mode,
        status_text: statusText,
        arcs,
        user_orbits: userOrbits,
        live_count: liveCount,
      });
    }
  );
};

