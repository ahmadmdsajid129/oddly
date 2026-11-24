/**
 * @file chat-unlock.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice A12: Chat Unlock Engine (Three Doors, Duo Trial v0, Both-Confirm, chat_ready).
 *
 * Requirements:
 * - Three Doors:
 *   1. Door 1: Duo Trial v0 (8 two-option prompts, pass if >= 5 matches)
 *   2. Door 2: Co-Streak (>= 3 days)
 *   3. Door 3: Sync Score (>= 60% agreement)
 * - Both-Confirm State Machine:
 *   closed -> pending_confirm (one player confirmed) -> chat_ready (both confirmed)
 * - Scope fence: Chat messaging itself is strictly NOT built; chat_ready is the terminal state.
 */

export interface TrialPromptItem {
  id: string;
  prompt_text: string;
  option_a: string;
  option_b: string;
  category: string;
}

export const DEFAULT_TRIAL_PROMPTS: readonly TrialPromptItem[] = [
  {
    id: "trial-1",
    prompt_text: "Morning ritual: how do you begin?",
    option_a: "Coffee first, questions later",
    option_b: "Tea, hot shower, slow awakening",
    category: "daily",
  },
  {
    id: "trial-2",
    prompt_text: "Natural schedule rhythm:",
    option_a: "Night owl alive after midnight",
    option_b: "Early bird catching sunrise",
    category: "rhythm",
  },
  {
    id: "trial-3",
    prompt_text: "Ideal weekend getaway terrain:",
    option_a: "Pine mountains and crisp air",
    option_b: "Warm beach with ocean waves",
    category: "travel",
  },
  {
    id: "trial-4",
    prompt_text: "Quick communication preference:",
    option_a: "Text message with funny reaction",
    option_b: "A quick 2-minute voice call",
    category: "social",
  },
  {
    id: "trial-5",
    prompt_text: "Weekend planning style:",
    option_a: "Firm itinerary with bookings",
    option_b: "Completely open and spontaneous",
    category: "planning",
  },
  {
    id: "trial-6",
    prompt_text: "Dinner when tired after work:",
    option_a: "Home-cooked simple comfort food",
    option_b: "Order delivery from favourite spot",
    category: "food",
  },
  {
    id: "trial-7",
    prompt_text: "Snack craving under pressure:",
    option_a: "Sweet dessert / chocolate bar",
    option_b: "Crispy savory chips / salted nuts",
    category: "food",
  },
  {
    id: "trial-8",
    prompt_text: "Companion energy at home:",
    option_a: "Loyal dog greeting at the door",
    option_b: "Independent cat napping on desk",
    category: "companion",
  },
] as const;

export interface TrialAnswerEntry {
  prompt_id: string;
  choice: string;
}

export interface TrialScoreResult {
  matches: number;
  total: number;
  passed: boolean;
  passMark: number;
}

/**
 * Score a Duo Trial attempt between two players.
 */
export function scoreDuoTrial(
  answersA: TrialAnswerEntry[],
  answersB: TrialAnswerEntry[],
  passMark = 5
): TrialScoreResult {
  const mapA = new Map<string, string>();
  for (const a of answersA) {
    mapA.set(a.prompt_id, a.choice);
  }

  let matches = 0;
  let totalEvaluated = 0;

  for (const b of answersB) {
    if (mapA.has(b.prompt_id)) {
      totalEvaluated++;
      if (mapA.get(b.prompt_id) === b.choice) {
        matches++;
      }
    }
  }

  return {
    matches,
    total: totalEvaluated,
    passed: matches >= passMark,
    passMark,
  };
}

export interface EvaluateThreeDoorsParams {
  trialPassed?: boolean;
  coStreak: number;
  syncScorePct?: number;
  streakThreshold?: number;
  syncThreshold?: number;
}

export interface ThreeDoorsEvaluation {
  isUnlocked: boolean;
  unlockedBy: "trial" | "streak" | "sync" | null;
  doors: {
    trial: { passed: boolean };
    streak: { passed: boolean; current: number; required: number };
    sync: { passed: boolean; current: number; required: number };
  };
}

/**
 * Evaluate whether any of the Three Doors has unlocked the connection.
 */
export function evaluateThreeDoors(
  params: EvaluateThreeDoorsParams
): ThreeDoorsEvaluation {
  const streakThreshold = params.streakThreshold ?? 3;
  const syncThreshold = params.syncThreshold ?? 60;

  const trialPassed = Boolean(params.trialPassed);
  const streakPassed = params.coStreak >= streakThreshold;
  const syncPassed = (params.syncScorePct ?? 0) >= syncThreshold;

  let unlockedBy: "trial" | "streak" | "sync" | null = null;
  if (trialPassed) {
    unlockedBy = "trial";
  } else if (streakPassed) {
    unlockedBy = "streak";
  } else if (syncPassed) {
    unlockedBy = "sync";
  }

  return {
    isUnlocked: trialPassed || streakPassed || syncPassed,
    unlockedBy,
    doors: {
      trial: { passed: trialPassed },
      streak: {
        passed: streakPassed,
        current: params.coStreak,
        required: streakThreshold,
      },
      sync: {
        passed: syncPassed,
        current: params.syncScorePct ?? 0,
        required: syncThreshold,
      },
    },
  };
}

export interface TransitionChatConfirmParams {
  currentChatState: string; // 'closed' | 'pending_confirm' | 'chat_ready'
  callerPlayerId: string;
  consentPlayerId: string | null;
  unlockState: string; // 'locked' | 'unlocked'
}

export interface TransitionChatConfirmResult {
  ok: boolean;
  error?: string;
  nextChatState: string;
  consentPlayerId: string | null;
  isReady: boolean;
  alreadyConfirmed?: boolean;
}

/**
 * Both-Confirm state machine leading to terminal state `chat_ready`.
 */
export function transitionChatConfirm(
  params: TransitionChatConfirmParams
): TransitionChatConfirmResult {
  if (params.unlockState !== "unlocked") {
    return {
      ok: false,
      error: "DOORS_LOCKED",
      nextChatState: params.currentChatState,
      consentPlayerId: params.consentPlayerId,
      isReady: false,
    };
  }

  if (params.currentChatState === "chat_ready") {
    return {
      ok: true,
      nextChatState: "chat_ready",
      consentPlayerId: params.consentPlayerId,
      isReady: true,
    };
  }

  if (params.currentChatState === "closed" || !params.consentPlayerId) {
    return {
      ok: true,
      nextChatState: "pending_confirm",
      consentPlayerId: params.callerPlayerId,
      isReady: false,
    };
  }

  // Already pending_confirm
  if (params.consentPlayerId === params.callerPlayerId) {
    return {
      ok: true,
      nextChatState: "pending_confirm",
      consentPlayerId: params.callerPlayerId,
      isReady: false,
      alreadyConfirmed: true,
    };
  }

  // Other player confirmed! Now both have confirmed -> chat_ready
  return {
    ok: true,
    nextChatState: "chat_ready",
    consentPlayerId: params.consentPlayerId,
    isReady: true,
  };
}
