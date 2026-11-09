/**
 * @file push.ts
 * @package @oddly/web
 *
 * Web Push and Service Worker registration client helpers (P10.01, P10.02).
 */

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIHBQFLXYp5Nksh8U";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "default";
  return Notification.permission;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers service worker at /sw.js
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch (err) {
    console.warn("[SW] Registration failed:", err);
    return null;
  }
}

/**
 * Requests notification permission and subscribes to Web Push.
 */
export async function subscribeUserToPush(
  vapidKey = VAPID_PUBLIC_KEY
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "Push notifications are not supported by this browser." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: "Notification permission was denied." };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // Persist status in localStorage
    try {
      localStorage.setItem("oddly_push_subscribed", "true");
    } catch {
      // ignore
    }

    // Sync subscription to backend (P10.02, P10.09)
    try {
      const subJson = subscription.toJSON();
      if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
        await fetch("/v1/me/push-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          }),
        });
      }
    } catch (err) {
      console.warn("[Push] Failed to sync subscription to backend:", err);
    }

    return { success: true, subscription };
  } catch (err: any) {
    console.error("[Push] Subscription error:", err);
    return { success: false, error: err?.message || "Failed to subscribe to push notifications" };
  }
}

/**
 * Checks if user is eligible for second-visit push permission prompt (P10.02).
 */
export function shouldShowPushPrompt(): boolean {
  if (typeof window === "undefined" || !isPushSupported()) return false;
  if (Notification.permission !== "default") return false;

  try {
    const dismissed = localStorage.getItem("oddly_push_prompt_dismissed");
    if (dismissed === "true") return false;

    // Check visit count
    const visitCount = parseInt(localStorage.getItem("oddly_visit_count") || "1", 10);
    return visitCount >= 2;
  } catch {
    return false;
  }
}

export function recordVisit(): void {
  if (typeof window === "undefined") return;
  try {
    const count = parseInt(localStorage.getItem("oddly_visit_count") || "0", 10);
    localStorage.setItem("oddly_visit_count", String(count + 1));
  } catch {
    // ignore
  }
}
