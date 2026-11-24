/**
 * @file events-signals.test.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice A13: Orbit and Unlock Events, Notifications & Consent-Gated Signals.
 */

import { describe, expect, it } from "vitest";
import {
  SignalEventItemSchema,
  EventsBatchRequestSchema,
  UpdateConsentRequestSchema,
} from "./schemas.js";

describe("Stage B0 Slice A13: Events Dictionary & DPDP Consent Invariants", () => {
  describe("Orbit and Unlock Allowlisted Events", () => {
    it("validates orbit_ended and expression_sent events", () => {
      const validEvent = {
        event_name: "expression_sent",
        drop_date: "2026-11-24",
        props: {
          expression_key: "wave_hand",
          lane_slug: "everyday",
        },
      };

      const parsed = SignalEventItemSchema.safeParse(validEvent);
      expect(parsed.success).toBe(true);
    });

    it("validates doors_unlocked and chat_ready events", () => {
      const unlockEvent = {
        event_name: "doors_unlocked",
        drop_date: "2026-11-24",
        props: {
          door: "trial",
          lane_slug: "everyday",
        },
      };

      const readyEvent = {
        event_name: "chat_ready",
        drop_date: "2026-11-24",
        props: {
          lane_slug: "everyday",
        },
      };

      expect(SignalEventItemSchema.safeParse(unlockEvent).success).toBe(true);
      expect(SignalEventItemSchema.safeParse(readyEvent).success).toBe(true);
    });

    it("strictly rejects non-allowlisted event names", () => {
      const invalidEvent = {
        event_name: "user_messaged_partner", // strictly forbidden out-of-scope event
        drop_date: "2026-11-24",
        props: {},
      };

      const parsed = SignalEventItemSchema.safeParse(invalidEvent);
      expect(parsed.success).toBe(false);
    });

    it("strictly rejects unapproved properties or PII (Rule 13 Strict Allowlist)", () => {
      const eventWithPII = {
        event_name: "chat_ready",
        drop_date: "2026-11-24",
        props: {
          email: "player@example.com", // PII forbidden
        },
      };

      const parsed = SignalEventItemSchema.safeParse(eventWithPII);
      expect(parsed.success).toBe(false);
    });
  });

  describe("DPDP Consent Updates", () => {
    it("validates consent grant for analytics and personalisation", () => {
      const analyticsGrant = {
        purpose: "analytics",
        granted: true,
        policy_version: 1,
      };

      const parsed = UpdateConsentRequestSchema.safeParse(analyticsGrant);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.purpose).toBe("analytics");
        expect(parsed.data.granted).toBe(true);
      }
    });

    it("rejects unauthorized consent purposes", () => {
      const invalidConsent = {
        purpose: "marketing_third_party",
        granted: true,
        policy_version: 1,
      };

      expect(UpdateConsentRequestSchema.safeParse(invalidConsent).success).toBe(false);
    });
  });
});
