import { test, expect } from "../playwright-fixture";

test.describe("Service Orders (unauthenticated)", () => {
  test("redirects to auth when accessing service orders without login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/auth/);
    await expect(page).toHaveURL(/\/auth/);
  });
});
