/**
 * @file entitlements.ts
 * @package @oddly/shared
 *
 * Provider-Agnostic Entitlements Engine (Stage M8 / Phase 10K - P10K.02).
 * Evaluates feature gates against app config flags and player subscription state.
 */

import type { PrismaClient } from "../db.js";
import type { EntitlementFeatureKey, EntitlementResult } from "./types.js";

export const FEATURE_FLAG_PREMIUM = "feature.premium";
export const ODDLY_PLUS_PLAN_KEY = "oddly_plus_monthly";

function isFeatureEnabled(val: unknown): boolean {
  if (val === true || val === "true") return true;
  if (typeof val === "string" && val.toLowerCase() === "true") return true;
  return false;
}

/**
 * Checks whether a player is entitled to a specific premium feature.
 *
 * Evaluation rules:
 * 1. If global `feature.premium` is not active ("true"), entitlement is disabled immediately.
 * 2. If the player has an active or cancelled unexpired subscription, entitlement is granted
 *    if the feature exists in the subscription plan.
 *    (Cancelled subscriptions retain access until current_period_end).
 * 3. Expired or non-existent subscriptions return entitled: false.
 */
export async function checkEntitlement(
  db: PrismaClient,
  playerId: string,
  featureKey: EntitlementFeatureKey
): Promise<EntitlementResult> {
  // 1. Check global feature flag
  const flag = await db.appConfig.findUnique({
    where: { key: FEATURE_FLAG_PREMIUM },
  });

  if (!flag || !isFeatureEnabled(flag.value)) {
    return {
      entitled: false,
      reason: "premium_disabled",
    };
  }

  const now = new Date();

  // 2. Query for active/cancelled subscriptions whose period has not expired
  const activeSub = await db.subscription.findFirst({
    where: {
      player_id: playerId,
      status: { in: ["active", "cancelled"] },
      current_period_end: { gt: now },
    },
    include: {
      plan: {
        include: {
          entitlements: true,
        },
      },
    },
    orderBy: { current_period_end: "desc" },
  });

  if (!activeSub) {
    // Check if player ever had a subscription to differentiate reason
    const pastSub = await db.subscription.findFirst({
      where: { player_id: playerId },
    });

    return {
      entitled: false,
      reason: pastSub ? "expired_subscription" : "no_subscription",
    };
  }

  // 3. Check if the requested feature is configured in the plan
  const entitlement = activeSub.plan.entitlements.find(
    (e) => e.feature_key === featureKey
  );

  if (!entitlement) {
    return {
      entitled: false,
      reason: "feature_not_in_plan",
      subscriptionId: activeSub.id,
      planKey: activeSub.plan.key,
    };
  }

  return {
    entitled: true,
    reason: "active_subscription",
    subscriptionId: activeSub.id,
    planKey: activeSub.plan.key,
    config: entitlement.config as Record<string, unknown>,
  };
}

/**
 * Retrieves all active entitlements for a player as a key-value record.
 */
export async function getPlayerEntitlements(
  db: PrismaClient,
  playerId: string
): Promise<{
  active: boolean;
  planKey?: string;
  currentPeriodEnd?: Date;
  isCancelled?: boolean;
  entitlements: Record<string, unknown>;
}> {
  const flag = await db.appConfig.findUnique({
    where: { key: FEATURE_FLAG_PREMIUM },
  });

  if (!flag || !isFeatureEnabled(flag.value)) {
    return {
      active: false,
      entitlements: {},
    };
  }

  const now = new Date();
  const activeSub = await db.subscription.findFirst({
    where: {
      player_id: playerId,
      status: { in: ["active", "cancelled"] },
      current_period_end: { gt: now },
    },
    include: {
      plan: {
        include: {
          entitlements: true,
        },
      },
    },
    orderBy: { current_period_end: "desc" },
  });

  if (!activeSub) {
    return {
      active: false,
      entitlements: {},
    };
  }

  const map: Record<string, unknown> = {};
  for (const ent of activeSub.plan.entitlements) {
    map[ent.feature_key] = ent.config;
  }

  return {
    active: true,
    planKey: activeSub.plan.key,
    currentPeriodEnd: activeSub.current_period_end,
    isCancelled: activeSub.status === "cancelled",
    entitlements: map,
  };
}
