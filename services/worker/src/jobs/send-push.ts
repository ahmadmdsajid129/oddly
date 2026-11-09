/**
 * @file send-push.ts
 * @package @oddly/worker
 *
 * BullMQ processor for Web Push dispatch utilizing web-push (P10.03).
 * Enforces VAPID signing, delivery policy, and handles expired tokens (410/404).
 */

import type { Job } from "bullmq";
import { webpush, isVapidReady } from "../push/vapid.js";
import { evaluatePushPolicy, type PushPolicyCheckParams } from "../push/policy.js";
import type { PushNotificationPayload } from "../push/templates.js";

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SendPushJobData {
  playerId?: string;
  subscription: PushSubscriptionData;
  payload: PushNotificationPayload | string;
  policyCheck?: PushPolicyCheckParams;
}

export interface SendPushJobResult {
  delivered: boolean;
  statusCode?: number;
  expired?: boolean;
  reason?: string;
  durationMs: number;
}

/**
 * BullMQ processor for dispatching a Web Push notification to a single subscriber.
 */
export async function processSendPushJob(
  job: Job<SendPushJobData>
): Promise<SendPushJobResult> {
  const start = Date.now();
  const { playerId, subscription, payload, policyCheck } = job.data;

  // 1. Enforce delivery policy (quiet hours & 2-per-day cap) if policyCheck provided
  if (policyCheck) {
    const decision = evaluatePushPolicy(policyCheck);
    if (!decision.allowed) {
      return {
        delivered: false,
        reason: decision.reason || "Blocked by push policy",
        durationMs: Date.now() - start,
      };
    }
  }

  // 2. Ensure VAPID configuration is ready
  isVapidReady();

  // 3. Format payload
  const stringifiedPayload =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  // 4. Send via web-push
  try {
    const response = await webpush.sendNotification(
      subscription,
      stringifiedPayload
    );

    return {
      delivered: true,
      statusCode: response.statusCode,
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const pushErr = err as {
      statusCode?: number;
      status?: number;
      message?: string;
    };
    const statusCode = pushErr.statusCode || pushErr.status;
    const isExpired = statusCode === 410 || statusCode === 404;

    if (isExpired) {
      console.warn(
        `[WebPush] Subscription expired or unregistered (HTTP ${statusCode}) for endpoint: ${subscription.endpoint}`
      );
    } else {
      console.error(
        `[WebPush] Dispatch error (HTTP ${statusCode}) for player ${playerId || "anonymous"}:`,
        pushErr.message || err
      );
    }

    return {
      delivered: false,
      statusCode,
      expired: isExpired,
      reason: pushErr.message || `WebPush failed with HTTP ${statusCode}`,
      durationMs: Date.now() - start,
    };
  }
}
