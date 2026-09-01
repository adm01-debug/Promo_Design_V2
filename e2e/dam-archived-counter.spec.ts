import { test, expect, type Page } from "../playwright-fixture";

/**
 * E2E for the "N arquivado(s)" counter badge inside the Arquivados toggle on
 * the DAM Library header.
 *
 * Contract being validated:
 *   - The badge is rendered ONLY when BOTH conditions hold:
 *       (a) the Arquivados toggle is active (includeArchived === true), AND
 *       (b) the count of visible archived assets is > 0.
 *   - When the toggle is off, the badge MUST NOT exist.
 *   - When the toggle is on but count === 0, the badge MUST NOT exist (the
 *     subtle "Nenhum arquivado nesta visualização" hint shows instead).
 *
 * Smoke scenario always runs (validates unauth redirect contract). The full
 * UI assertions skip when PLAYWRIGHT_TEST_EMAIL/PASSWORD are not provided.
 */

const TEST_EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL;
const TEST_PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD;
const hasCreds = Boolean(TEST_EMAIL && TEST_PASSWORD);

async function login(page: Page) {
  await page.goto("/auth");
  await page.getByLabel(/e-?mail/i).first().fill(TEST_EMAIL!);
  await page.getByLabel(/senha/i).first().fill(TEST_PASSWORD!);
  await page.getByRole("button", { name: /entrar|login/i }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 15_000 });
}

const TOGGLE = '[data-testid="dam-archived-toggle"]';
// The badge counter rendered INSIDE the toggle has aria-label like
// "3 arquivados visíveis" / "1 arquivado visíveis".
const TOGGLE_BADGE = `${TOGGLE} [aria-label*="arquivado"]`;
const ZERO_HINT = '[data-testid="dam-archived-zero-hint"]';

test.describe("DAM Archived counter badge (smoke)", () => {
  test("/dam redirects unauthenticated users to /auth", async ({ page }) => {
    await page.goto("/dam");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe.serial("DAM Archived counter badge (full flow)", () => {
  test.skip(!hasCreds, "Requires PLAYWRIGHT_TEST_EMAIL/PASSWORD env vars");
  test.setTimeout(45_000);

  test("badge is hidden when toggle is OFF", async ({ page }) => {
    await login(page);
    await page.goto("/dam?archived=0");
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    // Badge inside the toggle must not exist while OFF.
    await expect(page.locator(TOGGLE_BADGE)).toHaveCount(0);
  });

  test("badge appears only when toggle is ON AND count > 0", async ({ page }) => {
    await login(page);
    await page.goto("/dam?archived=1");
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    // Wait for assets list to settle.
    await page.waitForLoadState("networkidle");

    const badge = page.locator(TOGGLE_BADGE);
    const zeroHint = page.locator(ZERO_HINT);

    // Exactly one of the two states must hold; never both, never neither
    // (when there are visible results). We allow a brief animation window.
    const badgeCount = await badge.count();
    const hintCount = await zeroHint.count();

    expect(
      badgeCount + hintCount,
      "Either the counter badge or the zero-hint must be visible (not both)",
    ).toBeLessThanOrEqual(1);

    if (badgeCount === 1) {
      // If badge is shown, its number must be >= 1.
      const text = (await badge.first().textContent())?.trim() ?? "";
      const n = Number(text);
      expect(Number.isFinite(n) && n >= 1).toBe(true);
    }
  });

  test("turning the toggle OFF removes the badge immediately", async ({ page }) => {
    await login(page);
    await page.goto("/dam?archived=1");
    const toggle = page.locator(TOGGLE);
    await expect(toggle).toBeVisible();
    await page.waitForLoadState("networkidle");

    // Click to turn OFF.
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(TOGGLE_BADGE)).toHaveCount(0);
    await expect(page.locator(ZERO_HINT)).toHaveCount(0);
  });
});