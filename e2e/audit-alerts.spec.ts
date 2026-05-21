import { test, expect } from "../playwright-fixture";
import {
  createTestAlertRule,
  waitForAuditAlertNotification,
  cleanupAuditTestData,
  getAdminSupabase,
} from "./helpers/audit-alerts";

/**
 * E2E suite for Audit Trail alert rules.
 *
 * REQUIREMENTS to actually run end-to-end (not skip):
 *   - PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD: a seeded user with an active org membership
 *   - PLAYWRIGHT_SUPABASE_URL / PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY: for deterministic cleanup
 *
 * If credentials are missing, the suite still validates the unauth → /auth redirect
 * path so it never silently passes "0 tests".
 */

const RULE_NAME_PREFIX = "E2E - INSERT em service_orders";

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

test.describe("Audit Alerts (smoke)", () => {
  test("audit page redirects to /auth without session", async ({ page }) => {
    await page.goto("/audit");
    await page.waitForURL(/\/auth/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe.serial("Audit Alerts (full flow)", () => {
  test.skip(!hasCreds, "Requires PLAYWRIGHT_TEST_EMAIL/PASSWORD env vars");
  test.setTimeout(60_000);

  test.afterAll(async () => {
    await cleanupAuditTestData(RULE_NAME_PREFIX);
  });

  test("Scenario 1 — create alert rule from current filters", async ({ page }) => {
    await login(page);
    await page.goto("/audit?action=INSERT&table=service_orders");
    await expect(page.getByTestId("audit-alerts-button")).toBeVisible();

    const uniqueName = `${RULE_NAME_PREFIX} ${Date.now()}`;
    await createTestAlertRule(page, {
      name: uniqueName,
      actions: ["INSERT"],
      table: "service_orders",
    });

    // Sheet still open; rule should appear in own list with INSERT + service_orders chips.
    await page.getByTestId("audit-alerts-button").click();
    await expect(page.getByTestId("audit-alerts-sheet")).toBeVisible();
    await expect(page.getByTestId("audit-alerts-sheet").getByText(uniqueName)).toBeVisible();
    await expect(
      page.getByTestId("audit-alerts-sheet").getByText("INSERT", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByTestId("audit-alerts-sheet").getByText("service_orders").first(),
    ).toBeVisible();
  });

  test("Scenario 2 — triggering event surfaces audit_alert notification", async ({ page }) => {
    await login(page);

    // Trigger an INSERT in service_orders via admin client (deterministic; avoids relying on UI form).
    const admin = getAdminSupabase();
    test.skip(!admin, "Requires service-role key for deterministic event trigger");

    // Find the test user's id to author the row.
    const { data: usr } = await admin!.auth.admin.listUsers();
    const u = usr?.users.find((x) => x.email === TEST_EMAIL);
    test.skip(!u, "Test user not found via admin API");

    const inserted = await admin!
      .from("service_orders")
      .insert({
        user_id: u!.id,
        os_number: `E2E-${Date.now().toString().slice(-6)}`,
        client_name: "E2E Client",
        product_name: "E2E Product",
        technique: "E2E",
        quantity: 1,
      } as never)
      .select("id")
      .single();

    expect(inserted.error).toBeNull();

    await page.goto("/audit");
    const found = await waitForAuditAlertNotification(page, "INSERT em service_orders", 25_000);
    expect(found).toBe(true);

    // Cleanup the OS row created by this scenario.
    if (inserted.data?.id) {
      await admin!.from("service_orders").delete().eq("id", inserted.data.id);
    }
  });

  test("Scenario 3 — disabled rule does not create new notifications", async ({ page }) => {
    await login(page);
    await page.goto("/audit");

    // Disable all matching rules via admin (UI toggle path is also tested by visibility).
    const admin = getAdminSupabase();
    test.skip(!admin, "Requires service-role key");
    await admin!
      .from("audit_alert_rules" as never)
      .update({ is_active: false } as never)
      .ilike("name", `${RULE_NAME_PREFIX}%`);

    // Snapshot existing audit_alert notifications.
    const { data: usrList } = await admin!.auth.admin.listUsers();
    const u = usrList?.users.find((x) => x.email === TEST_EMAIL);
    const before = await admin!
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "audit_alert")
      .eq("user_id", u!.id);
    const beforeCount = before.count ?? 0;

    const inserted = await admin!
      .from("service_orders")
      .insert({
        user_id: u!.id,
        os_number: `E2E-OFF-${Date.now().toString().slice(-6)}`,
        client_name: "E2E Off",
        product_name: "E2E Off",
        technique: "E2E",
        quantity: 1,
      } as never)
      .select("id")
      .single();

    // Wait one polling cycle.
    await page.waitForTimeout(20_000);

    const after = await admin!
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "audit_alert")
      .eq("user_id", u!.id);
    const afterCount = after.count ?? 0;

    expect(afterCount).toBe(beforeCount);

    if (inserted.data?.id) {
      await admin!.from("service_orders").delete().eq("id", inserted.data.id);
    }
  });
});
