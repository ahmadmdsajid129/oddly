/**
 * @file vapid.ts
 * @package @oddly/worker
 *
 * VAPID Keys and Web Push Configuration (P10.03).
 */

import webpush from "web-push";

export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@oddly.app";

// Default standard test VAPID keys for local dev and automated test suites
export const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIHBQFLXYp5Nksh8U";

export const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || "UUxI4OwegPv4ghUP8Mw4llpCEeI5yN4B8I1qZ0h7lB4";

let isVapidConfigured = false;

export function configureVapid(
  subject = VAPID_SUBJECT,
  publicKey = DEFAULT_VAPID_PUBLIC_KEY,
  privateKey = DEFAULT_VAPID_PRIVATE_KEY
) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isVapidConfigured = true;
  } catch (err) {
    console.warn("[VAPID] Configuration warning:", err);
  }
}

export function isVapidReady(): boolean {
  if (!isVapidConfigured) {
    configureVapid();
  }
  return isVapidConfigured;
}

export { webpush };
