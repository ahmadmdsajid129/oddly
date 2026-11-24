/**
 * @file friend-orbit.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice B5: Friend-Invite Orbit & Friends Compare Lite (Flag OFF).
 *
 * Single-use invite codes for playing against real-life friends.
 * Invariant: Disabled by default behind `feature.friend_orbit = false`.
 */

import { createHmac } from "node:crypto";

export interface FriendOrbitConfig {
  flagEnabled: boolean;
  inviteExpiryDays: number;
  maxGroupSize: number;
}

export const DEFAULT_FRIEND_ORBIT_CONFIG: FriendOrbitConfig = {
  flagEnabled: false, // Invariant: Flag OFF in v1 base
  inviteExpiryDays: 7,
  maxGroupSize: 30,
};

export interface FriendInviteResult {
  ok: boolean;
  code?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Generate a single-use friend invite code.
 */
export function generateFriendInviteCode(
  inviterPlayerId: string,
  dropDate: string,
  config?: Partial<FriendOrbitConfig>
): FriendInviteResult {
  const enabled = config?.flagEnabled ?? DEFAULT_FRIEND_ORBIT_CONFIG.flagEnabled;
  if (!enabled) {
    return { ok: false, error: "FEATURE_DISABLED" };
  }

  const expiryDays =
    config?.inviteExpiryDays ?? DEFAULT_FRIEND_ORBIT_CONFIG.inviteExpiryDays;
  const expiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const code = createHmac("sha256", "oddly-friend-invite-salt")
    .update(`${inviterPlayerId}:${dropDate}:${Date.now()}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  return {
    ok: true,
    code: `ODD-${code}`,
    expiresAt,
  };
}

export interface GroupMemberSubmission {
  playerId: string;
  alias: string;
  answers: Record<string, string>;
}

export interface GroupCompareResult {
  ok: boolean;
  membersCount: number;
  pairs: { memberA: string; memberB: string; agreementPct: number }[];
  mostSimilarPair: { memberA: string; memberB: string; agreementPct: number } | null;
  error?: string;
}

/**
 * Compute pair-wise agreement across a private group of friends.
 */
export function computeFriendsGroupCompare(
  members: GroupMemberSubmission[],
  config?: Partial<FriendOrbitConfig>
): GroupCompareResult {
  const enabled = config?.flagEnabled ?? DEFAULT_FRIEND_ORBIT_CONFIG.flagEnabled;
  if (!enabled) {
    return { ok: false, membersCount: 0, pairs: [], mostSimilarPair: null, error: "FEATURE_DISABLED" };
  }

  const maxGroup = config?.maxGroupSize ?? DEFAULT_FRIEND_ORBIT_CONFIG.maxGroupSize;
  if (members.length > maxGroup) {
    return { ok: false, membersCount: members.length, pairs: [], mostSimilarPair: null, error: "MAX_GROUP_EXCEEDED" };
  }

  const pairs: { memberA: string; memberB: string; agreementPct: number }[] = [];
  let bestPair: { memberA: string; memberB: string; agreementPct: number } | null = null;

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];

      let matches = 0;
      let total = 0;
      for (const [qId, valA] of Object.entries(a.answers)) {
        if (b.answers[qId] !== undefined) {
          total++;
          if (b.answers[qId] === valA) matches++;
        }
      }

      const pct = total > 0 ? Math.round((matches / total) * 100) : 0;
      const pair = { memberA: a.alias, memberB: b.alias, agreementPct: pct };
      pairs.push(pair);

      if (!bestPair || pct > bestPair.agreementPct) {
        bestPair = pair;
      }
    }
  }

  return {
    ok: true,
    membersCount: members.length,
    pairs,
    mostSimilarPair: bestPair,
  };
}
