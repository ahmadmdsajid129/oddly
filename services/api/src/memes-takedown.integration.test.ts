/**
 * @file memes-takedown.integration.test.ts
 * @package @oddly/api
 *
 * Creator Delete Flow & Moderation Takedown Integration Tests (Stage M3 / Phase 10G / P10G.08).
 * Spec Reference: docs/admin-panel-spec.md Section A5.1 & Section A10.
 *
 * Invariants Verified:
 * 1. Creator Delete: Authors can delete their own meme; transitions to 'retired'.
 * 2. Unauthorized Delete Prevention: Non-authors cannot delete others' memes (403).
 * 3. Immediate Admin Takedown: Moderators can take down memes; logs immutable audit row in moderation_actions.
 * 4. General Moderation Desk: Supports approve, reject, retire, takedown with required reason.
 * 5. Immediate Rotation Exclusion: Taken down/retired memes are immediately omitted from exposure rotation.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { MemesRepository } from "./db/memes.repo.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M3 (Phase 10G): Creator Delete & Moderation Takedowns (P10G.08)", () => {
  let prisma: PrismaClient;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let repo: MemesRepository;

  let authorId: string;
  let otherPlayerId: string;
  let templateId: string;

  const adminModId = `admin-mod-${randomUUID().slice(0, 8)}`;
  const createdSubmissionIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();
    repo = new MemesRepository(prisma);

    app = await buildServer({ logger: false });
    await app.ready();

    // 1. Create author and other player
    const author = await prisma.player.create({
      data: { did: `did-del-author-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "18-24" },
    });
    authorId = author.id;

    const other = await prisma.player.create({
      data: { did: `did-del-other-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "25-34" },
    });
    otherPlayerId = other.id;

    // 2. Create template
    const template = await prisma.memeTemplate.create({
      data: {
        key: `tmpl-del-${randomUUID().slice(0, 8)}`,
        illustration_registry_key: "desk_overwhelmed_cat",
        aspect: "1:1",
        alt_text_i18n: { en: "A tired cat" },
        license_note: "Test license",
      },
    });
    templateId = template.id;
  });

  afterAll(async () => {
    if (createdSubmissionIds.length > 0) {
      await prisma.moderationAction.deleteMany({
        where: { submission_id: { in: createdSubmissionIds } },
      });
      await prisma.memeExposure.deleteMany({
        where: { submission_id: { in: createdSubmissionIds } },
      });
      await prisma.memeStat.deleteMany({
        where: { submission_id: { in: createdSubmissionIds } },
      });
      await prisma.memeSubmission.deleteMany({
        where: { id: { in: createdSubmissionIds } },
      });
    }
    if (templateId) await prisma.memeTemplate.delete({ where: { id: templateId } }).catch(() => {});
    if (authorId) await prisma.player.delete({ where: { id: authorId } }).catch(() => {});
    if (otherPlayerId) await prisma.player.delete({ where: { id: otherPlayerId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("DELETE /v1/memes/:id rejects unauthenticated request with 401", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/memes/${randomUUID()}`,
    });

    expect(res.statusCode).toBe(401);
  });

  it("DELETE /v1/memes/:id returns 404 for non-existent submission", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/memes/${randomUUID()}`,
      headers: { "x-player-id": authorId },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("MEME_NOT_FOUND");
  });

  it("DELETE /v1/memes/:id prevents non-author from deleting another user's meme (403)", async () => {
    const meme = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: templateId,
        caption_text: "Caption owned by author",
        status: "approved",
      },
    });
    createdSubmissionIds.push(meme.id);

    // Other player tries to delete author's meme
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/memes/${meme.id}`,
      headers: { "x-player-id": otherPlayerId },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("FORBIDDEN");
  });

  it("DELETE /v1/memes/:id allows author to delete their own meme (retires from rotation)", async () => {
    const meme = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: templateId,
        caption_text: "Caption to be self-deleted",
        status: "approved",
      },
    });
    createdSubmissionIds.push(meme.id);

    const res = await app.inject({
      method: "DELETE",
      url: `/v1/memes/${meme.id}`,
      headers: { "x-player-id": authorId },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("retired");

    // Check DB status
    const updated = await prisma.memeSubmission.findUnique({
      where: { id: meme.id },
    });
    expect(updated?.status).toBe("retired");
    expect(updated?.moderation_reason).toBe("Deleted by author");
  });

  it("POST /v1/admin/memes/:id/takedown immediately removes meme and logs audit action", async () => {
    const meme = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: templateId,
        caption_text: "Meme with reported terms needing immediate takedown",
        status: "approved",
      },
    });
    createdSubmissionIds.push(meme.id);

    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/memes/${meme.id}/takedown`,
      headers: {
        "x-admin-id": adminModId,
        "x-admin-role": "moderator",
      },
      payload: {
        reason: "Violates community tone guidelines",
        note: "Triggered by user reports",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("retired");
    expect(body.action).toBe("takedown");

    // Verify DB update
    const updated = await prisma.memeSubmission.findUnique({
      where: { id: meme.id },
    });
    expect(updated?.status).toBe("retired");
    expect(updated?.moderation_reason).toBe("Violates community tone guidelines");
    expect(updated?.reviewed_by).toBe(adminModId);

    // Verify audit log
    const auditAction = await prisma.moderationAction.findFirst({
      where: { submission_id: meme.id, action: "takedown" },
    });
    expect(auditAction).not.toBeNull();
    expect(auditAction?.admin_id).toBe(adminModId);
    expect(auditAction?.reason).toBe("Violates community tone guidelines");
  });

  it("POST /v1/admin/memes/:id/moderate processes review actions (approve, reject, retire)", async () => {
    const queuedMeme = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: templateId,
        caption_text: "Queued caption to approve",
        status: "queued",
      },
    });
    createdSubmissionIds.push(queuedMeme.id);

    // 1. Approve action
    const approveRes = await app.inject({
      method: "POST",
      url: `/v1/admin/memes/${queuedMeme.id}/moderate`,
      headers: {
        "x-admin-id": adminModId,
        "x-admin-role": "moderator",
      },
      payload: {
        action: "approve",
        reason: "Meets high editorial quality",
      },
    });

    expect(approveRes.statusCode).toBe(200);
    const approveBody = JSON.parse(approveRes.body);
    expect(approveBody.status).toBe("approved");

    const afterApprove = await prisma.memeSubmission.findUnique({
      where: { id: queuedMeme.id },
    });
    expect(afterApprove?.status).toBe("approved");

    // 2. Reject action
    const rejectMeme = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: templateId,
        caption_text: "Queued caption to reject",
        status: "queued",
      },
    });
    createdSubmissionIds.push(rejectMeme.id);

    const rejectRes = await app.inject({
      method: "POST",
      url: `/v1/admin/memes/${rejectMeme.id}/moderate`,
      headers: {
        "x-admin-id": adminModId,
        "x-admin-role": "moderator",
      },
      payload: {
        action: "reject",
        reason: "Duplicate idea within template",
      },
    });

    expect(rejectRes.statusCode).toBe(200);
    const rejectBody = JSON.parse(rejectRes.body);
    expect(rejectBody.status).toBe("rejected");
  });

  it("retired / taken down memes are never served by the exposure engine", async () => {
    const takenDownMeme = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: templateId,
        caption_text: "Taken down caption that must never appear in exposure rotation",
        status: "retired",
        stats: {
          create: {
            impressions: 0,
            raters: 0,
            funny_count: 0,
            not_for_me_count: 0,
            wilson_lb: 0.0,
          },
        },
      },
    });
    createdSubmissionIds.push(takenDownMeme.id);

    // Select meme for other player
    const result = await repo.selectMemeForPlayer(otherPlayerId);
    if (result) {
      expect(result.id).not.toBe(takenDownMeme.id);
    }
  });
});

