import { SignJWT, jwtVerify } from "jose";
import type { FastifyReply, FastifyRequest } from "fastify";

const JWT_ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || "development_jwt_access_secret_min_32_characters_long_12345"
);

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || "development_jwt_refresh_secret_min_32_characters_long_12345"
);

export interface AccessTokenPayload {
  accountId: string;
  emailHash: string;
  displayName: string;
}

export interface RefreshTokenPayload {
  accountId: string;
  tokenVersion: number;
}

/**
 * Signs a 15-minute short-lived Access JWT.
 */
export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(JWT_ACCESS_SECRET);
}

/**
 * Verifies an Access JWT and extracts the account payload.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_ACCESS_SECRET);
    if (payload.type !== "access" || !payload.accountId) {
      return null;
    }
    return {
      accountId: payload.accountId as string,
      emailHash: payload.emailHash as string,
      displayName: payload.displayName as string,
    };
  } catch {
    return null;
  }
}

/**
 * Signs a 30-day rotating Refresh JWT.
 */
export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  return await new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_REFRESH_SECRET);
}

/**
 * Verifies a Refresh JWT.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    if (payload.type !== "refresh" || !payload.accountId) {
      return null;
    }
    return {
      accountId: payload.accountId as string,
      tokenVersion: (payload.tokenVersion as number) || 1,
    };
  } catch {
    return null;
  }
}

/**
 * Attaches HTTP-only, SameSite session cookies onto Fastify reply.
 */
export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
  playerId?: string
): void {
  const isProd = process.env.NODE_ENV === "production";

  reply.setCookie("oddly_at", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  reply.setCookie("oddly_rt", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  if (playerId) {
    reply.setCookie("oddly_session", playerId, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 year
    });
  }
}

/**
 * Clears authentication cookies on logout.
 */
export function clearAuthCookies(reply: FastifyReply): void {
  const isProd = process.env.NODE_ENV === "production";

  reply.clearCookie("oddly_at", {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
  });

  reply.clearCookie("oddly_rt", {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
  });
}

/**
 * Extracts authenticated account from request cookies or Authorization header.
 */
export async function getAuthAccount(req: FastifyRequest): Promise<AccessTokenPayload | null> {
  // 1. Try oddly_at cookie
  const cookieToken = req.cookies.oddly_at;
  if (cookieToken) {
    const verified = await verifyAccessToken(cookieToken);
    if (verified) return verified;
  }

  // 2. Try Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7);
    const verified = await verifyAccessToken(bearerToken);
    if (verified) return verified;
  }

  return null;
}
