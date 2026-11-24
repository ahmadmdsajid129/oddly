/**
 * @file collector-badges.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice B3: Collector Badges & Opt-In Sharing (Stage L10 / F41).
 *
 * Requirements & Invariants:
 * 1. Non-evaluative: Celebrates milestones, participation, and curiosity without ranking players.
 * 2. Opt-in sharing: Badges are strictly private by default (`is_shared = false`).
 *    Public share card / link generated ONLY upon deliberate user request.
 * 3. Tamper-evident evidence data: Links badge directly to validated submission / twin IDs.
 * 4. Zero leaderboard linkage: No competitive ranks or social shaming.
 */

import { createHmac } from "node:crypto";

export interface CollectorBadgeDef {
  id: string;
  name: string;
  description: string;
  iconKey: string;
  requiredCondition: string;
}

export const STANDARD_COLLECTOR_BADGES: readonly CollectorBadgeDef[] = [
  {
    id: "collector_tier1",
    name: "Dual Lane Explorer",
    description: "Played both Everyday and Memes on the same daily drop.",
    iconKey: "badge-dual-lane",
    requiredCondition: "lanes_played >= 2",
  },
  {
    id: "all_lanes",
    name: "Full Spectrum",
    description: "Completed every active lane in a single daily cycle.",
    iconKey: "badge-all-lanes",
    requiredCondition: "lanes_played >= total_active_lanes",
  },
  {
    id: "super_twin_achieved",
    name: "Super Twin Bond",
    description: "Achieved high cross-lane alignment with a stranger twin.",
    iconKey: "badge-super-twin",
    requiredCondition: "super_twin_mean >= 0.80",
  },
] as const;

export interface AwardBadgeParams {
  playerId: string;
  definitionId: string;
  evidence: {
    dropDate: string;
    laneIds?: string[];
    similarity?: number;
    partnerId?: string;
  };
}

export interface CollectorBadgeRecord {
  id: string;
  playerId: string;
  definitionId: string;
  evidenceData: Record<string, unknown>;
  evidenceHash: string;
  isShared: boolean;
  shareId: string | null;
  awardedAt: string;
}

/**
 * Creates an awarded collector badge record with cryptographic evidence hash.
 */
export function awardCollectorBadge(params: AwardBadgeParams): CollectorBadgeRecord {
  const awardedAt = new Date().toISOString();
  const evidencePayload = JSON.stringify(params.evidence);
  const evidenceHash = createHmac("sha256", "oddly-badge-salt")
    .update(`${params.playerId}:${params.definitionId}:${evidencePayload}`)
    .digest("hex")
    .slice(0, 16);

  return {
    id: `badge-${evidenceHash}`,
    playerId: params.playerId,
    definitionId: params.definitionId,
    evidenceData: params.evidence as Record<string, unknown>,
    evidenceHash,
    isShared: false, // Invariant: Private by default
    shareId: null,
    awardedAt,
  };
}

/**
 * Opt-in action to publish a badge for sharing.
 */
export function enableBadgeSharing(badge: CollectorBadgeRecord): CollectorBadgeRecord {
  if (badge.isShared && badge.shareId) {
    return badge;
  }

  const shareId = createHmac("sha256", "oddly-share-salt")
    .update(badge.id)
    .digest("hex")
    .slice(0, 12);

  return {
    ...badge,
    isShared: true,
    shareId,
  };
}
