/**
 * @file orbit.config.ts
 * @package @oddly/api
 *
 * Cached loader for Orbit feature flags and limits (Stage F1 / Task P10A.03).
 * Sourced from app_config table with Redis caching and in-memory safe fallback.
 */

import { prisma } from "../db/client.js";
import { getRedisClient } from "@oddly/shared";

export interface OrbitConfig {
  enabled: boolean;
  maxActivePerPlayer: number;
  keepExpiryHours: number;
  cooldownDays: number;
  maxIncomingPerDay: number;
  expressions: string[];
  tasteSyncMinShared: number;
  tasteSyncEnabled: boolean;
}

export const DEFAULT_ORBIT_CONFIG: OrbitConfig = {
  enabled: true,
  maxActivePerPlayer: 3,
  keepExpiryHours: 48,
  cooldownDays: 30,
  maxIncomingPerDay: 3,
  expressions: ["wave_hand", "sparkle", "nod", "coffee", "high_five", "eyes"],
  tasteSyncMinShared: 5,
  tasteSyncEnabled: true,
};

let cachedConfig: { data: OrbitConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds local cache

export async function getOrbitConfig(): Promise<OrbitConfig> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expiresAt > now) {
    return cachedConfig.data;
  }

  // Try Redis first
  try {
    const redis = getRedisClient("cache");
    if (redis) {
      const cached = await redis.get("config:orbit");
      if (cached) {
        const parsed = JSON.parse(cached) as OrbitConfig;
        cachedConfig = { data: parsed, expiresAt: now + CACHE_TTL_MS };
        return parsed;
      }
    }
  } catch {
    // Redis offline or error, proceed to database
  }

  // Load from Postgres app_config table
  try {
    const rows = await prisma.appConfig.findMany({
      where: {
        key: {
          in: [
            "feature.orbit",
            "features.orbit",
            "orbit.max_active_per_player",
            "orbit.keep_expiry_hours",
            "orbit.cooldown_days",
            "orbit.max_incoming_per_day",
            "orbit.expressions",
            "orbit.taste_sync_min_shared",
            "feature.orbit_subject_sync",
          ],
        },
      },
    });

    const config: OrbitConfig = { ...DEFAULT_ORBIT_CONFIG };

    for (const row of rows) {
      if (row.key === "feature.orbit" || row.key === "features.orbit") {
        config.enabled = row.value === true || row.value === "true" || row.value === 1;
      } else if (row.key === "feature.orbit_subject_sync") {
        config.tasteSyncEnabled = row.value === true || row.value === "true" || row.value === 1;
      } else if (row.key === "orbit.taste_sync_min_shared") {
        config.tasteSyncMinShared = Number(row.value) || 5;
      } else if (row.key === "orbit.max_active_per_player") {
        config.maxActivePerPlayer = Number(row.value) || 3;
      } else if (row.key === "orbit.keep_expiry_hours") {
        config.keepExpiryHours = Number(row.value) || 48;
      } else if (row.key === "orbit.cooldown_days") {
        config.cooldownDays = Number(row.value) || 30;
      } else if (row.key === "orbit.max_incoming_per_day") {
        config.maxIncomingPerDay = Number(row.value) || 3;
      } else if (row.key === "orbit.expressions" && Array.isArray(row.value)) {
        config.expressions = row.value as string[];
      }
    }

    cachedConfig = { data: config, expiresAt: now + CACHE_TTL_MS };

    // Set Redis with 60s TTL
    try {
      const redis = getRedisClient("cache");
      if (redis) {
        await redis.set("config:orbit", JSON.stringify(config), "EX", 60);
      }
    } catch {
      // Ignore Redis write failure
    }

    return config;
  } catch {
    // Database failure: return safe default config
    return DEFAULT_ORBIT_CONFIG;
  }
}
