# Stage M8 Report: Premium Groundwork & Guardrail Engine (Phase 10K)

<!-- visual:start stage-archive-callout -->
> [!NOTE]
> **Stage Documentation Archive:** Historical deliverable record for `stage-M8-report.md`. Invariant specifications preserved.
<!-- visual:end stage-archive-callout -->



**Date:** 2026-11-21  
**Status:** Completed  
**Branch:** `main`  
**Milestone:** Stage M8 (Phase 10K: Premium Groundwork — Provider-Agnostic Entitlements, Feature Gates, Paywall Experiment Engine, Rule 17 Guardrail Monitor, Single-Tap Cancellation)

---

## 1. Executive Summary

Stage M8 (Phase 10K) establishes the technical and ethical infrastructure for Oddly's optional premium layer (**Oddly Plus**). Per `product.md` F31 and non-negotiable design principles:
- **Daily play is 100% free forever** (`product.md` F31).
- **Rule 12 (Identical Drop Rule):** Paywall experiments and offers are **strictly restricted to non-Drop surfaces** (Settings, Archive view, Recap perks). Drop questions, reveals, and comparisons are never paywalled, gated, or personalized.
- **Rule 17 (No Pressure to Pay):**
  - Zero urgency traps, zero fake countdown timers, zero streak threat phrases ("Your streak will die in 5 minutes!").
  - Offers are NEVER shown at the moment of a broken streak.
  - Strict frequency cap: maximum 1 offer per 14 days (`premium.offer_cooldown_days = 14`).
  - Strict dismissal halt: if a user dismisses an offer twice, halt all offers for 90 days (`premium.dismiss_halt_days = 90`).
  - Cancellation is self-service and executed in exactly **one tap** with zero retention surveys or friction traps. Paid access is preserved until the end of the billing period.

---

## 2. Delivered Artifacts & Sub-Tasks

### P10K.01: Provider-Agnostic Entitlements Data Model
- Authored and applied database migration `packages/shared/prisma/migrations/011_premium_groundwork.sql`:
  - `plans`: Provider-agnostic catalog of plans (`key`, `name_i18n`, `description_i18n`, `price_inr_cents`, `duration_days`, `status`).
  - `entitlements`: Feature gates tied to plans (`plan_id`, `feature_key`, `config`), unique on `(plan_id, feature_key)`.
  - `subscriptions`: Player subscription records (`player_id`, `plan_id`, `status` ['active' | 'cancelled' | 'expired' | 'past_due'], `started_at`, `current_period_end`, `cancelled_at`, `provider`, `provider_subscription_id`).
  - `paywall_events`: Tracks impressions and dismissals for frequency capping (`player_id`, `surface`, `event_type` ['offer_shown' | 'dismissed' | 'converted'], `created_at`).
  - Seeded initial `app_config`:
    - `feature.premium = false`
    - `premium.offer_cooldown_days = 14`
    - `premium.dismiss_halt_days = 90`
  - Seeded default plan `oddly_plus_monthly` (₹79.00/mo) with entitlements:
    - `streak_freeze`: 2 monthly freezes (`{"monthly_freezes": 2}`)
    - `historical_archive`: full archive access (`{"full_access": true}`)
    - `bespoke_themes`: colorways access (`{"colorways": ["holo_night", "midnight_sun"]}`)
- Updated `packages/shared/prisma/schema.prisma` with `Plan`, `Entitlement`, `Subscription`, `PaywallEvent` models and generated Prisma Client.

### P10K.02: Feature Flag Entitlements Engine
- Created `packages/shared/src/entitlements/entitlements.ts`:
  - `checkEntitlement(db, playerId, featureKey)`: Evaluates whether a player is entitled to a specific perk. Evaluates `feature.premium` global flag, active/cancelled subscriptions, expiration dates, and plan feature definitions.
  - `getPlayerEntitlements(db, playerId)`: Returns a unified key-value map of all active feature perks for a player.
  - **Grace Period Invariant:** Cancelled subscriptions retain all entitlements until `current_period_end`.

### P10K.03 & P10K.04: Paywall Guardrail Monitor & Dark Pattern Linter
- Created `packages/shared/src/entitlements/guardrails.ts`:
  - `canShowPaywallOffer(db, playerId, surface)`:
    - **Rule 12 Check:** Rejects Drop surfaces (`drop`, `drop_flow`, etc.) with `rule_12_drop_surface_forbidden`.
    - **Rule 17 Check:** Rejects broken streak surfaces (`broken_streak`, `streak_loss`) with `rule_17_broken_streak_forbidden`.
    - **Already Subscribed Check:** Prevents showing upsells to players with active subscriptions.
    - **Rule 17 Dismissal Halt:** Looks back 90 days; if $\ge 2$ dismissals exist, halts all offers with `dismissal_halt_90d`.
    - **Rule 17 Frequency Cap:** Looks back 14 days; if an `offer_shown` event exists within 14 days, halts offers with `frequency_cap_14d`.
  - `recordPaywallEvent(db, playerId, surface, eventType)`: Enforces surface restrictions and logs paywall telemetry.
  - `lintDarkPatternCopy(copyText)`: Lints marketing/copy strings against urgency words (`hurry`, `expires in`, `act now`, `clock is ticking`), guilt words (`you'll regret`, `don't let down`, `missing out`), and streak extortion words (`streak will die`, `lose your streak`).

### P10K.05: Self-Service Single-Tap Cancellation & Webhooks API
- Created `services/api/src/routes/subscriptions.ts`:
  - `GET /v1/plans`: Returns active subscription plans, INR pricing, and localized descriptions.
  - `GET /v1/me/subscription`: Returns player's subscription status, active plan, entitlements, and cancellation eligibility.
  - `POST /v1/subscriptions/subscribe`: Test/mock subscription activation endpoint.
  - `POST /v1/subscriptions/cancel`: **Single-tap cancellation API**. No survey, no retention hurdles. Immediately sets `status = "cancelled"` and `cancelled_at = NOW()`, preserving `current_period_end`.
  - `POST /v1/subscriptions/webhook`: Handles payment provider lifecycle events (`subscription.charged`, `subscription.cancelled`, `subscription.halted`).
  - `GET /v1/paywall/eligibility`: Public evaluation endpoint for surface offer eligibility.
  - `POST /v1/paywall/event`: Telemetry endpoint for recording impressions and dismissals.
- Registered routes in `services/api/src/server.ts` and added route policies in `services/api/src/routes/policy.registry.ts`.

---

## 3. Test & Verification Matrix

| Test Suite | Scope | Result |
|---|---|---|
| `packages/shared/src/entitlements/entitlements.test.ts` | 14 unit tests covering `checkEntitlement`, `canShowPaywallOffer`, Rule 12 Drop surface blocks, Rule 17 streak moment blocks, 14-day frequency caps, 90-day dismissal halts, and copy linter | **14 / 14 PASSED** |
| `services/api/src/subscriptions-invariants.integration.test.ts` | 10 integration tests verifying single-tap cancellation, plan catalog, provider webhooks, surface eligibility blocks, and paywall event frequency capping | **10 / 10 PASSED** |
| Monorepo Typecheck (`pnpm typecheck`) | All 6 packages (`@oddly/shared`, `@oddly/api`, `@oddly/worker`, `@oddly/web`, `@oddly/ui-tokens`, `@oddly/api-client`) | **0 Errors (Clean)** |
| Monorepo Linter (`pnpm lint`) | All 6 packages | **0 Warnings / 0 Errors** |
| Monorepo Unit Suite (`pnpm test`) | 23 test suites across the monorepo | **180 / 180 PASSED** |
| Real-Infra Integration Suite (`pnpm test:integration`) | Real Postgres 16 & Redis 7 suite (statement timeouts, concurrency, rate limits, 100k pipeline benchmark) | **All PASSED** |
| Monorepo Build (`pnpm build`) | Next.js 14 web app + Fastify API + Worker daemons | **All Built Successfully** |

---

## 4. Architectural Invariants Verified

1. **Daily Drop Remains Free & Identical (Rule 12):**
   - No paywall offer can be served or logged on any Drop surface (`drop`, `drop_flow`, etc.).
2. **Zero Pressure to Pay (Rule 17):**
   - No paywall offers during broken streak moments.
   - Frequency cap strictly enforced at 1 offer per 14 days.
   - Dismissal halt strictly freezes offers for 90 days after 2 dismissals.
   - Cancellation requires exactly one API request / tap; zero surveys or delays.
3. **Graceful Entitlement Expiration:**
   - Cancelled subscriptions retain all entitlements until `current_period_end`.
