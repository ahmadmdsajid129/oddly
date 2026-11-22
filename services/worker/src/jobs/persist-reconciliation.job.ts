/**
 * @file persist-reconciliation.job.ts
 * @package @oddly/worker
 *
 * Mode B Persistence Reconciliation Job (Task P3.16, ADR 012).
 * Verifies 100% parity between acknowledged request IDs and stored database rows.
 * Automatically re-enqueues any missing items from durable Redis backup.
 */

import { Redis } from "ioredis";
import { prisma } from "../db.js";
import { modeBReconciledTotal } from "../metrics.js";

export interface ReconciliationReport {
  drop_id: string;
  acknowledged_count: number;
  persisted_count: number;
  parity_percentage: number;
  missing_count: number;
  re_enqueued_count: number;
  reconciled: boolean;
}

export class PersistReconciliationJob {
  /**
   * Executes reconciliation for a drop, auditing acknowledged request IDs against the database.
   */
  static async reconcile(dropId: string, redisClient: Redis): Promise<ReconciliationReport> {
    const acknowledgedKey = `drop:${dropId}:acknowledged_requests`;
    const persistedKey = `drop:${dropId}:persisted_requests`;

    // 1. Fetch acknowledged request IDs from Redis
    const acknowledgedIds = await redisClient.smembers(acknowledgedKey);

    // 2. Fetch persisted request IDs from Redis set & Database
    const redisPersistedIds = new Set(await redisClient.smembers(persistedKey));
    const dbSubmissions = await prisma.submission.findMany({
      where: { drop_id: dropId },
      select: { request_id: true },
    });
    for (const sub of dbSubmissions) {
      if (sub.request_id) {
        redisPersistedIds.add(sub.request_id);
      }
    }

    // 3. Find any missing IDs
    const missingIds: string[] = [];
    for (const ackId of acknowledgedIds) {
      if (!redisPersistedIds.has(ackId)) {
        missingIds.push(ackId);
      }
    }

    // 4. Recover missing IDs from durable payload backup
    let reEnqueued = 0;
    for (const missingId of missingIds) {
      const payloadRaw = await redisClient.get(`submission:payload:${missingId}`);
      if (payloadRaw) {
        await redisClient.lpush("oddly:queue:submit-persist", payloadRaw);
        reEnqueued++;
        try {
          modeBReconciledTotal.inc({ status: "recovered" });
        } catch {}
      }
    }

    const acknowledgedCount = acknowledgedIds.length;
    const persistedCount = redisPersistedIds.size;
    const parityPercentage =
      acknowledgedCount === 0 ? 100 : Math.min(100, (persistedCount / acknowledgedCount) * 100);

    try {
      modeBReconciledTotal.inc({ status: missingIds.length === 0 ? "matched" : "missing" });
    } catch {}

    return {
      drop_id: dropId,
      acknowledged_count: acknowledgedCount,
      persisted_count: persistedCount,
      parity_percentage: parityPercentage,
      missing_count: missingIds.length,
      re_enqueued_count: reEnqueued,
      reconciled: missingIds.length === 0,
    };
  }
}
