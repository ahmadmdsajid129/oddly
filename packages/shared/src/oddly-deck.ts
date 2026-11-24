/**
 * @file oddly-deck.ts
 * @package @oddly/shared
 *
 * Stage B0 Slice B4: Oddly Deck Lite (Flag OFF).
 *
 * Collectible digital card binder showcasing rare and eccentric picks.
 * Invariant: Disabled by default behind `feature.oddly_deck = false`.
 */

export interface OddlyDeckCard {
  id: string;
  dropDate: string;
  questionId: string;
  questionPrompt: string;
  pickValue: string;
  selfInformationBits: number;
  rarityTier: "common" | "uncommon" | "rare" | "mythic";
  holographic: boolean;
}

export interface OddlyDeckConfig {
  flagEnabled: boolean;
  minRareBits: number;
}

export const DEFAULT_ODDLY_DECK_CONFIG: OddlyDeckConfig = {
  flagEnabled: false, // Invariant: Flag OFF in v1 base
  minRareBits: 3.0,
};

export function isOddlyDeckEnabled(flag?: boolean): boolean {
  return flag ?? DEFAULT_ODDLY_DECK_CONFIG.flagEnabled;
}

/**
 * Filter rare picks eligible for the player's Oddly Deck card binder.
 */
export function extractDeckCards(
  picks: {
    dropDate: string;
    questionId: string;
    questionPrompt: string;
    pickValue: string;
    selfInformationBits: number;
  }[],
  config?: Partial<OddlyDeckConfig>
): OddlyDeckCard[] {
  if (!isOddlyDeckEnabled(config?.flagEnabled)) {
    return []; // Graceful silent degradation when flag is OFF
  }

  const minBits = config?.minRareBits ?? DEFAULT_ODDLY_DECK_CONFIG.minRareBits;

  return picks
    .filter((p) => p.selfInformationBits >= minBits)
    .map((p) => {
      const bits = p.selfInformationBits;
      const rarityTier =
        bits >= 4.5 ? "mythic" : bits >= 3.8 ? "rare" : "uncommon";

      return {
        id: `deck-${p.questionId}-${p.dropDate}`,
        dropDate: p.dropDate,
        questionId: p.questionId,
        questionPrompt: p.questionPrompt,
        pickValue: p.pickValue,
        selfInformationBits: bits,
        rarityTier,
        holographic: rarityTier === "mythic",
      };
    });
}
