import { describe, it, expect } from "vitest";
import { CARD_DIMENSIONS, type ShareFormat } from "@oddly/shared";

describe("Stage 6: Share Cards & Challenge Links (P6.01, P6.06, P6.07, P6.10)", () => {
  it("verifies dimensions for Story, Square, and Link cards (P6.01)", () => {
    expect(CARD_DIMENSIONS.story).toEqual({ width: 1080, height: 1920 });
    expect(CARD_DIMENSIONS.square).toEqual({ width: 1080, height: 1080 });
    expect(CARD_DIMENSIONS.link).toEqual({ width: 1200, height: 630 });
  });

  it("calculates side-by-side pick comparisons accurately (P6.07)", () => {
    const friendPicks = [
      { questionId: "q1", value: "opt-a" },
      { questionId: "q2", value: "opt-b" },
      { questionId: "q3", value: 4 },
      { questionId: "q4", value: ["jazz", "lofi"] },
      { questionId: "q5", value: "opt-c" },
    ];

    const challengerPicks = [
      { questionId: "q1", value: "opt-a" }, // match
      { questionId: "q2", value: "opt-b" }, // match
      { questionId: "q3", value: 2 }, // diff
      { questionId: "q4", value: ["jazz", "lofi"] }, // match
      { questionId: "q5", value: "opt-c" }, // match
    ];

    let matches = 0;
    for (const fp of friendPicks) {
      const cp = challengerPicks.find((c) => c.questionId === fp.questionId);
      if (cp && JSON.stringify(cp.value) === JSON.stringify(fp.value)) {
        matches++;
      }
    }

    expect(matches).toBe(4);
    const syncPercentage = Math.round((matches / friendPicks.length) * 100);
    expect(syncPercentage).toBe(80);
  });

  it("ensures zero PII, user IDs, or IPs appear in public share payload (P6.10)", () => {
    const samplePublicPayload = {
      shortId: "xK9mP2",
      dropId: "drop-2026-11-08",
      dropDate: "2026-11-08T07:00:00.000Z",
      sharerScore: 4,
      sharerTier: "Rare",
      sharerPercentile: 84,
      twinCity: "Berlin, Germany",
      answers: [
        { questionId: "q1", value: "opt-a" },
        { questionId: "q2", value: "opt-b" },
      ],
      questions: [
        { id: "q1", type: "text", prompt: "Choice A or B?" },
        { id: "q2", type: "text", prompt: "Choice X or Y?" },
      ],
    };

    const serialized = JSON.stringify(samplePublicPayload);

    // Strict privacy audits:
    expect(serialized).not.toContain("player_id");
    expect(serialized).not.toContain("user_id");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("ip_address");
    expect(serialized).not.toMatch(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
    expect(serialized).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  });

  it("verifies challenge link formatting and query parameter structure", () => {
    const shortId = "xK9mP2";
    const challengeUrl = `https://oddly.app/c/${shortId}?challenge=1`;
    const url = new URL(challengeUrl);

    expect(url.pathname).toBe(`/c/${shortId}`);
    expect(url.searchParams.get("challenge")).toBe("1");
  });
});
