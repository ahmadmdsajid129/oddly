/**
 * @file guardrails.ts
 * @package @oddly/shared
 *
 * Paywall Guardrail & Dark Pattern Protection Engine (Stage M8 / Phase 10K - P10K.03, P10K.04).
 * Strictly enforces Rule 12 (Identical Drop Rule) and Rule 17 (No Pressure to Pay).
 */

import type { PrismaClient } from "../db.js";
import type {
  PaywallOfferEligibility,
  PaywallEventType,
  CopyLintResult,
  CopyLintViolation,
} from "./types.js";
import { FEATURE_FLAG_PREMIUM } from "./entitlements.js";

export const CONFIG_OFFER_COOLDOWN_DAYS = "premium.offer_cooldown_days";
export const CONFIG_DISMISS_HALT_DAYS = "premium.dismiss_halt_days";

export const DEFAULT_OFFER_COOLDOWN_DAYS = 14;
export const DEFAULT_DISMISS_HALT_DAYS = 90;

function isFeatureEnabled(val: unknown): boolean {
  if (val === true || val === "true") return true;
  if (typeof val === "string" && val.toLowerCase() === "true") return true;
  return false;
}

function parseConfigInt(val: unknown, fallback: number): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Surface patterns that are strictly forbidden under Rule 12 and Rule 17.
 */
const DROP_SURFACE_REGEX = /^(drop|daily_drop|drop_flow|question_flow)/i;
const BROKEN_STREAK_REGEX = /(broken_streak|streak_loss|streak_break|streak_died)/i;

/**
 * Checks whether a paywall offer can be shown to a player on a specific surface.
 *
 * Enforces:
 * 1. Rule 12: Drop play is sacred & identical. Never show on any Drop surface.
 * 2. Rule 17: Never prey on broken streaks. Never show at the moment a streak breaks.
 * 3. Feature flag: feature.premium must be "true".
 * 4. Active subscriber: Do not show offers to users who already have an active subscription.
 * 5. Rule 17 Dismissal Halt: If dismissed >= 2 times in the last 90 days, halt offers.
 * 6. Rule 17 Frequency Cap: Max 1 offer shown per 14 days.
 */
export async function canShowPaywallOffer(
  db: PrismaClient,
  playerId: string,
  surface: string
): Promise<PaywallOfferEligibility> {
  const normSurface = surface.trim().toLowerCase();

  // 1. Rule 12 Check: Drop surfaces forbidden
  if (DROP_SURFACE_REGEX.test(normSurface) || normSurface === "drop") {
    return {
      canShow: false,
      reason: "rule_12_drop_surface_forbidden",
    };
  }

  // 2. Rule 17 Check: Broken streak moment forbidden
  if (BROKEN_STREAK_REGEX.test(normSurface)) {
    return {
      canShow: false,
      reason: "rule_17_broken_streak_forbidden",
    };
  }

  // 3. Feature Flag Check
  const flag = await db.appConfig.findUnique({
    where: { key: FEATURE_FLAG_PREMIUM },
  });

  if (!flag || !isFeatureEnabled(flag.value)) {
    return {
      canShow: false,
      reason: "premium_feature_disabled",
    };
  }

  const now = new Date();

  // 4. Already Subscribed Check
  const activeSub = await db.subscription.findFirst({
    where: {
      player_id: playerId,
      status: "active",
      current_period_end: { gt: now },
    },
  });

  if (activeSub) {
    return {
      canShow: false,
      reason: "already_subscribed",
    };
  }

  // Retrieve configurable cooldown and halt windows
  const [cooldownConfig, haltConfig] = await Promise.all([
    db.appConfig.findUnique({ where: { key: CONFIG_OFFER_COOLDOWN_DAYS } }),
    db.appConfig.findUnique({ where: { key: CONFIG_DISMISS_HALT_DAYS } }),
  ]);

  const cooldownDays = cooldownConfig
    ? parseConfigInt(cooldownConfig.value, DEFAULT_OFFER_COOLDOWN_DAYS)
    : DEFAULT_OFFER_COOLDOWN_DAYS;

  const haltDays = haltConfig
    ? parseConfigInt(haltConfig.value, DEFAULT_DISMISS_HALT_DAYS)
    : DEFAULT_DISMISS_HALT_DAYS;

  const haltWindowStart = new Date(
    now.getTime() - haltDays * 24 * 60 * 60 * 1000
  );
  const cooldownWindowStart = new Date(
    now.getTime() - cooldownDays * 24 * 60 * 60 * 1000
  );

  // 5. Rule 17 Dismissal Halt Check: 2 dismissals in 90 days = 90 day freeze
  const dismissals = await db.paywallEvent.findMany({
    where: {
      player_id: playerId,
      event_type: "dismissed",
      created_at: { gte: haltWindowStart },
    },
    orderBy: { created_at: "desc" },
  });

  if (dismissals.length >= 2) {
    const latestDismissal = dismissals[0];
    const haltEnd = new Date(
      latestDismissal.created_at.getTime() + haltDays * 24 * 60 * 60 * 1000
    );
    const remainingMs = Math.max(0, haltEnd.getTime() - now.getTime());
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

    return {
      canShow: false,
      reason: "dismissal_halt_90d",
      dismissalHaltRemainingDays: remainingDays,
    };
  }

  // 6. Rule 17 Frequency Cap Check: Max 1 offer shown in 14 days
  const recentOffer = await db.paywallEvent.findFirst({
    where: {
      player_id: playerId,
      event_type: "offer_shown",
      created_at: { gte: cooldownWindowStart },
    },
    orderBy: { created_at: "desc" },
  });

  if (recentOffer) {
    const cooldownEnd = new Date(
      recentOffer.created_at.getTime() + cooldownDays * 24 * 60 * 60 * 1000
    );
    const remainingMs = Math.max(0, cooldownEnd.getTime() - now.getTime());
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

    return {
      canShow: false,
      reason: "frequency_cap_14d",
      cooldownRemainingDays: remainingDays,
    };
  }

  return {
    canShow: true,
    reason: "allowed",
  };
}

/**
 * Records a paywall event with surface validation.
 */
export async function recordPaywallEvent(
  db: PrismaClient,
  playerId: string,
  surface: string,
  eventType: PaywallEventType
) {
  const normSurface = surface.trim().toLowerCase();

  // Validate surface under Rule 12 & Rule 17
  if (DROP_SURFACE_REGEX.test(normSurface) || normSurface === "drop") {
    throw new Error(
      `Rule 12 Violation: Paywall events cannot occur on Drop surface '${surface}'`
    );
  }

  if (BROKEN_STREAK_REGEX.test(normSurface)) {
    throw new Error(
      `Rule 17 Violation: Paywall events cannot occur on broken streak surface '${surface}'`
    );
  }

  return db.paywallEvent.create({
    data: {
      player_id: playerId,
      surface: normSurface,
      event_type: eventType,
    },
  });
}

/**
 * Prohibited copy rules for Rule 17 dark pattern prevention.
 */
const FORBIDDEN_COPY_PATTERNS: Array<{
  regex: RegExp;
  category: "urgency" | "guilt" | "streak_threat";
  explanation: string;
}> = [
  // Urgency
  {
    regex: /\b(hurry|hurry up)\b/i,
    category: "urgency",
    explanation: "Artificial urgency word prohibited under Rule 17",
  },
  {
    regex: /\b(expires (soon|in|today))\b/i,
    category: "urgency",
    explanation: "Fake countdown or expiration pressure prohibited under Rule 17",
  },
  {
    regex: /\b(limited time|act now|clock is ticking|running out|last chance)\b/i,
    category: "urgency",
    explanation: "Urgency phrases strictly prohibited under Rule 17",
  },
  // Guilt
  {
    regex: /\b(you('ll| will) regret|don't let (down|everyone down)|coward|shame|disappoint)\b/i,
    category: "guilt",
    explanation: "Manipulative guilt-inducing copy prohibited under Rule 17",
  },
  {
    regex: /\b(missing out|you're missing out)\b/i,
    category: "guilt",
    explanation: "Fear-of-missing-out (FOMO) copy prohibited under Rule 17",
  },
  // Streak threat
  {
    regex: /\b(streak will die|lose your streak|streak is gone|streak dies|save your streak before it dies|your streak is at risk)\b/i,
    category: "streak_threat",
    explanation: "Streak extortion copy strictly prohibited under Rule 17",
  },
  {
    regex: /\bdie in \d+\b/i,
    category: "streak_threat",
    explanation: "Streak countdown threat prohibited under Rule 17",
  },
];

/**
 * Lints copy text against dark pattern rules (Rule 17).
 */
export function lintDarkPatternCopy(copyText: string): CopyLintResult {
  const violations: CopyLintViolation[] = [];

  for (const pattern of FORBIDDEN_COPY_PATTERNS) {
    const match = copyText.match(pattern.regex);
    if (match) {
      violations.push({
        word: match[0],
        category: pattern.category,
        explanation: pattern.explanation,
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
