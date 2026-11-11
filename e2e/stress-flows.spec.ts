import { test, expect } from "@playwright/test";

test.describe("E2E Critical Flows & Stress", () => {
  test("navigation smoke test", async ({ page }) => {
    await page.goto("/");
    // Check if we redirect to auth or landing
    await expect(page).toHaveURL(/.*(auth|landing|dashboard)/);
  });

  test("dashboard responsiveness", async ({ page }) => {
    await page.goto("/dashboard");
    // Simulate some fast clicks
    const sidebarItems = page.locator("nav a");
    const count = await sidebarItems.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      await sidebarItems.nth(i).click();
      await page.waitForTimeout(100); // Fast switching
    }
  });

  test("error boundary verification", async ({ page }) => {
    // Navigate to a non-existent route to check 404/Error state
    await page.goto("/invalid-route-that-should-trigger-error");
    // We expect a "Not Found" or "Voltar" button
    const backButton = page.getByRole("button", { name: /voltar|home/i });
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL("/");
    }
  });

  test("loading states during rapid action", async ({ page }) => {
    await page.goto("/dashboard");
    // Try to trigger multiple things at once if possible
    // This is more of a layout stability test
    const buttons = page.getByRole("button");
    const btnCount = await buttons.count();
    for (let i = 0; i < Math.min(btnCount, 3); i++) {
      await buttons.nth(i).click({ force: true });
    }
    // Ensure no crash
    await expect(page.locator("body")).toBeVisible();
  });
});
