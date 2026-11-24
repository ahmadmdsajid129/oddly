#!/usr/bin/env node
/**
 * @file ops-sever-orbit.mjs
 *
 * Emergency Ops Tool: Sever an active Orbit (Slice A6 / Section 13).
 * Immediately marks orbit status = 'severed' and records an immutable audit log.
 *
 * Usage:
 *   node tools/ops-sever-orbit.mjs <orbitId> [reason]
 */

import { PrismaClient } from "@prisma/client";

const orbitId = process.argv[2];
const reason = process.argv[3] || "emergency_ops_action";

if (!orbitId) {
  console.error("Usage: pnpm ops:sever-orbit <orbitId> [reason]");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  try {
    const orbit = await prisma.orbit.findUnique({
      where: { id: orbitId },
    });

    if (!orbit) {
      console.error(`ERROR: Orbit '${orbitId}' not found.`);
      process.exit(1);
    }

    const beforeStatus = orbit.status;

    const updated = await prisma.orbit.update({
      where: { id: orbitId },
      data: {
        status: "ended",
        ended_by: "ops_admin",
        ended_on: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "sever_orbit",
        target_type: "orbit",
        target_id: orbitId,
        actor: "ops_admin",
        before_data: { status: beforeStatus },
        after_data: { status: "ended", reason, timestamp: new Date().toISOString() },
      },
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          orbitId,
          previousStatus: beforeStatus,
          newStatus: updated.status,
          reason,
          message: "Orbit successfully severed and logged in audit_logs.",
        },
        null,
        2
      )
    );
  } catch (err) {
    console.error("Failed to sever orbit:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
