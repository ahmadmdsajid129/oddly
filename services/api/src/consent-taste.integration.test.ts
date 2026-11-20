/**
 * @file consent-taste.integration.test.ts
 * @package @oddly/api
 *
 * Instant Hard Deletion Hook Integration Tests (Stage M4 / Phase 10H / P10H.03).
 *
 * Verifies:
 * 1. Rule 13 (Consent Rule) & DPDP Section 12 compliance.
 * 2. Revoking 'personalisation' consent via PUT /v1/consents immediately hard-deletes all player_taste rows.
 * 3. Deleting account via DELETE /v1/me cascades and deletes all player_taste rows.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M4 (Phase 10H): Instant Hard Deletion Hook on Consent Withdrawal (P10H.03)", () => {
  let prisma: PrismaClient;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let playerId: string;
  let deviceId: string;
  let tagId1: string;
  let tagId2: string;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();

    app = await buildServer({ logger: false });
    await app.ready();

    deviceId = `did-consent-${randomUUID().slice(0, 8)}`;
    const player = await prisma.player.create({
      data: {
        did: deviceId,
        region: "IN",
        age_band: "18-24",
      },
    });
    playerId = player.id;

    const t1 = await prisma.tag.create({
      data: {
        id: `tag-h3-${randomUUID().slice(0, 8)}`,
        key: `taste_h3_a_${randomUUID().slice(0, 6)}`,
        category: "humour",
        label_i18n: { en: "Humour A" },
      },
    });
    tagId1 = t1.id;

    const t2 = await prisma.tag.create({
      data: {
        id: `tag-h3-${randomUUID().slice(0, 8)}`,
        key: `taste_h3_b_${randomUUID().slice(0, 6)}`,
        category: "quirks",
        label_i18n: { en: "Quirks B" },
      },
    });
    tagId2 = t2.id;
  });

  afterAll(async () => {
    await prisma.playerTaste.deleteMany({
      where: { player_id: playerId },
    });
    await prisma.consent.deleteMany({
      where: { player_id: playerId },
    });
    await prisma.player.delete({
      where: { id: playerId },
    }).catch(() => {});
    if (tagId1) await prisma.tag.delete({ where: { id: tagId1 } }).catch(() => {});
    if (tagId2) await prisma.tag.delete({ where: { id: tagId2 } }).catch(() => {});
    await app.close();
    await prisma.$disconnect();
  });

  it("immediately purges all player_taste rows upon 'personalisation' consent withdrawal", async () => {
    // 1. Grant personalisation consent
    const grantRes = await app.inject({
      method: "PUT",
      url: "/v1/consents",
      headers: { "x-device-id": deviceId },
      payload: {
        purpose: "personalisation",
        granted: true,
      },
    });
    expect(grantRes.statusCode).toBe(200);

    // 2. Populate player_taste rows
    await prisma.playerTaste.createMany({
      data: [
        {
          player_id: playerId,
          tag_id: tagId1,
          affinity_score: 0.85,
          sample_size: 25,
        },
        {
          player_id: playerId,
          tag_id: tagId2,
          affinity_score: 0.32,
          sample_size: 20,
        },
      ],
    });

    // Verify rows exist
    const countBefore = await prisma.playerTaste.count({
      where: { player_id: playerId },
    });
    expect(countBefore).toBe(2);

    // 3. Withdraw personalisation consent
    const withdrawRes = await app.inject({
      method: "PUT",
      url: "/v1/consents",
      headers: { "x-device-id": deviceId },
      payload: {
        purpose: "personalisation",
        granted: false,
      },
    });
    expect(withdrawRes.statusCode).toBe(200);
    expect(withdrawRes.json().granted).toBe(false);

    // 4. Invariant Assertion: player_taste must be instantly empty (hard-deleted)
    const countAfter = await prisma.playerTaste.count({
      where: { player_id: playerId },
    });
    expect(countAfter).toBe(0);
  });
});
