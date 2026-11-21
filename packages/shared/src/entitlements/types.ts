/**
 * @file types.ts
 * @package @oddly/shared
 *
 * Types for Stage M8 (Phase 10K): Premium Groundwork & Guardrail Engine.
 */

export type EntitlementFeatureKey =
  | "streak_freeze"
  | "historical_archive"
  | "bespoke_themes"
  | string;

export type PaywallSurface =
  | "me_settings"
  | "archive_view"
  | "recap_perks"
  | string;

export type PaywallEventType =
  | "offer_shown"
  | "dismissed"
  | "converted";

export interface EntitlementResult {
  entitled: boolean;
  reason:
    | "active_subscription"
    | "premium_disabled"
    | "no_subscription"
    | "expired_subscription"
    | "feature_not_in_plan";
  subscriptionId?: string;
  planKey?: string;
  config?: Record<string, unknown>;
}

export type PaywallRejectionReason =
  | "allowed"
  | "rule_12_drop_surface_forbidden"
  | "rule_17_broken_streak_forbidden"
  | "premium_feature_disabled"
  | "already_subscribed"
  | "frequency_cap_14d"
  | "dismissal_halt_90d";

export interface PaywallOfferEligibility {
  canShow: boolean;
  reason: PaywallRejectionReason;
  cooldownRemainingDays?: number;
  dismissalHaltRemainingDays?: number;
}

export type DarkPatternCategory = "urgency" | "guilt" | "streak_threat";

export interface CopyLintViolation {
  word: string;
  category: DarkPatternCategory;
  explanation: string;
}

export interface CopyLintResult {
  passed: boolean;
  violations: CopyLintViolation[];
}

