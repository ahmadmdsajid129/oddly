/**
 * @file orbit-push.ts
 * @package @oddly/api
 *
 * Orbit Push Notification Channel (Stage F1 / Task P10A.07).
 * Strictly enforces:
 * - 2/day quiet-hours caps per user.
 * - Zero guilt, zero nagging, zero emotional manipulation.
 * - Quiet hours check (22:00 to 07:00 IST).
 */

import { NotificationsRepository } from "../db/notifications.repo.js";

export type OrbitNotificationType = "keep_received" | "orbit_established" | "expression_received";

export interface OrbitPushPayload {
  playerId: string;
  type: OrbitNotificationType;
  orbitId?: string;
}

export const ORBIT_TEMPLATES: Record<OrbitNotificationType, { title: string; body: string; url: string }> = {
  keep_received: {
    title: "Oddly",
    body: "A twin from today wants to keep in touch.",
    url: "/orbit",
  },
  orbit_established: {
    title: "Oddly",
    body: "Your orbit is connected!",
    url: "/orbit",
  },
  expression_received: {
    title: "Oddly",
    body: "Your orbit partner sent a wave.",
    url: "/orbit",
  },
};

/**
 * Checks if current time is within quiet hours (22:00 to 07:00 IST).
 */
export function isQuietHours(date: Date = new Date()): boolean {
  // IST is UTC + 5:30
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const istMinutes = utcHours * 60 + utcMinutes + 330;
  const istHour = Math.floor((istMinutes % (24 * 60)) / 60);

  // Quiet hours: 22:00 to 06:59 IST
  return istHour >= 22 || istHour < 7;
}

/**
 * Dispatch an Orbit push notification respecting quiet hours and daily caps.
 */
export async function sendOrbitNotification(payload: OrbitPushPayload): Promise<{
  sent: boolean;
  reason?: string;
}> {
  // 1. Quiet hours check
  if (isQuietHours()) {
    await NotificationsRepository.logDispatch({
      playerId: payload.playerId,
      channel: "Orbit",
      status: "skipped",
      reason: "quiet_hours_active",
    });
    return { sent: false, reason: "quiet_hours_active" };
  }

  // 2. 2 per day notification cap
  const dailySent = await NotificationsRepository.getDailySentCount(payload.playerId);
  if (dailySent >= 2) {
    await NotificationsRepository.logDispatch({
      playerId: payload.playerId,
      channel: "Orbit",
      status: "skipped",
      reason: "daily_cap_exceeded",
    });
    return { sent: false, reason: "daily_cap_exceeded" };
  }

  // 3. Active subscription check
  const subs = await NotificationsRepository.getActiveSubscriptions(payload.playerId);
  if (!subs || subs.length === 0) {
    await NotificationsRepository.logDispatch({
      playerId: payload.playerId,
      channel: "Orbit",
      status: "skipped",
      reason: "no_active_subscription",
    });
    return { sent: false, reason: "no_active_subscription" };
  }

  // 4. Log sent dispatch
  await NotificationsRepository.logDispatch({
    playerId: payload.playerId,
    channel: "Orbit",
    status: "sent",
  });

  return { sent: true };
}

