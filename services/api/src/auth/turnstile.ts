/**
 * @file turnstile.ts
 * @package @oddly/api
 *
 * Cloudflare Turnstile bot verification check with fail-open circuit breaker (P7.11, Architecture Sec 13).
 *
 * Policy:
 *   - High-Risk Actions (Sign-up / Account Linking): Strictly FAIL-CLOSED during Turnstile gateway outages.
 *   - Low-Risk Actions (Drop Play / Answer Submission): FAIL-OPEN with tighter rate-limiting during outages.
 */

import { turnstileBreaker } from "../resilience/circuit-breakers.js";

export interface TurnstileVerificationResult {
  success: boolean;
  errorCodes?: string[];
  fallback?: boolean;
  tighterRateLimitRequired?: boolean;
  message?: string;
}

export interface VerifyTurnstileOptions {
  isSignUp?: boolean;
  action?: "signup" | "play" | "submit" | "meme" | string;
}

/**
 * Verifies a Cloudflare Turnstile bot protection response token.
 * Passes through in local development when mock keys are configured.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string,
  options?: VerifyTurnstileOptions
): Promise<TurnstileVerificationResult> {
  const isSignUp = options?.isSignUp ?? false;
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";

  // Development / Test pass-through
  if (
    process.env.NODE_ENV !== "production" ||
    secretKey.startsWith("1x000") ||
    secretKey.startsWith("mock")
  ) {
    if (token === "invalid_bot_token_fail" || token === "simulate_fail") {
      return { success: false, errorCodes: ["invalid-input-response"] };
    }
    if (token === "trigger-turnstile-failure") {
      // Simulate gateway outage via circuit breaker (P7.11)
      try {
        await turnstileBreaker.fire({ token, isSignUp });
      } catch {
        // Handled by breaker fallback
      }
      if (isSignUp) {
        return {
          success: false,
          fallback: true,
          errorCodes: ["turnstile-outage-fail-closed"],
          message: "Sign-up bot verification temporarily unavailable. Please retry shortly.",
        };
      }
      return {
        success: true,
        fallback: true,
        tighterRateLimitRequired: true,
      };
    }
    return { success: true };
  }

  if (!token) {
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: AbortSignal.timeout(3000), // 3-second timeout on Turnstile outbound call (R1.3)
      }
    );

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    return {
      success: data.success,
      errorCodes: data["error-codes"],
    };
  } catch (err) {
    console.warn("[Turnstile] Verification check failed:", err);

    // Fail-closed for sign-up (high-risk), fail-open for low-risk actions (P7.11)
    if (isSignUp) {
      return {
        success: false,
        fallback: true,
        errorCodes: ["turnstile-outage-fail-closed"],
        message: "Sign-up bot verification temporarily unavailable. Please retry shortly.",
      };
    }

    return {
      success: true,
      fallback: true,
      tighterRateLimitRequired: true,
    };
  }
}
