/**
 * @file taxonomy.ts
 * @package @oddly/shared
 *
 * Neutral Subject Taxonomy and Forbidden Topics Guard (Stage M1 / Phase 10E / F24 / Rule 14).
 *
 * Invariants:
 * 1. Strict neutrality: Every tag key represents a universally neutral lifestyle, quirk, or aesthetic theme.
 * 2. Rule 14 Safety Guard: Automated check against Section 9.1 Forbidden Topic List (religion, politics, caste, sexuality, health, body image, living people, commercial brands).
 * 3. Build-fail verification: Any tag matching the forbidden list immediately fails the automated test suite.
 */

export interface SubjectTagDefinition {
  key: string;
  category: string;
  label_i18n: {
    en: string;
    hi?: string;
    [locale: string]: string | undefined;
  };
}

/**
 * 14 Neutral Subject Tags (Founder-approved for v1.0, Stage M1).
 * Strictly audited: zero overlap with protected classes, demographic inference, or sensitive topics.
 */
export const SEED_NEUTRAL_TAGS: readonly SubjectTagDefinition[] = [
  {
    key: "humour",
    category: "lifestyle",
    label_i18n: { en: "Humour & Chuckles" },
  },
  {
    key: "daily-habits",
    category: "lifestyle",
    label_i18n: { en: "Daily Habits & Routines" },
  },
  {
    key: "absurd-hypotheticals",
    category: "imagination",
    label_i18n: { en: "Absurd Hypotheticals" },
  },
  {
    key: "food-style",
    category: "culture",
    label_i18n: { en: "Food Style & Cravings" },
  },
  {
    key: "sleep-and-time",
    category: "lifestyle",
    label_i18n: { en: "Sleep & Timekeeping" },
  },
  {
    key: "decision-style",
    category: "psychology",
    label_i18n: { en: "Decision Making Style" },
  },
  {
    key: "nostalgia",
    category: "culture",
    label_i18n: { en: "Nostalgia & Memories" },
  },
  {
    key: "phone-behaviour",
    category: "digital",
    label_i18n: { en: "Phone & Screen Behaviour" },
  },
  {
    key: "music-mood",
    category: "culture",
    label_i18n: { en: "Music & Soundscapes" },
  },
  {
    key: "places",
    category: "exploration",
    label_i18n: { en: "Places & Wandering" },
  },
  {
    key: "word-and-mood",
    category: "expression",
    label_i18n: { en: "Words & Moods" },
  },
  {
    key: "colour-and-aesthetics",
    category: "expression",
    label_i18n: { en: "Colour & Aesthetics" },
  },
  {
    key: "work-and-study-style",
    category: "lifestyle",
    label_i18n: { en: "Work & Study Habits" },
  },
  {
    key: "quirks",
    category: "personality",
    label_i18n: { en: "Odd Quirks & Peculiarities" },
  },
] as const;

/**
 * Section 9.1 Forbidden Topic Filter Words.
 * Any tag matching or containing these root terms is strictly prohibited.
 */
export const FORBIDDEN_TOPIC_TERMS = [
  // 1. Religion & Faith
  "religion", "religious", "faith", "god", "deity", "temple", "mosque", "church", "prayer",
  "ritual", "scripture", "bible", "quran", "gita", "puja", "namaz", "ramadan", "diwali",
  "christmas", "eid", "hindu", "muslim", "christian", "sikh", "jain", "buddhist",
  // 2. Caste & Community
  "caste", "brahmin", "dalit", "kshatriya", "vaishya", "shudra", "reservation", "subcaste",
  // 3. Electoral & Partisan Politics
  "politics", "political", "election", "vote", "bjp", "congress", "aap", "government",
  "minister", "prime-minister", "modi", "gandhi", "parliament", "party", "ballot",
  // 4. Sexuality & Romance
  "sex", "sexual", "dating", "romance", "porn", "nsfw", "erotic", "intimacy",
  // 5. Medical & Mental Health
  "health", "medical", "disease", "cancer", "depression", "anxiety", "diagnosis", "doctor",
  "hospital", "therapy", "medication", "disability", "disorder",
  // 6. Body Image & Appearance
  "body", "weight", "fat", "skinny", "height", "skin-tone", "fair", "dark-skin", "beauty-standard",
  // 7. Living Individuals / Celebrities
  "celebrity", "influencer", "actor", "actress", "cricketer", "politician",
  // 8. Commercial Brands
  "brand", "corporate", "sponsor", "apple", "google", "samsung", "nike", "adidas",
] as const;

/**
 * Checks whether a given tag key or label violates the Section 9.1 forbidden topics list.
 */
export function isForbiddenTag(key: string, label?: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedLabel = (label || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const term of FORBIDDEN_TOPIC_TERMS) {
    const cleanTerm = term.replace(/[^a-z0-9]/g, "");
    if (normalizedKey.includes(cleanTerm) || (normalizedLabel && normalizedLabel.includes(cleanTerm))) {
      return true;
    }
  }

  return false;
}

/**
 * Audits a list of tags against the forbidden topics list.
 * Throws a descriptive error if any tag violates neutrality.
 */
export function validateTaxonomy(tags: readonly { key: string; label_i18n?: { en: string } }[]): void {
  for (const tag of tags) {
    const label = tag.label_i18n?.en || "";
    if (isForbiddenTag(tag.key, label)) {
      throw new Error(
        `[Taxonomy Safety Violation] Tag '${tag.key}' violates Section 9.1 Forbidden Topic List!`
      );
    }
  }
}

