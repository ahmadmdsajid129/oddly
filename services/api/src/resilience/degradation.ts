/**
 * @file degradation.ts
 * @package @oddly/api
 *
 * Five-Level Graceful Degradation Ladder Engine (R2.5 & Addendum Section 6)
 *
 * Levels:
 * - L0: Normal Operations (full fidelity, real-time matching)
 * - L1: Elevated Traffic (stats cache 60s, refresh interval doubled, on-demand cards)
 * - L2: Peak Drop Crunch (twin upgrades paused, stale history/world reads up to 10m, low-priority routes return 503 OVERLOADED)
 * - L3: Emergency Shedding (sign-ups paused, matching deferred: submit returns pending screen)
 * - L4: Safe Harbor (read-only / offline banner, client-side pick buffering)
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db/client.js";

let cachedLevel = 0;
let lastLevelFetch = 0;
let manualOverride: number | null = null;

export const DegradationManager = {
  /**
   * Set manual override (beats automatic level).
   */
  setManualOverride(level: number | null): void {
    manualOverride = level;
    if (level !== null) cachedLevel = level;
  },

  /**
   * Returns active degradation level (0 - 4), cached for 5 seconds.
   */
  async getLevel(): Promise<number> {
    if (manualOverride !== null) {
      return manualOverride;
    }

    const now = Date.now();
    if (now - lastLevelFetch < 5000) {
      return cachedLevel;
    }

    try {
      const cfg = await prisma.appConfig.findUnique({
        where: { key: "degradation_level" },
      });
      if (cfg && typeof cfg.value === "number") {
        cachedLevel = cfg.value;
      } else if (cfg && typeof cfg.value === "string") {
        cachedLevel = parseInt(cfg.value, 10) || 0;
      }
    } catch {
      // Keep cached level on DB glitch
    }

    lastLevelFetch = now;
    return cachedLevel;
  },

  /**
   * Fastify hook setting x-oddly-degradation-level on all responses.
   */
  async attachResponseHeader(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const level = await DegradationManager.getLevel();
    reply.header("x-oddly-degradation-level", String(level));
  },

  /**
   * Guards low-priority endpoints under L2+ shedding.
   */
  async checkLowPriorityShedding(_req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const level = await DegradationManager.getLevel();
    if (level >= 2) {
      reply.status(503).header("Retry-After", "30").send({
        ok: false,
        error: "OVERLOADED",
        message: "This service is temporarily shedding low-priority traffic during peak drop traffic. Please retry in 30 seconds.",
        degradation_level: level,
      });
      return true;
    }
    return false;
  },

  /**
   * Guards new account creation / sign-up under L3+ emergency shedding.
   */
  async checkSignUpAllowed(reply: FastifyReply): Promise<boolean> {
    const level = await DegradationManager.getLevel();
    if (level >= 3) {
      reply.status(403).send({
        ok: false,
        error: "SIGNUPS_TEMPORARILY_PAUSED",
        message: "New account creation is temporarily paused under heavy drop traffic. You can continue playing freely as a guest!",
        degradation_level: level,
      });
      return false;
    }
    return true;
  },
};
