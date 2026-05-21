import { test, expect } from "../playwright-fixture";

/**
 * E2E: Magic Up History — back/forward keeps the favorites filter consistent
 * with both the URL and the rendered grid.
 *
 * Skips the authenticated path when PLAYWRIGHT_TEST_EMAIL/PASSWORD aren't set,
 * but always runs the unauth → /auth redirect smoke check.
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

test.describe("Magic Up History — back/forward (smoke)", () => {
  test("history page redirects to /auth without session", async ({ page }) => {
    await page.goto("/magic-up/history");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe.serial("Magic Up History — back/forward keeps fav filter in sync", () => {
  test.skip(!hasCreds, "requires PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD");
  test.setTimeout(45_000);

  test("URL ↔ favorites toggle stays consistent across browser navigation", async ({ page }) => {
    await login(page);

    // 1) Land on the filtered URL.
    await page.goto("/magic-up/history?fav=1");
    const favBtn = page.getByRole("button", { name: /favoritos/i });
    await expect(favBtn).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/[?&]fav=1\b/);

    // 2) Navigate to the clean URL.
    await page.goto("/magic-up/history");
    await expect(favBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page).not.toHaveURL(/[?&]fav=1\b/);

    // 3) Browser BACK → filter must be re-applied from the URL.
    await page.goBack();
    await expect(page).toHaveURL(/[?&]fav=1\b/);
    await expect(favBtn).toHaveAttribute("aria-pressed", "true");

    // 4) Browser FORWARD → state goes back to clean.
    await page.goForward();
    await expect(page).not.toHaveURL(/[?&]fav=1\b/);
    await expect(favBtn).toHaveAttribute("aria-pressed", "false");

    // 5) Repeat once more to ensure stability across multiple cycles.
    await page.goBack();
    await expect(favBtn).toHaveAttribute("aria-pressed", "true");
    await page.goForward();
    await expect(favBtn).toHaveAttribute("aria-pressed", "false");
  });
});
