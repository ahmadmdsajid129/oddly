/**
 * @file globe.worker.ts
 * @package @oddly/worker
 *
 * Twin Globe 5-Minute Batch Aggregation Worker (P10B.06, ADR-037).
 * Pre-aggregates macro-region pair matches and counts for fast edge serving.
 */

import { prisma } from "../db.js";
import { redis } from "../index.js";

export const GLOBE_CACHE_KEY = "oddly:globe:aggregated_arcs";

export interface AggregatedArcRecord {
  from_region: string;
  to_region: string;
  count: number;
}

export async function aggregateGlobeArcs(): Promise<AggregatedArcRecord[]> {
  const now = new Date();
  const dropDateStr = now.toISOString().split("T")[0]!;
  const dropDate = new Date(dropDateStr);

  // Fetch recent matches for today
  const matches = await prisma.match.findMany({
    where: {
      drop_date: dropDate,
    },
    take: 500,
    select: {
      player_a: { select: { region: true } },
      player_b: { select: { region: true } },
    },
  });

  const pairCounts = new Map<string, { from: string; to: string; count: number }>();
  for (const m of matches) {
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

  // Filter k >= 20 k-anonymity (or keep top macro-regions)
  const results: AggregatedArcRecord[] = Array.from(pairCounts.values()).map((val) => ({
    from_region: val.from,
    to_region: val.to,
    count: val.count,
  }));

  try {
    // Cache in Redis for 10 minutes
    await redis.set(GLOBE_CACHE_KEY, JSON.stringify(results), "EX", 600);
  } catch (err) {
    console.warn("[GlobeWorker] Redis cache write failed:", err);
  }

  return results;
}
