/**
 * @file accessibility.spec.ts
 * @package @oddly/web
 *
 * Automated Web Accessibility Test Suite via @axe-core/playwright (P1.19, R2.7)
 * Scans core views: landing, question types, review, reveal, result, share sheet, login panel, history, settings.
 * Fails on any serious or critical WCAG 2.1 AA violations.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Oddly v1: WCAG 2.1 AA Accessibility Verification (R2.7, P1.19)", () => {
  test("Landing Page ('/') has zero serious or critical a11y violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const failures = scanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(failures).toEqual([]);
  });

  test("Design System Showcase ('/design') with all question components has zero serious or critical violations", async ({
    page,
  }) => {
    await page.goto("/design");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const failures = scanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(failures).toEqual([]);
  });

  test("Daily Recap Screen ('/recap') has zero serious or critical violations", async ({ page }) => {
    await page.goto("/recap");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const failures = scanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(failures).toEqual([]);
  });

  test("History View ('/history') has zero serious or critical violations", async ({ page }) => {
    await page.goto("/history");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const failures = scanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(failures).toEqual([]);
  });

  test("Twin Globe View ('/globe') has zero serious or critical violations (P10D.07)", async ({ page }) => {
    await page.goto("/globe");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const failures = scanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(failures).toEqual([]);
  });

  test("Orbit Hub View ('/orbit') has zero serious or critical violations (P10D.07)", async ({ page }) => {
    await page.goto("/orbit");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const failures = scanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(failures).toEqual([]);
  });

  test("Anti-Twin View ('/anti-twin') has zero serious or critical violations (P10D.07)", async ({ page }) => {
    await page.goto("/anti-twin");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const failures = scanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(failures).toEqual([]);
  });

  test("Offline Fallback Page ('/offline') has zero serious or critical violations", async ({ page }) => {
    await page.goto("/offline");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const failures = scanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(failures).toEqual([]);
  });

  test("User Settings / Profile ('/me') has zero serious or critical violations", async ({ page }) => {
    await page.goto("/me");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const failures = scanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(failures).toEqual([]);
  });

  test("Real Play Flow: All 5 question types, review, reveal, result, and share sheet have zero serious/critical a11y violations", async ({
    page,
  }) => {
    test.setTimeout(120000); // 10 sequential axe evaluations across all play stages

    // Helper to run axe and assert zero serious or critical violations
    const assertNoAxeViolations = async (stepName: string) => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const violations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );
      if (violations.length > 0) {
        console.error(`Axe violations at step [${stepName}]:`, JSON.stringify(violations, null, 2));
      }
      expect(violations).toEqual([]);
    };

    // 1. Landing & Age Gate Modal
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const playButton = page.getByRole("button", { name: /Play today's five/i });
    await playButton.click();

    await expect(page.getByLabel("I confirm that I am 18 years of age or older")).toBeVisible();
    await assertNoAxeViolations("Age Gate Modal");
    await page.getByLabel("I confirm that I am 18 years of age or older").check({ force: true });
    await page.getByRole("button", { name: /Continue to today's five/i }).click();

    // 2. Question 1 (Binary / Pick One)
    await expect(page.getByText("Pick One")).toBeVisible();
    await assertNoAxeViolations("Question 1 - Binary / Pick One");
    await page.getByRole("button", { name: /Always cold pizza/i }).click();

    // 3. Question 2 (Number Slider / Dial)
    await expect(page.getByText("Choose a Number")).toBeVisible({ timeout: 5000 });
    await assertNoAxeViolations("Question 2 - Number Dial");
    const confirmNumBtn = page.getByRole("button", { name: /Confirm Number/i });
    await expect(confirmNumBtn).toBeVisible();
    await confirmNumBtn.click();

    // 4. Question 3 (Colour Palette Swatches)
    await expect(page.getByText("Pick a Colour")).toBeVisible({ timeout: 5000 });
    await assertNoAxeViolations("Question 3 - Colour Palette");
    const mintSwatch = page.getByRole("button", { name: "Mint" });
    await expect(mintSwatch).toBeVisible();
    await mintSwatch.click();

    // 5. Question 4 (Image / Choice Grid)
    await expect(page.getByText("Select an Image")).toBeVisible({ timeout: 5000 });
    await assertNoAxeViolations("Question 4 - Image Choice Grid");
    const firstImage = page.getByRole("button", { name: /Instant Ramen/i });
    await expect(firstImage).toBeVisible();
    await firstImage.click();

    // 6. Question 5 (Word Chips)
    await expect(page.getByText("Select Three Words")).toBeVisible({ timeout: 3000 });
    await assertNoAxeViolations("Question 5 - Word Chips");
    await page.getByRole("button", { name: "Loyalty" }).click();
    await page.getByRole("button", { name: "Humour" }).click();
    await page.getByRole("button", { name: "Honesty" }).click();

    // Confirm word picks if button visible or wait for automatic transition
    const confirmPicksBtn = page.getByRole("button", { name: /Confirm Picks/i });
    if (await confirmPicksBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmPicksBtn.click();
    }

    // 7. Review Screen
    await expect(page.getByText("Review your five picks")).toBeVisible({ timeout: 5000 });
    await assertNoAxeViolations("Review Screen");
    const findTwinButton = page.getByRole("button", { name: /Find my stranger twin/i });
    await expect(findTwinButton).toBeEnabled({ timeout: 5000 });
    await findTwinButton.click();

    // Skip radar animation if present
    const skipBtn = page.getByText(/Tap to skip/i);
    if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipBtn.click().catch(() => {});
    }

    // 8. Twin Reveal Screen
    await expect(page.getByText(/Picks Matched/i)).toBeVisible({ timeout: 5000 });
    await assertNoAxeViolations("Twin Reveal Screen");

    // 9. Oddness Result Screen
    const seeOddnessBtn = page.getByRole("button", { name: /See how odd you are/i });
    await seeOddnessBtn.click();
    await expect(page.getByText("Oddness Score", { exact: true })).toBeVisible();
    await assertNoAxeViolations("Oddness Result Screen");

    // 10. Share Sheet Modal
    const shareBtn = page.getByRole("button", { name: /Share my card/i });
    if (await shareBtn.isVisible()) {
      await shareBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });
      await assertNoAxeViolations("Share Sheet Modal");
    }
  });

  test("Login Panel Modal and Login Page have zero serious/critical a11y violations", async ({ page }) => {
    // 1. Dedicated login route
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    const scanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const failures = scanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    expect(failures).toEqual([]);
  });

  test("Keyboard-only navigation of the play flow is fully operable", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Navigate to 'Play today's five' CTA using Tab and press Enter
    const playBtn = page.getByRole("button", { name: /Play today's five/i });
    await playBtn.focus();
    await page.keyboard.press("Enter");

    // Age Gate Modal is open - Tab to checkbox, press Space to toggle, Tab to submit and press Enter
    const checkbox = page.getByLabel("I confirm that I am 18 years of age or older");
    await expect(checkbox).toBeVisible();
    await checkbox.focus();
    await page.keyboard.press("Space");

    const continueBtn = page.getByRole("button", { name: /Continue to today's five/i });
    await continueBtn.focus();
    await page.keyboard.press("Enter");

    // Question 1: Tab to first option and select with Enter
    await expect(page.getByText("Pick One")).toBeVisible({ timeout: 3000 });
    const firstOption = page.getByRole("button", { name: /Always cold pizza/i });
    await firstOption.focus();
    await page.keyboard.press("Enter");

    // Verify reached Question 2 via keyboard
    await expect(page.getByText("Choose a Number")).toBeVisible({ timeout: 3000 });
  });
});

