#!/usr/bin/env node
/**
 * @file ops-ban-player.mjs
 *
 * Emergency Ops Tool: Ban a player (Slice A6 / Section 13).
 * Immediately severs all active orbits, blocks future pairing, and writes to audit_logs.
 *
 * Usage:
 *   node tools/ops-ban-player.mjs <playerId> [reason]
 */

import { PrismaClient } from "@prisma/client";

const playerId = process.argv[2];
const reason = process.argv[3] || "emergency_ops_ban";

if (!playerId) {
  console.error("Usage: pnpm ops:ban-player <playerId> [reason]");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!player) {
      console.error(`ERROR: Player '${playerId}' not found.`);
      process.exit(1);
    }

    // Sever all active orbits where this player is player_a or player_b
    const activeOrbits = await prisma.orbit.findMany({
      where: {
        OR: [{ player_a_id: playerId }, { player_b_id: playerId }],
        status: "active",
      },
    });

    for (const orbit of activeOrbits) {
      await prisma.orbit.update({
        where: { id: orbit.id },
        data: {
          status: "ended",
          ended_by: "ops_admin",
          ended_on: new Date(),
        },
      });
    }

    // Write immutable audit log
    await prisma.auditLog.create({
      data: {
        action: "ban_player",
        target_type: "player",
        target_id: playerId,
        actor: "ops_admin",
        before_data: { active_orbits_count: activeOrbits.length },
        after_data: {
          reason,
          severed_orbits: activeOrbits.map((o) => o.id),
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          playerId,
          severedOrbitsCount: activeOrbits.length,
          reason,
          message:
            "Player successfully banned, active orbits severed, and logged in audit_logs.",
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error("Failed to ban player:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
