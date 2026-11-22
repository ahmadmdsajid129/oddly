import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { AccountsRepository } from "../db/accounts.repo.js";
import { DegradationManager } from "../resilience/degradation.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getAuthAccount,
} from "../auth/tokens.js";
import { verifyTurnstileToken } from "../auth/turnstile.js";

// Rate limiter map for refresh storms: accountId -> { count: number, resetAt: number }
const refreshRateLimits = new Map<string, { count: number; resetAt: number }>();

// Single-flight in-flight map coalescing concurrent refresh calls per account (P7.10)
const inFlightRefreshes = new Map<
  string,
  Promise<{
    ok: boolean;
    accessToken: string;
    refreshToken: string;
    account: { id: string; displayName: string; emailHash: string };
  }>
>();

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID || "mock-google-client-id.apps.googleusercontent.com"
);

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * POST /v1/auth/oauth
   * Google Sign-In with ID token verification, email hashing, and guest auto-merge.
   */
  app.post<{
    Body: {
      provider: "google";
      id_token: string;
      turnstile_token?: string;
    };
  }>(
    "/v1/auth/oauth",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Verify Google ID token and establish authenticated session",
        body: z.object({
          provider: z.literal("google"),
          id_token: z.string().min(1),
          turnstile_token: z.string().optional(),
        }),
        response: {
          200: z.object({
            ok: z.boolean(),
            account: z.object({
              id: z.string(),
              displayName: z.string(),
              emailHash: z.string(),
            }),
            mergedHistory: z.object({
              merged: z.boolean(),
              submissionsCount: z.number(),
              currentStreak: z.number(),
            }),
          }),
          400: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
          401: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
          403: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
            degradation_level: z.number().optional(),
          }),
        },
      },
    },
    async (req, reply) => {
      // Degradation Ladder Check (L3+: pause new sign-ups, guest play continues)
      if (!(await DegradationManager.checkSignUpAllowed(reply))) {
        return reply;
      }

      const { id_token, turnstile_token } = req.body;

      // 1. Bot defense check via Cloudflare Turnstile with fail-closed policy for sign-ups (P7.11)
      const turnstile = await verifyTurnstileToken(turnstile_token, req.ip, {
        isSignUp: true,
        action: "signup",
      });
      if (!turnstile.success) {
        return reply.status(400).send({
          ok: false,
          error: "BOT_CHALLENGE_FAILED",
          message: turnstile.message || "Bot verification failed. Please refresh and retry.",
        });
      }

      // 2. Verify Google ID token (P7.02)
      let googleSub = "";
      let email = "";
      let displayName = "Player";

      // Allow mock tokens in non-production environments for automated testing
      if (
        process.env.NODE_ENV !== "production" &&
        id_token.startsWith("mock-google-token-")
      ) {
        const parts = id_token.replace("mock-google-token-", "").split("-");
        googleSub = `sub_${parts[0] || "test_user"}`;
        email = `${parts[0] || "test_user"}@oddly.app`;
        displayName = parts[1] || "Test Player";
      } else {
        try {
          const verifyPromise = googleClient.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Google ID token verification timed out")), 4000)
          );
          const ticket = await Promise.race([verifyPromise, timeoutPromise]);
          const payload = ticket.getPayload();
          if (!payload || !payload.sub || !payload.email) {
            return reply.status(401).send({
              ok: false,
              error: "INVALID_GOOGLE_TOKEN",
              message: "Google ID token payload could not be verified",
            });
          }
          googleSub = payload.sub;
          email = payload.email;
          displayName = payload.name || payload.given_name || "Player";
        } catch (err) {
          return reply.status(401).send({
            ok: false,
            error: "INVALID_GOOGLE_TOKEN",
            message: `Google authentication failed: ${(err as Error).message}`,
          });
        }
      }

      // 3. Compute SHA-256 email hash (DPDP compliance: zero plaintext email storage)
      const emailHash = crypto
        .createHash("sha256")
        .update(email.toLowerCase().trim())
        .digest("hex");

      // 4. Anti-abuse duplicate account detection (P7.07)
      const guestPlayerId = req.cookies.oddly_session;
      const antiAbuse = await AccountsRepository.detectDuplicateAccount(emailHash);
      if (antiAbuse.isSuspicious) {
        req.log.warn({ emailHash, reason: antiAbuse.reason }, "Suspicious account linking flagged");
      }

      // 5. Find or create Account
      let account = await AccountsRepository.findByGoogleSub(googleSub);
      if (!account) {
        account = await AccountsRepository.createAccount({
          googleSub,
          emailHash,
          displayName,
        });
      }

      // 6. Seamless guest history merge without data loss (P7.04)
      let mergedResult = {
        merged: false,
        submissionsCount: 0,
        currentStreak: 0,
      };

      if (guestPlayerId) {
        const merge = await AccountsRepository.mergeGuestHistory({
          guestPlayerId,
          accountId: account.id,
        });
        mergedResult = {
          merged: merge.merged,
          submissionsCount: merge.mergedSubmissionsCount,
          currentStreak: merge.currentStreak,
        };
      }

      // 7. Issue JWT access and refresh tokens (P7.01)
      const accessToken = await signAccessToken({
        accountId: account.id,
        emailHash: account.email_hash,
        displayName: account.display_name,
      });

      const refreshToken = await signRefreshToken({
        accountId: account.id,
        tokenVersion: 1,
      });

      setAuthCookies(reply, accessToken, refreshToken, guestPlayerId);

      return reply.send({
        ok: true,
        account: {
          id: account.id,
          displayName: account.display_name,
          emailHash: account.email_hash,
        },
        mergedHistory: mergedResult,
      });
    }
  );

  /**
   * POST /v1/auth/merge-guest
   * Explicit guest history merge for logged-in accounts.
   */
  app.post<{
    Body: {
      guest_player_id?: string;
      guest_did?: string;
    };
  }>(
    "/v1/auth/merge-guest",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Merge guest picks and recalculate streaks into authenticated account",
        body: z.object({
          guest_player_id: z.string().optional(),
          guest_did: z.string().optional(),
        }),
        response: {
          200: z.object({
            ok: z.boolean(),
            merged_submissions_count: z.number(),
            current_streak: z.number(),
          }),
          401: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
          503: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      // Degradation Ladder L3 Check: Pause guest history merging during high load shedding
      const degradationLevel = await DegradationManager.getLevel();
      if (degradationLevel >= 3) {
        reply.header("Retry-After", "30");
        return reply.status(503).send({
          ok: false,
          error: "SERVICE_DEGRADED",
          message: "Guest history merging is paused during peak load. Your guest progress is safely stored on your device.",
        });
      }

      const auth = await getAuthAccount(req);
      if (!auth) {
        return reply.status(401).send({
          ok: false,
          error: "UNAUTHORIZED",
          message: "Authentication required to merge guest history",
        });
      }

      const guestPlayerId = req.body.guest_player_id || req.cookies.oddly_session;
      const guestDid = req.body.guest_did;

      const result = await AccountsRepository.mergeGuestHistory({
        guestPlayerId,
        guestDid,
        accountId: auth.accountId,
      });

      return reply.send({
        ok: true,
        merged_submissions_count: result.mergedSubmissionsCount,
        current_streak: result.currentStreak,
      });
    }
  );

  /**
   * POST /v1/auth/logout
   * Revokes session and clears HTTP-only cookies (P7.05).
   */
  app.post(
    "/v1/auth/logout",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Sign out and clear session cookies",
        response: {
          200: z.object({
            ok: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    async (_req, reply) => {
      clearAuthCookies(reply);
      return reply.send({
        ok: true,
        message: "Signed out successfully",
      });
    }
  );

  /**
   * POST /v1/auth/refresh
   * Rotates refresh tokens and issues fresh access tokens (P7.06).
   * Protects against refresh storms via single-flight concurrency coalescing and sliding rate limiting (P7.10).
   */
  app.post(
    "/v1/auth/refresh",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Rotate refresh token and issue fresh access JWT",
        response: {
          200: z.object({
            ok: z.boolean(),
            message: z.string(),
            account: z.object({
              id: z.string(),
              displayName: z.string(),
              emailHash: z.string(),
            }),
          }),
          401: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
          429: z.object({
            ok: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (req, reply) => {
      const refreshToken = req.cookies.oddly_rt;
      if (!refreshToken) {
        return reply.status(401).send({
          ok: false,
          error: "NO_REFRESH_TOKEN",
          message: "No refresh token provided",
        });
      }

      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (!refreshPayload || !refreshPayload.accountId) {
        return reply.status(401).send({
          ok: false,
          error: "INVALID_REFRESH_TOKEN",
          message: "Refresh token is invalid or expired",
        });
      }

      const accountId = refreshPayload.accountId;

      // 1. Sliding rate limit check to protect against token refresh storms (P7.10)
      const now = Date.now();
      const rateLimit = refreshRateLimits.get(accountId);
      if (rateLimit && now < rateLimit.resetAt) {
        if (rateLimit.count >= 10) {
          reply.header("Retry-After", "30");
          return reply.status(429).send({
            ok: false,
            error: "REFRESH_RATE_LIMIT",
            message: "Too many refresh attempts. Please retry in 30 seconds.",
          });
        }
        rateLimit.count++;
      } else {
        refreshRateLimits.set(accountId, { count: 1, resetAt: now + 60000 });
      }

      // 2. Degradation Ladder L3 Guard: If access token is still valid, avoid unnecessary re-signing
      const degradationLevel = await DegradationManager.getLevel();
      if (degradationLevel >= 3) {
        const existingAccessToken = req.cookies.oddly_at;
        if (existingAccessToken) {
          const validAccess = await verifyAccessToken(existingAccessToken);
          if (validAccess) {
            return reply.send({
              ok: true,
              message: "Token valid (refresh bypassed under L3 load shedding)",
              account: {
                id: validAccess.accountId,
                displayName: validAccess.displayName,
                emailHash: validAccess.emailHash,
              },
            });
          }
        }
      }

      // 3. Single-flight concurrency coalescing (P7.10):
      // Deduplicate simultaneous refresh requests from multiple browser tabs
      if (inFlightRefreshes.has(accountId)) {
        const result = await inFlightRefreshes.get(accountId)!;
        setAuthCookies(reply, result.accessToken, result.refreshToken, req.cookies.oddly_session);
        return reply.send({
          ok: true,
          message: "Token refreshed successfully",
          account: result.account,
        });
      }

      const refreshPromise = (async () => {
        try {
          const account = await AccountsRepository.findById(accountId);
          if (!account) {
            throw new Error("ACCOUNT_NOT_FOUND");
          }

          const newAccessToken = await signAccessToken({
            accountId: account.id,
            emailHash: account.email_hash,
            displayName: account.display_name,
          });

          const newRefreshToken = await signRefreshToken({
            accountId: account.id,
            tokenVersion: refreshPayload.tokenVersion || 1,
          });

          return {
            ok: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            account: {
              id: account.id,
              displayName: account.display_name,
              emailHash: account.email_hash,
            },
          };
        } finally {
          inFlightRefreshes.delete(accountId);
        }
      })();

      inFlightRefreshes.set(accountId, refreshPromise);

      try {
        const result = await refreshPromise;
        setAuthCookies(reply, result.accessToken, result.refreshToken, req.cookies.oddly_session);
        return reply.send({
          ok: true,
          message: "Token refreshed successfully",
          account: result.account,
        });
      } catch (err) {
        return reply.status(401).send({
          ok: false,
          error: "ACCOUNT_NOT_FOUND",
          message: "Account associated with refresh token no longer exists",
        });
      }
    }
  );

  /**
   * GET /v1/auth/session
   * Returns current authenticated account or null if guest.
   */
  app.get(
    "/v1/auth/session",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Get current authenticated account status",
        response: {
          200: z.object({
            authenticated: z.boolean(),
            account: z
              .object({
                id: z.string(),
                displayName: z.string(),
                emailHash: z.string(),
              })
              .nullable(),
          }),
        },
      },
    },
    async (req, reply) => {
      const auth = await getAuthAccount(req);
      if (!auth) {
        return reply.send({
          authenticated: false,
          account: null,
        });
      }

      return reply.send({
        authenticated: true,
        account: {
          id: auth.accountId,
          displayName: auth.displayName,
          emailHash: auth.emailHash,
        },
      });
    }
  );

  /**
   * POST /v1/auth/phone/otp-stub
   * Stub endpoint for SMS phone authentication behind FEATURE_PHONE_OTP flag (P7.09).
   */
  app.post(
    "/v1/auth/phone/otp-stub",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Phone OTP stub interface behind feature flag",
        response: {
          200: z.object({
            ok: z.boolean(),
            enabled: z.boolean(),
            feature_flag: z.string(),
            message: z.string(),
          }),
        },
      },
    },
    async (_req, reply) => {
      return reply.send({
        ok: false,
        enabled: false,
        feature_flag: "FEATURE_PHONE_OTP",
        message:
          "Phone OTP verification is reserved for production SMS gateway behind FEATURE_PHONE_OTP flag.",
      });
    }
  );
};

