/**
 * @file auth.test.ts
 * @package @oddly/api
 *
 * Comprehensive integration test suite for Oddly Authentication (P7.08).
 * Covers:
 *   - JWT token creation, verification, and tamper rejection (P7.01)
 *   - Turnstile bot verification check (P7.06)
 *   - Google OAuth registration and session cookies (P7.02)
 *   - DPDP privacy audit: zero plaintext email storage (P7.02)
 *   - Guest session merge and streak recalculation (P7.04)
 *   - Session inspection and logout cookie revocation (P7.05)
 *   - Phone OTP stub interface (P7.09)
 */

import { beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "./server.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./auth/tokens.js";
import { verifyTurnstileToken } from "./auth/turnstile.js";
import { AccountsRepository } from "./db/accounts.repo.js";
import crypto from "node:crypto";

describe("Stage 7: Authentication & Login Integration Tests (P7.01 – P7.09)", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  describe("P7.01: JWT Token Infrastructure", () => {
    it("signs and verifies valid access tokens", async () => {
      const accountId = "acc_test_" + Date.now();
      const token = await signAccessToken({
        accountId,
        emailHash: "mock_sha256_hash",
        displayName: "TokenTester",
      });

      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      const payload = await verifyAccessToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.accountId).toBe(accountId);
      expect(payload?.displayName).toBe("TokenTester");
    });

    it("signs valid 30-day rotating refresh tokens", async () => {
      const accountId = "acc_refresh_" + Date.now();
      const token = await signRefreshToken({ accountId, tokenVersion: 1 });

      expect(typeof token).toBe("string");
      const payload = await verifyRefreshToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.accountId).toBe(accountId);
      expect(payload?.tokenVersion).toBe(1);
    });

    it("rejects tampered tokens", async () => {
      const token = await signAccessToken({
        accountId: "acc_real",
        emailHash: "hash123",
        displayName: "Alice",
      });
      const tampered = token.slice(0, -6) + "xxxxxx";

      const payload = await verifyAccessToken(tampered);
      expect(payload).toBeNull();
    });
  });

  describe("P7.06: Cloudflare Turnstile Bot Defense", () => {
    it("accepts dev bypass token or environment bypass in non-production", async () => {
      const res = await verifyTurnstileToken("dev-bypass-turnstile", "127.0.0.1");
      expect(res.success).toBe(true);
    });

    it("rejects explicitly invalid token when simulated", async () => {
      const res = await verifyTurnstileToken("invalid_bot_token_fail", "127.0.0.1");
      expect(res.success).toBe(false);
    });
  });

  describe("P7.02 & P7.07: Google OAuth Endpoint & DPDP Privacy Audit", () => {
    const testSubId = `sub_${Date.now()}`;
    let authCookies: string[] = [];
    let createdAccountId = "";

    it("successfully creates account and issues session cookies with valid token", async () => {
      const mockToken = `mock-google-token-${testSubId}-OddlyPioneer`;

      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/oauth",
        payload: {
          provider: "google",
          id_token: mockToken,
          turnstile_token: "dev-bypass-turnstile",
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.ok).toBe(true);
      expect(data.account.id).toBeDefined();
      expect(data.account.displayName).toBe("OddlyPioneer");
      expect(data.account.emailHash).toHaveLength(64); // SHA-256 hex string

      createdAccountId = data.account.id;

      // Extract cookies for subsequent authenticated requests
      const setCookieHeaders = res.headers["set-cookie"];
      expect(setCookieHeaders).toBeDefined();
      authCookies = Array.isArray(setCookieHeaders)
        ? setCookieHeaders
        : [setCookieHeaders as string];

      const accessCookie = authCookies.find((c) => c.includes("oddly_at="));
      const refreshCookie = authCookies.find((c) => c.includes("oddly_rt="));
      expect(accessCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();
      expect(accessCookie).toContain("HttpOnly");
    });

    it("CRITICAL DPDP AUDIT: asserts zero plaintext email storage in account repository", async () => {
      const accountRecord = await AccountsRepository.findById(createdAccountId);

      expect(accountRecord).not.toBeNull();
      // Zero plaintext email: property 'email' must NOT exist
      expect((accountRecord as any).email).toBeUndefined();
      expect(accountRecord?.email_hash).toBeDefined();
      expect(accountRecord?.email_hash).not.toContain("@");
      expect(accountRecord?.email_hash).toHaveLength(64);

      // Verify that the hash matches SHA-256 of lowercase raw email
      const expectedHash = crypto
        .createHash("sha256")
        .update(`${testSubId}@oddly.app`.toLowerCase().trim())
        .digest("hex");
      expect(accountRecord?.email_hash).toBe(expectedHash);
    });

    it("rejects login when bot challenge fails", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/oauth",
        payload: {
          provider: "google",
          id_token: "mock-google-token-bot-BadBot",
          turnstile_token: "invalid_bot_token_fail",
        },
      });

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res.body);
      expect(data.ok).toBe(false);
      expect(data.error).toBe("BOT_CHALLENGE_FAILED");
    });
  });

  describe("P7.04: Guest History Merge & Streak Recalculation", () => {
    it("seamlessly merges guest device submissions into authenticated account", async () => {
      // 1. Setup mock guest player with submissions on distinct dates
      const guestDid = `did_merge_test_${Date.now()}`;
      const guestPlayerId = `plyr_${Date.now()}`;
      const guestPlayer = {
        id: guestPlayerId,
        did: guestDid,
        nickname: "GuestPlayer",
        status: "active",
        submissions: [
          {
            id: "sub_1",
            player_id: guestPlayerId,
            drop: { drop_date: new Date("2026-11-08") },
          },
          {
            id: "sub_2",
            player_id: guestPlayerId,
            drop: { drop_date: new Date("2026-11-09") },
          },
        ],
      };
      AccountsRepository.setInMemoryPlayer(guestPlayer);

      // 2. Create an account to merge into
      const mockToken = `mock-google-token-merge_${Date.now()}-MergeAccount`;
      const authRes = await app.inject({
        method: "POST",
        url: "/v1/auth/oauth",
        payload: {
          provider: "google",
          id_token: mockToken,
        },
      });
      expect(authRes.statusCode).toBe(200);
      const rawCookies = authRes.headers["set-cookie"];
      const cookieHeader = Array.isArray(rawCookies) ? rawCookies.join("; ") : (rawCookies as string);

      // 3. Perform guest merge
      const mergeRes = await app.inject({
        method: "POST",
        url: "/v1/auth/merge-guest",
        headers: {
          cookie: cookieHeader,
        },
        payload: {
          guest_did: guestDid,
        },
      });

      expect(mergeRes.statusCode).toBe(200);
      const mergeData = JSON.parse(mergeRes.body);
      expect(mergeData.ok).toBe(true);
      expect(mergeData.merged_submissions_count).toBe(2);
      expect(mergeData.current_streak).toBeGreaterThanOrEqual(1);

      // 4. Verify player record now links to the account
      expect((guestPlayer as any).account_id).toBeDefined();
    });
  });

  describe("P7.05: Session Status & Logout Handler", () => {
    it("GET /v1/auth/session returns user details when authenticated", async () => {
      const mockToken = `mock-google-token-session_${Date.now()}-SessionUser`;
      const loginRes = await app.inject({
        method: "POST",
        url: "/v1/auth/oauth",
        payload: {
          provider: "google",
          id_token: mockToken,
        },
      });
      const rawCookies = loginRes.headers["set-cookie"];
      const cookieHeader = Array.isArray(rawCookies) ? rawCookies.join("; ") : (rawCookies as string);

      const sessionRes = await app.inject({
        method: "GET",
        url: "/v1/auth/session",
        headers: { cookie: cookieHeader },
      });

      expect(sessionRes.statusCode).toBe(200);
      const data = JSON.parse(sessionRes.body);
      expect(data.authenticated).toBe(true);
      expect(data.account.displayName).toBe("SessionUser");
    });

    it("POST /v1/auth/logout revokes cookies and clears session", async () => {
      const logoutRes = await app.inject({
        method: "POST",
        url: "/v1/auth/logout",
      });

      expect(logoutRes.statusCode).toBe(200);
      const setCookies = logoutRes.headers["set-cookie"] as string[];
      expect(setCookies).toBeDefined();

      const clearAccess = setCookies.find((c) => c.includes("oddly_at="));
      expect(clearAccess).toMatch(/Max-Age=0|expires=/i);
    });
  });

  describe("P7.09: Phone OTP Stub Interface", () => {
    it("returns stub response with FEATURE_PHONE_OTP flag identifier", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/phone/otp-stub",
        payload: {
          phone: "+919876543210",
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);
      expect(data.feature_flag).toBe("FEATURE_PHONE_OTP");
      expect(data.enabled).toBe(false);
    });
  });
});
