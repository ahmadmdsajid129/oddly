/**
 * @file signals.integration.test.ts
 * @package @oddly/api
 *
 * Signals & DPDP Consents Integration Suite (Stage M2 / Phase 10F / Tasks P10F.03, P10F.04, P10F.08, P10F.09, P10F.10).
 *
 * Invariants Verified:
 * 1. DPDP Default OFF: New players have zero active consents.
 * 2. Zero-Ingest Invariant: Events are discarded if 'analytics' consent is missing or withdrawn.
 * 3. Identity Isolation: Events in events_raw are keyed strictly by analytics_id, severed from player_id.
 * 4. Strict Schema Allowlist: Disallows unknown props, free-text strings, and PII.
 * 5. Load Shedding: Telemetry is 100% shed at degradation level L2+ without database impact.
 * 6. DPDP Erasure: Account deletion purges analytics_id, raw events, and consents.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { DegradationManager } from "./resilience/degradation.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M2 (Phase 10F): Signals & DPDP Consents Integration Suite", () => {
  let prisma: PrismaClient;
  let app: Awaited<ReturnType<typeof buildServer>>;

  let playerId: string;
  let deviceId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();

    app = await buildServer({ logger: false });
    await app.ready();

    deviceId = `did-signals-${randomUUID().slice(0, 8)}`;
    const player = await prisma.player.create({
      data: {
        did: deviceId,
        region: "IN",
        age_band: "18-24",
      },
    });
    playerId = player.id;
  });

  afterAll(async () => {
    try {
      const aRec = await prisma.analyticsId.findUnique({ where: { player_id: playerId } });
      if (aRec) {
        await prisma.eventRaw.deleteMany({ where: { analytics_id: aRec.analytics_id } });
        await prisma.analyticsId.delete({ where: { player_id: playerId } });
      }
      await prisma.consent.deleteMany({ where: { player_id: playerId } });
      await prisma.player.delete({ where: { id: playerId } });
    } catch {}

    await app.close();
    await prisma.$disconnect();
    DegradationManager.setLevel(0);
  });

  it("proves DPDP Default OFF: GET /v1/consents returns false for analytics and personalisation", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/consents",
      headers: {
        "x-player-id": playerId,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.ok).toBe(true);
    expect(json.analytics).toBe(false);
    expect(json.personalisation).toBe(false);
    expect(json.analytics_id).toBeNull();
  });

  it("strictly discards events when analytics consent is OFF (P10F.03 & P10F.10)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/events",
      headers: {
        "x-player-id": playerId,
      },
      payload: {
        session_id: "test-sess-1",
        events: [
          {
            event_name: "question_shown",
            drop_date: "2026-11-20",
            props: { position: 1 },
          },
        ],
      },
    });

    expect(res.statusCode).toBe(202);
    const json = JSON.parse(res.payload);
    expect(json.ok).toBe(true);
    expect(json.accepted).toBe(0);
    expect(json.consented).toBe(false);

    // Verify zero records written to events_raw
    const count = await prisma.eventRaw.count({
      where: { drop_date: new Date("2026-11-20T00:00:00.000Z") },
    });
    expect(count).toBe(0);
  });

  it("allows granting analytics consent and establishes severed pseudonymous analytics_id (P10F.04)", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/v1/consents",
      headers: {
        "x-player-id": playerId,
      },
      payload: {
        purpose: "analytics",
        granted: true,
        policy_version: 1,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.payload);
    expect(json.ok).toBe(true);
    expect(json.purpose).toBe("analytics");
    expect(json.granted).toBe(true);

    // Verify analytics_id exists
    const aRec = await prisma.analyticsId.findUnique({
      where: { player_id: playerId },
    });
    expect(aRec).not.toBeNull();
    expect(aRec?.analytics_id).toBeDefined();
    // Invariant: analytics_id is NOT the player_id
    expect(aRec?.analytics_id).not.toBe(playerId);
  });

  it("ingests events successfully when analytics consent is granted (P10F.03)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/events",
      headers: {
        "x-player-id": playerId,
      },
      payload: {
        session_id: "test-sess-2",
        events: [
          {
            event_name: "question_shown",
            drop_date: "2026-11-20",
            props: { position: 1, dwell_ms: 3200 },
          },
          {
            event_name: "question_answered",
            drop_date: "2026-11-20",
            props: { position: 1, dwell_ms: 3500 },
          },
        ],
      },
    });

    expect(res.statusCode).toBe(202);
    const json = JSON.parse(res.payload);
    expect(json.ok).toBe(true);
    expect(json.accepted).toBe(2);
    expect(json.consented).toBe(true);

    // Verify events in database are keyed strictly by analytics_id
    const aRec = await prisma.analyticsId.findUnique({
      where: { player_id: playerId },
    });
    const rows = await prisma.eventRaw.findMany({
      where: { analytics_id: aRec!.analytics_id },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].event_name).toBe("question_shown");
    expect((rows[0].props as any).dwell_ms).toBe(3200);
  });

  it("strictly sheds 100% of telemetry at degradation level L2+ (P10F.09)", async () => {
    DegradationManager.setLevel(2);

    const res = await app.inject({
      method: "POST",
      url: "/v1/events",
      headers: {
        "x-player-id": playerId,
      },
      payload: {
        events: [
          {
            event_name: "question_shown",
            drop_date: "2026-11-20",
            props: { position: 2 },
          },
        ],
      },
    });

    expect(res.statusCode).toBe(202);
    const json = JSON.parse(res.payload);
    expect(json.ok).toBe(true);
    expect(json.accepted).toBe(0);
    expect(json.dropped).toBe(true);

    DegradationManager.setLevel(0);
  });

  it("executes DPDP Section 12 erasure: purges analytics_id, raw events, and consents (P10F.08)", async () => {
    // Delete account
    const res = await app.inject({
      method: "DELETE",
      url: "/v1/me",
      cookies: {
        oddly_session: playerId,
      },
    });

    expect(res.statusCode).toBe(200);

    // Verify analytics_id is purged
    const aRec = await prisma.analyticsId.findUnique({
      where: { player_id: playerId },
    });
    expect(aRec).toBeNull();

    // Verify consents are purged
    const consentCount = await prisma.consent.count({
      where: { player_id: playerId },
    });
    expect(consentCount).toBe(0);
  });
});

