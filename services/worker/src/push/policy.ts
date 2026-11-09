/**
 * @file policy.ts
 * @package @oddly/worker
 *
 * Push Delivery Policy & Anti-Annoyance Constraints (P10.05).
 * - Maximum 2 pushes per user per calendar day.
 * - Strict quiet hours: 22:00 to 07:00 IST (UTC+05:30).
 */

export const MAX_PUSHES_PER_DAY = 2;
export const DEFAULT_QUIET_HOURS_START = "22:00"; // 10:00 PM IST
export const DEFAULT_QUIET_HOURS_END = "07:00";   // 07:00 AM IST

/**
 * Returns hours, minutes, and calendar date in Indian Standard Time (IST, UTC+05:30).
 */
export function getIstTime(date: Date = new Date()): {
  hours: number;
  minutes: number;
  totalMinutes: number;
  dayString: string;
} {
  const utcMillis = date.getTime();
  const istOffsetMillis = (5 * 60 + 30) * 60 * 1000;
  const istDate = new Date(utcMillis + istOffsetMillis);

  const hours = istDate.getUTCHours();
  const minutes = istDate.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;
  const dayString = istDate.toISOString().slice(0, 10);

  return { hours, minutes, totalMinutes, dayString };
}

/**
 * Parses "HH:mm" time string into total minutes from start of day.
 */
export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  return hours * 60 + minutes;
}

/**
 * Checks if a given Date is within quiet hours in IST.
 * By default, 22:00 to 07:00 IST is quiet.
 */
export function isQuietHour(
  date: Date = new Date(),
  startStr: string = DEFAULT_QUIET_HOURS_START,
  endStr: string = DEFAULT_QUIET_HOURS_END
): boolean {
  const { totalMinutes } = getIstTime(date);
  const startMin = parseTimeToMinutes(startStr);
  const endMin = parseTimeToMinutes(endStr);

  if (startMin > endMin) {
    // Spans across midnight (e.g., 22:00 to 07:00)
    return totalMinutes >= startMin || totalMinutes < endMin;
  } else {
    // Single-day window (e.g., 01:00 to 05:00)
    return totalMinutes >= startMin && totalMinutes < endMin;
  }
}

export interface PushPolicyCheckParams {
  playerId: string;
  currentPushesToday: number;
  date?: Date;
  notificationsEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  forceOverride?: boolean;
}

export interface PushPolicyDecision {
  allowed: boolean;
  reason?: string;
}

/**
 * Evaluates whether a push notification may be delivered to a player.
 */
export function evaluatePushPolicy(params: PushPolicyCheckParams): PushPolicyDecision {
  if (params.forceOverride) {
    return { allowed: true };
  }

  // 1. User opted out of notifications
  if (params.notificationsEnabled === false) {
    return {
      allowed: false,
      reason: "User has disabled push notifications in preferences.",
    };
  }

  // 2. Strict daily capping: maximum 2 pushes per calendar day
  if (params.currentPushesToday >= MAX_PUSHES_PER_DAY) {
    return {
      allowed: false,
      reason: `Daily push limit reached (maximum ${MAX_PUSHES_PER_DAY} per day).`,
    };
  }

  // 3. Strict quiet hours (default: 22:00 to 07:00 IST)
  const quietEnabled = params.quietHoursEnabled !== false; // default true
  if (quietEnabled) {
    const checkDate = params.date || new Date();
    const startStr = params.quietHoursStart || DEFAULT_QUIET_HOURS_START;
    const endStr = params.quietHoursEnd || DEFAULT_QUIET_HOURS_END;

    if (isQuietHour(checkDate, startStr, endStr)) {
      return {
        allowed: false,
        reason: `Current time is within quiet hours (${startStr} - ${endStr} IST).`,
      };
    }
  }

  return { allowed: true };
}
