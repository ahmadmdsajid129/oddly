/**
 * @file play-flow.spec.ts
 * Playwright E2E test specification verifying complete guest play flow from S1 to S4 (P4.10).
 */

import { test, expect } from "@playwright/test";

test.describe("Oddly v1: Guest Play Flow (S1 to S4)", () => {
  test("completes daily five play flow from landing through review to submission", async ({
    page,
  }) => {
    // 1. Visit Landing Screen (S1)
    await page.goto("/");
    await expect(page.locator("h1")).toContainText(
      "Someone out there is oddly like you"
    );

    // 2. Click Play CTA -> Age Gate bottom sheet appears
    const playButton = page.getByRole("button", { name: /Play today's five/i });
    await expect(playButton).toBeVisible();
    await playButton.click();

    // 3. Confirm 18+ Status in Age Gate Modal
    const checkbox = page.getByLabel("I confirm that I am 18 years of age or older");
    await expect(checkbox).toBeVisible();
    await checkbox.check();

    const continueButton = page.getByRole("button", {
      name: /Continue to today's five/i,
    });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    // 4. Question 1 (Text Pick One)
    await expect(page.getByText("Pick One")).toBeVisible();
    const firstOption = page.getByRole("button", {
      name: /Always cold pizza/i,
    });
    await expect(firstOption).toBeVisible();
    await firstOption.click();

    // 5. Question 2 (Number Dial)
    await expect(page.getByText("Choose a Number")).toBeVisible({ timeout: 2000 });
    const confirmNumberBtn = page.getByRole("button", {
      name: /Confirm Number/i,
    });
    if (await confirmNumberBtn.isVisible()) {
      await confirmNumberBtn.click();
    }

    // 6. Question 3 (Colour Swatch)
    await expect(page.getByText("Pick a Colour")).toBeVisible({ timeout: 2000 });
    const mintSwatch = page.locator("button").filter({ hasText: /Mint/i }).first();
    if (await mintSwatch.isVisible()) {
      await mintSwatch.click();
    }

    // 7. Question 4 (Image Grid)
    await expect(page.getByText("Select an Image")).toBeVisible({ timeout: 2000 });
    const firstImage = page.locator("button").filter({ hasText: /Instant Ramen/i }).first();
    if (await firstImage.isVisible()) {
      await firstImage.click();
    }

    // 8. Question 5 (Word Chips)
    await expect(page.getByText("Select Three Words")).toBeVisible({ timeout: 2000 });
    const loyaltyChip = page.getByRole("button", { name: "Loyalty" });
    const humourChip = page.getByRole("button", { name: "Humour" });
    const honestyChip = page.getByRole("button", { name: "Honesty" });

    await loyaltyChip.click();
    await humourChip.click();
    await honestyChip.click();

    // 9. Review Screen (S4)
    await expect(page.getByText("Review your five picks")).toBeVisible({
      timeout: 3000,
    });

    const findTwinButton = page.getByRole("button", {
      name: /Find my stranger twin/i,
    });
    await expect(findTwinButton).toBeVisible();
    await expect(findTwinButton).toBeEnabled();

    // 10. Submit choices and verify sealed results screen
    await findTwinButton.click();
    await expect(page.getByText("Stranger Twin Found")).toBeVisible({
      timeout: 5000,
    });
  });

  test("courteously excludes users under 18 with zero data collected", async ({
    page,
  }) => {
    await page.goto("/");
    const playButton = page.getByRole("button", { name: /Play today's five/i });
    await playButton.click();

    const under18Btn = page.getByRole("button", { name: /I am under 18/i });
    await expect(under18Btn).toBeVisible();
    await under18Btn.click();

    await expect(page.getByText("Thanks for visiting Oddly")).toBeVisible();
    await expect(
      page.getByText("Zero data was collected")
    ).toBeVisible();
  });
});
