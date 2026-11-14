import { test } from "node:test";
import assert from "node:assert/strict";
import { colors } from "./tokens";
import { calculateContrastRatio, verifyAllPairs } from "./contrast";

test("Contrast Verification Suite (WCAG AA Compliance)", async (t) => {
  const results = verifyAllPairs();

  for (const r of results) {
    await t.test(r.pair, () => {
      assert.ok(
        r.passed,
        `Expected ${r.pair} to have contrast ratio >= ${r.expectedMin}, but got ${r.ratio} (fg: ${r.fg}, bg: ${r.bg})`
      );
    });
  }

  await t.test("Hard Rule: Never put Mint or Coral text directly on Cream", () => {
    const mintOnCream = calculateContrastRatio(colors.mint, colors.cream);
    const coralOnCream = calculateContrastRatio(colors.coral, colors.cream);

    // Both should fail normal text contrast (proving why they must never be text on cream)
    assert.ok(mintOnCream < 4.5, "Mint on cream should fail WCAG AA for normal text");
    assert.ok(coralOnCream < 4.5, "Coral on cream should fail WCAG AA for normal text");
  });
});
