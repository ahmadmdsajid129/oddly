import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { AccountsRepository } from "../db/accounts.repo.js";
import {
  signAccessToken,
  signRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getAuthAccount,
} from "../auth/tokens.js";
import { verifyTurnstileToken } from "../auth/turnstile.js";

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
        },
      },
    },
    async (req, reply) => {
      const { id_token, turnstile_token } = req.body;

      // 1. Bot defense check via Cloudflare Turnstile (P7.06)
      const turnstile = await verifyTurnstileToken(turnstile_token, req.ip);
      if (!turnstile.success) {
        return reply.status(400).send({
          ok: false,
          error: "BOT_CHALLENGE_FAILED",
          message: "Bot verification failed. Please refresh and retry.",
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
          const ticket = await googleClient.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
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
        },
      },
    },
    async (req, reply) => {
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
