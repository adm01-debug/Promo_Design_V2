import { test, expect } from "../playwright-fixture";

/**
 * E2E for keyboard shortcuts on /audit:
 *   "/"  -> focuses the record-id input
 *   Esc  -> clears all filters (only when focus is NOT in an input)
 *
 * Smoke scenario always runs (validates unauth redirect). Authenticated
 * scenarios skip when PLAYWRIGHT_TEST_EMAIL/PASSWORD are not set.
 */

const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const hasCreds = Boolean(TEST_EMAIL && TEST_PASSWORD);

async function login(page: import("@playwright/test").Page) {
  await page.goto("/auth");
  await page
    .getByLabel(/e-?mail/i)
    .first()
    .fill(TEST_EMAIL!);
  await page.getByLabel(/senha/i).first().fill(TEST_PASSWORD!);
  await page
    .getByRole("button", { name: /entrar|login/i })
    .first()
    .click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 15_000 });
}

test.describe("Audit shortcuts (smoke)", () => {
  test("audit page redirects to /auth without session", async ({ page }) => {
    await page.goto("/audit");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe.serial("Audit shortcuts (full flow)", () => {
  test.skip(!hasCreds, "Requires PLAYWRIGHT_TEST_EMAIL/PASSWORD env vars");
  test.setTimeout(45_000);

  test('Scenario 2 — "/" focuses the record-id input', async ({ page }) => {
    await login(page);
    await page.goto("/audit");

    const input = page.locator("#audit-record-id-input");
    await expect(input).toBeVisible();

    // Move focus away from any input first.
    await page.locator("h1").first().click();
    await expect(input).not.toBeFocused();

    await page.keyboard.press("/");
    await expect(input).toBeFocused();
  });

  test("Scenario 3 — Esc clears filters when focus is outside inputs", async ({ page }) => {
    await login(page);
    await page.goto("/audit?action=INSERT&table=service_orders&recordId=abc123");

    // Confirm filters hydrated from URL.
    await expect(page).toHaveURL(/action=INSERT/);
    await expect(page).toHaveURL(/table=service_orders/);
    const input = page.locator("#audit-record-id-input");
    await expect(input).toHaveValue("abc123");

    // Move focus out of any input — Esc handler ignores when focus is in an input.
    await page.locator("h1").first().click();
    await page.keyboard.press("Escape");

    // URL should no longer carry the filter params.
    await expect(page).not.toHaveURL(/action=INSERT/);
    await expect(page).not.toHaveURL(/table=service_orders/);
    await expect(page).not.toHaveURL(/recordId=abc123/);

    // Input cleared.
    await expect(input).toHaveValue("");
  });

  test("Scenario 4 — Esc inside an input does NOT clear filters", async ({ page }) => {
    await login(page);
    await page.goto("/audit?action=INSERT");

    await expect(page).toHaveURL(/action=INSERT/);

    const input = page.locator("#audit-record-id-input");
    await input.focus();
    await expect(input).toBeFocused();

    await page.keyboard.press("Escape");

    // Filter should remain because the global shortcut is suppressed inside inputs.
    await expect(page).toHaveURL(/action=INSERT/);
  });
});
