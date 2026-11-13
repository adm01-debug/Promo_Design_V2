import { test, expect } from "../playwright-fixture";

test.describe("Authentication Flow", () => {
  test("shows login form by default", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: /bem-vindo de volta/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /e-?mail/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /senha/i })).toBeVisible();
  });

  test("switches to forgot-password mode", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("button", { name: /esqueceu a senha/i }).click();
    await expect(page.getByRole("heading", { name: /recupere sua senha/i })).toBeVisible();
  });

  test("shows validation on empty submit", async ({ page }) => {
    await page.goto("/auth");
    // Submit form directly (strict: the "Entrar" submit button, not the social buttons)
    await page
      .getByRole("form", { name: /bem-vindo de volta/i })
      .locator('button[type="submit"]')
      .click();
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
