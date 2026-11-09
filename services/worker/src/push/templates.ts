/**
 * @file templates.ts
 * @package @oddly/worker
 *
 * Notification channel templates and payload builders (P10.04).
 * Channels: Drop Live, Smart Nudge, Twin Upgrade, Recap, Streak at Risk.
 */

export type PushChannel =
  | "drop_live"
  | "smart_nudge"
  | "twin_upgrade"
  | "recap"
  | "streak_at_risk";

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data: {
    channel: PushChannel;
    url: string;
    timestamp: number;
    [key: string]: unknown;
  };
}

export interface TwinUpgradeParams {
  matchedCount: number;
  totalQuestions?: number;
  city?: string;
  country?: string;
  similarity?: number;
}

export interface StreakAtRiskParams {
  currentStreak: number;
}

export interface PushPayloadOptions {
  twinUpgrade?: TwinUpgradeParams;
  streakAtRisk?: StreakAtRiskParams;
  dropNumber?: number;
}

const DEFAULT_ICON = "/icons/icon-192x192.png";
const DEFAULT_BADGE = "/icons/badge-72x72.png";

/**
 * Builds standard push notification payloads by channel.
 */
export function buildPushPayload(
  channel: PushChannel,
  options?: PushPayloadOptions
): PushNotificationPayload {
  const timestamp = Date.now();

  switch (channel) {
    case "drop_live": {
      return {
        title: "Oddly — New Drop Live",
        body: "Today's five are live. Who thinks like you?",
        icon: DEFAULT_ICON,
        badge: DEFAULT_BADGE,
        tag: "oddly-drop-live",
        data: {
          channel: "drop_live",
          url: "/",
          timestamp,
        },
      };
    }

    case "smart_nudge": {
      return {
        title: "Your twin is waiting",
        body: "Someone answered just like you today. Find your twin before midnight.",
        icon: DEFAULT_ICON,
        badge: DEFAULT_BADGE,
        tag: "oddly-smart-nudge",
        data: {
          channel: "smart_nudge",
          url: "/",
          timestamp,
        },
      };
    }

    case "twin_upgrade": {
      const match = options?.twinUpgrade;
      const count = match?.matchedCount ?? 4;
      const total = match?.totalQuestions ?? 5;
      const location = match?.city
        ? `in ${match.city}`
        : match?.country
        ? `in ${match.country}`
        : "across the world";

      return {
        title: "Stranger Twin Upgrade! ✨",
        body: `Your match just got closer! You now share ${count}/${total} picks with a twin ${location}.`,
        icon: DEFAULT_ICON,
        badge: DEFAULT_BADGE,
        tag: "oddly-twin-upgrade",
        data: {
          channel: "twin_upgrade",
          url: "/results",
          timestamp,
          matchedCount: count,
          similarity: match?.similarity,
        },
      };
    }

    case "recap": {
      return {
        title: "Yesterday's Recap Ready 📊",
        body: "Yesterday's results are locked! See your final twin match and oddness tier.",
        icon: DEFAULT_ICON,
        badge: DEFAULT_BADGE,
        tag: "oddly-recap",
        data: {
          channel: "recap",
          url: "/recap",
          timestamp,
        },
      };
    }

    case "streak_at_risk": {
      const streak = options?.streakAtRisk?.currentStreak ?? 3;
      return {
        title: "Streak at Risk! 🔥",
        body: `Don't break your ${streak}-day flame! Answer today's five picks before 7:00 AM IST.`,
        icon: DEFAULT_ICON,
        badge: DEFAULT_BADGE,
        tag: "oddly-streak-at-risk",
        data: {
          channel: "streak_at_risk",
          url: "/",
          timestamp,
          streak,
        },
      };
    }

    default: {
      const exhaustiveCheck: never = channel;
      throw new Error(`Unhandled push channel: ${exhaustiveCheck}`);
    }
  }
}
