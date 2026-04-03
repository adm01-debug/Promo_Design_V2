import { test, expect } from "../playwright-fixture";

test.describe("Navigation & Routing", () => {
  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText(/404/)).toBeVisible();
  });

  test("reset-password page loads", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page).toHaveURL(/\/reset-password/);
  });
});
