export interface TurnstileVerificationResult {
  success: boolean;
  errorCodes?: string[];
}

/**
 * Verifies a Cloudflare Turnstile bot protection response token.
 * Passes through in local development when mock keys are configured.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  remoteIp?: string
): Promise<TurnstileVerificationResult> {
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA";

  // Development / Test pass-through
  if (
    process.env.NODE_ENV !== "production" ||
    secretKey.startsWith("1x000") ||
    secretKey.startsWith("mock")
  ) {
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
    // Fail open in case of network timeout to prevent blocking real users
    return { success: true };
  }
}
