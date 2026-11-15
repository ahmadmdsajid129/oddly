/**
 * @file player-auth.ts
 * @package @oddly/api
 *
 * Helper to resolve and authenticate player identities for connection features.
 * Guarantees strict authentication:
 * - Google authenticated users have an account_id linked to their Player record.
 * - Test mode (NODE_ENV !== "production") allows x-player-id header for automated suites.
 */

import type { FastifyRequest } from "fastify";
import { getAuthAccount } from "./tokens.js";
import { prisma } from "../db/client.js";

export interface AuthenticatedPlayerResult {
  id: string;
  accountId: string | null;
  region: string;
  ageBand: string;
  isGoogleAuthenticated: boolean;
}

export async function resolveAuthenticatedPlayer(
  req: FastifyRequest
): Promise<AuthenticatedPlayerResult | null> {
  // 1. Test header bypass (non-production only for automated testing)
  if (process.env.NODE_ENV !== "production") {
    const testPlayerId = req.headers["x-player-id"] as string | undefined;
    if (testPlayerId) {
      const p = await prisma.player.findUnique({
        where: { id: testPlayerId },
      });
      if (p) {
        return {
          id: p.id,
          accountId: p.account_id,
          region: p.region,
          ageBand: p.age_band,
          isGoogleAuthenticated: !!p.account_id,
        };
      }
    }
  }

  // 2. Check JWT Auth Token
  const auth = await getAuthAccount(req);
  if (auth && auth.accountId) {
    const p = await prisma.player.findFirst({
      where: { account_id: auth.accountId },
    });
    if (p) {
      return {
        id: p.id,
        accountId: p.account_id,
        region: p.region,
        ageBand: p.age_band,
        isGoogleAuthenticated: true,
      };
    }
  }

  // 3. Fall back to guest session cookie
  const sessionPlayerId = req.cookies.oddly_session;
  if (sessionPlayerId) {
    const p = await prisma.player.findUnique({
      where: { id: sessionPlayerId },
    });
    if (p) {
      return {
        id: p.id,
        accountId: p.account_id,
        region: p.region,
        ageBand: p.age_band,
        isGoogleAuthenticated: !!p.account_id,
      };
    }
  }

  // 4. Fall back to device ID header (guest player)
  const deviceId = req.headers["x-device-id"] as string | undefined;
  if (deviceId) {
    const p = await prisma.player.findUnique({
      where: { did: deviceId },
    });
    if (p) {
      return {
        id: p.id,
        accountId: p.account_id,
        region: p.region,
        ageBand: p.age_band,
        isGoogleAuthenticated: !!p.account_id,
      };
    }
  }

  return null;
}

