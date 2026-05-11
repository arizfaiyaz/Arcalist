import { test, expect } from "@playwright/test";

test("new tab loads without onboarding flash", async ({ page }) => {
  await page.goto("http://localhost:4173/");
  await expect(page.locator("text=Loading Arcalist"))
    .toBeHidden({ timeout: 5000 });
});