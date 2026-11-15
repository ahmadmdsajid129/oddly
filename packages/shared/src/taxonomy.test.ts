import { describe, expect, it } from "vitest";
import {
  SEED_NEUTRAL_TAGS,
  FORBIDDEN_TOPIC_TERMS,
  isForbiddenTag,
  validateTaxonomy,
} from "./taxonomy.js";

describe("Stage M1 (Phase 10E): Neutral Taxonomy & Forbidden Topics Safety Linter (Rule 14 & P10E.08)", () => {
  it("proves all 14 seed tags are strictly neutral and pass forbidden-topics audit", () => {
    expect(SEED_NEUTRAL_TAGS).toHaveLength(14);
    expect(FORBIDDEN_TOPIC_TERMS.length).toBeGreaterThan(20);
    expect(() => validateTaxonomy(SEED_NEUTRAL_TAGS)).not.toThrow();

    for (const tag of SEED_NEUTRAL_TAGS) {
      expect(isForbiddenTag(tag.key, tag.label_i18n.en)).toBe(false);
      expect(tag.category).toBeTruthy();
      expect(tag.label_i18n.en).toBeTruthy();
    }
  });

  it("build-fails immediately if any forbidden topic term is injected as a tag key or label", () => {
    // Religion
    expect(isForbiddenTag("religion-beliefs")).toBe(true);
    expect(isForbiddenTag("hindu-rituals")).toBe(true);
    expect(isForbiddenTag("puja-habits")).toBe(true);

    // Caste
    expect(isForbiddenTag("caste-status")).toBe(true);
    expect(isForbiddenTag("brahmin-caste")).toBe(true);

    // Politics
    expect(isForbiddenTag("politics-elections")).toBe(true);
    expect(isForbiddenTag("bjp-voters")).toBe(true);
    expect(isForbiddenTag("congress-party")).toBe(true);

    // Sexuality
    expect(isForbiddenTag("sexuality-dating")).toBe(true);
    expect(isForbiddenTag("erotic-mood")).toBe(true);

    // Medical & Mental Health
    expect(isForbiddenTag("health-depression")).toBe(true);
    expect(isForbiddenTag("medical-diagnosis")).toBe(true);

    // Body Image
    expect(isForbiddenTag("body-weight-diet")).toBe(true);
    expect(isForbiddenTag("skin-tone-fairness")).toBe(true);

    // Living Individuals & Brands
    expect(isForbiddenTag("celebrity-cricketer")).toBe(true);
    expect(isForbiddenTag("brand-sponsorship")).toBe(true);
  });

  it("throws descriptive error when validating taxonomy containing a forbidden tag", () => {
    const contaminatedTaxonomy = [
      ...SEED_NEUTRAL_TAGS,
      {
        key: "politics-party",
        category: "political",
        label_i18n: { en: "Party Affiliation" },
      },
    ];

    expect(() => validateTaxonomy(contaminatedTaxonomy)).toThrowError(
      /Taxonomy Safety Violation/
    );
  });
});

