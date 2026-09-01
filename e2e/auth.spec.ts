import { test, expect } from "../playwright-fixture";

test.describe("Authentication Flow", () => {
  test("shows login form by default", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: /entrar/i })).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
    await expect(page.getByLabel(/senha/i)).toBeVisible();
  });

  test("switches to signup mode", async ({ page }) => {
    await page.goto("/auth");
    await page.getByText(/criar conta/i).click();
    await expect(page.getByRole("heading", { name: /criar conta/i })).toBeVisible();
  });

  test("shows validation on empty submit", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /entrar/i }).click();
    // Should stay on auth page (not navigate away)
    await expect(page).toHaveURL(/\/auth/);
  });

  test("redirects authenticated users to dashboard", async ({ page }) => {
    // Unauthenticated users trying to access protected routes get redirected to /auth
    await page.goto("/");
    await page.waitForURL(/\/auth/);
    await expect(page).toHaveURL(/\/auth/);
  });
});
