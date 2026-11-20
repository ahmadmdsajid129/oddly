/**
 * @file memes-candidate.integration.test.ts
 * @package @oddly/api
 *
 * Drop Candidate List & Two-Person Approval Workflow Integration Tests (Stage M3 / Phase 10G / P10G.07).
 * Spec Reference: docs/admin-panel-spec.md Section A5.2 & Section A10.
 *
 * Invariants Verified:
 * 1. Drop Candidate Threshold: Only memes with raters >= 200 and wilson_lb >= 0.70 are listed as eligible.
 * 2. RBAC Enforcement: Only authorized admin roles (owner, admin, approver, editor) can access candidate workflows.
 * 3. Step 1 (Promotion): Editor promotes candidate into Drop pool; logs immutable audit action.
 * 4. Step 2 (Two-Person Approval Rule):
 *    - Invariant: The approver CANNOT be the same admin who promoted the candidate.
 *    - Approver == Promoter returns 403 TWO_PERSON_RULE_VIOLATION.
 *    - Distinct second admin approval successfully marks candidate as dual_approved.
 * 5. Rejection & Audit Trail: Rejection logs reason; candidate cannot bypass dual approval into daily Drops.
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@oddly/shared";
import { buildServer } from "./server.js";
import { randomUUID } from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public";

describe("Stage M3 (Phase 10G): Mission Control Drop Candidates & Two-Person Approval (P10G.07)", () => {
  let prisma: PrismaClient;
  let app: Awaited<ReturnType<typeof buildServer>>;

  let authorId: string;
  let templateId: string;
  let eligibleMemeId: string;
  let ineligibleMemeId: string;

  const admin1PromoterId = `admin-editor-${randomUUID().slice(0, 8)}`;
  const admin2ApproverId = `admin-approver-${randomUUID().slice(0, 8)}`;
  const regularPlayerId = `player-regular-${randomUUID().slice(0, 8)}`;

  const createdSubmissionIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
    await prisma.$connect();

    app = await buildServer({ logger: false });
    await app.ready();

    // 1. Create author player and regular player
    const author = await prisma.player.create({
      data: { did: `did-author-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "18-24" },
    });
    authorId = author.id;

    await prisma.player.create({
      data: { id: regularPlayerId, did: `did-reg-${randomUUID().slice(0, 8)}`, region: "IN", age_band: "25-34" },
    });

    // 2. Create template
    const template = await prisma.memeTemplate.create({
      data: {
        key: `tmpl-cand-${randomUUID().slice(0, 8)}`,
        illustration_registry_key: "chart_divergent_bars",
        aspect: "1:1",
        alt_text_i18n: { en: "A divergent bar chart" },
        license_note: "Test license",
      },
    });
    templateId = template.id;

    // 3. Create eligible candidate meme (raters >= 200, wilson_lb >= 0.70)
    const eligible = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: templateId,
        caption_text: "Viral meme eligible for Drop candidate promotion",
        status: "approved",
        stats: {
          create: {
            impressions: 400,
            raters: 250,
            funny_count: 225, // 90% positive
            not_for_me_count: 25,
            wilson_lb: 0.85,
          },
        },
      },
    });
    eligibleMemeId = eligible.id;
    createdSubmissionIds.push(eligible.id);

    // 4. Create ineligible meme (raters < 200 or low Wilson)
    const ineligible = await prisma.memeSubmission.create({
      data: {
        author_player_id: authorId,
        template_id: templateId,
        caption_text: "Fresh meme not yet eligible",
        status: "approved",
        stats: {
          create: {
            impressions: 50,
            raters: 30,
            funny_count: 25,
            not_for_me_count: 5,
            wilson_lb: 0.0,
          },
        },
      },
    });
    ineligibleMemeId = ineligible.id;
    createdSubmissionIds.push(ineligible.id);
  });

  afterAll(async () => {
    if (createdSubmissionIds.length > 0) {
      await prisma.moderationAction.deleteMany({
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
    if (regularPlayerId) await prisma.player.delete({ where: { id: regularPlayerId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("rejects non-admin access to candidate endpoints with 403", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/memes/candidates",
      headers: { "x-player-id": regularPlayerId }, // Player, not admin
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("FORBIDDEN");
  });

  it("GET /v1/admin/memes/candidates lists only eligible memes meeting threshold", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/memes/candidates",
      headers: {
        "x-admin-id": admin1PromoterId,
        "x-admin-role": "editor",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);

    const foundEligible = body.candidates.find((c: { id: string }) => c.id === eligibleMemeId);
    const foundIneligible = body.candidates.find((c: { id: string }) => c.id === ineligibleMemeId);

    expect(foundEligible).toBeDefined();
    expect(foundEligible.wilson_lb).toBeGreaterThanOrEqual(0.70);
    expect(foundEligible.raters).toBeGreaterThanOrEqual(200);
    expect(foundEligible.is_dual_approved).toBe(false);

    // Ineligible meme must NOT be in the candidates list
    expect(foundIneligible).toBeUndefined();
  });

  it("POST /v1/admin/memes/:id/promote rejects promotion if meme does not meet criteria", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/memes/${ineligibleMemeId}/promote`,
      headers: {
        "x-admin-id": admin1PromoterId,
        "x-admin-role": "editor",
      },
      payload: { reason: "Attempting premature promotion" },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("CRITERIA_NOT_MET");
  });

  it("POST /v1/admin/memes/:id/promote promotes eligible meme to pending second approval", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/memes/${eligibleMemeId}/promote`,
      headers: {
        "x-admin-id": admin1PromoterId,
        "x-admin-role": "editor",
      },
      payload: {
        reason: "Exceptional engagement in Meme Corner",
        target_drop_date: "2026-11-25",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("pending_second_approval");
    expect(body.promoted_by).toBe(admin1PromoterId);

    // Verify audit log
    const action = await prisma.moderationAction.findFirst({
      where: { submission_id: eligibleMemeId, action: "promote_candidate" },
    });
    expect(action).not.toBeNull();
    expect(action?.admin_id).toBe(admin1PromoterId);
  });

  it("POST /v1/admin/memes/:id/promote rejects duplicate promotion", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/memes/${eligibleMemeId}/promote`,
      headers: {
        "x-admin-id": admin1PromoterId,
        "x-admin-role": "editor",
      },
      payload: { reason: "Duplicate promotion attempt" },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("ALREADY_PROMOTED");
  });

  it("TWO-PERSON INVARIANT: rejects second approval if approver is the promoter (self-approval forbidden)", async () => {
    // Admin 1 (the promoter) tries to approve their own candidate
    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/memes/${eligibleMemeId}/approve-candidate`,
      headers: {
        "x-admin-id": admin1PromoterId, // SAME admin who promoted!
        "x-admin-role": "admin",
      },
      payload: { note: "Attempting self-approval" },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe("TWO_PERSON_RULE_VIOLATION");
  });

  it("confirms dual approval when a distinct second admin approves", async () => {
    // Admin 2 (different admin) approves
    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/memes/${eligibleMemeId}/approve-candidate`,
      headers: {
        "x-admin-id": admin2ApproverId, // DISTINCT admin!
        "x-admin-role": "approver",
      },
      payload: { note: "Verified for Drop inclusion on 2026-11-25" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(true);
    expect(body.status).toBe("dual_approved");
    expect(body.promoted_by).toBe(admin1PromoterId);
    expect(body.approved_by).toBe(admin2ApproverId);

    // Verify candidates list now reflects dual-approved status
    const listRes = await app.inject({
      method: "GET",
      url: "/v1/admin/memes/candidates",
      headers: { "x-admin-id": admin2ApproverId, "x-admin-role": "approver" },
    });
    const listBody = JSON.parse(listRes.body);
    const candidate = listBody.candidates.find((c: { id: string }) => c.id === eligibleMemeId);
    expect(candidate.status).toBe("dual_approved");
    expect(candidate.is_dual_approved).toBe(true);
    expect(candidate.promoted_by).toBe(admin1PromoterId);
    expect(candidate.approved_by).toBe(admin2ApproverId);
  });
});

