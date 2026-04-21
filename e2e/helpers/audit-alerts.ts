import type { Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client using the service-role key.
 * Required env vars (set in CI / locally):
 *   - PLAYWRIGHT_SUPABASE_URL (or VITE_SUPABASE_URL)
 *   - PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY
 */
export function getAdminSupabase(): SupabaseClient | null {
  const url = process.env.PLAYWRIGHT_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface CreateRuleOptions {
  name: string;
  actions?: ("INSERT" | "UPDATE" | "DELETE")[];
  table?: string;
}

/**
 * Walks through the UI to create an alert rule from the Audit page.
 * Assumes the user is already on /audit and authenticated.
 */
export async function createTestAlertRule(page: Page, opts: CreateRuleOptions): Promise<void> {
  await page.getByTestId("audit-alerts-button").click();
  await page.getByTestId("audit-alerts-sheet").waitFor({ state: "visible" });
  await page.getByTestId("audit-alerts-new-rule").click();
  await page.getByTestId("audit-alert-rule-dialog").waitFor({ state: "visible" });

  await page.getByTestId("audit-alert-rule-name").fill(opts.name);
  // Actions and table are pre-filled from URL filters in the prefill prop;
  // fall back to manual selection if needed (kept simple here).
  await page.getByTestId("audit-alert-rule-submit").click();

  // Dialog closes on success — wait for it to detach.
  await page.getByTestId("audit-alert-rule-dialog").waitFor({ state: "hidden" });
}

/**
 * Polls the notification panel until a notification with event_type=audit_alert
 * containing the rule name (or matching text) appears, or times out.
 */
export async function waitForAuditAlertNotification(
  page: Page,
  expectedText: string,
  timeout = 25_000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    // Open the bell panel
    await page.getByLabel(/Notificações/).click().catch(() => {});
    const items = page.locator('[data-event-type="audit_alert"]');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text?.includes(expectedText)) return true;
    }
    // Close panel and wait before next poll
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(1500);
  }
  return false;
}

export async function cleanupAuditTestData(ruleNamePrefix: string): Promise<void> {
  const admin = getAdminSupabase();
  if (!admin) return;
  // Delete notifications first (FK-free but keeps inbox clean)
  await admin
    .from("notifications")
    .delete()
    .eq("event_type", "audit_alert")
    .ilike("product_name", `${ruleNamePrefix}%`);
  await admin
    .from("audit_alert_rules" as never)
    .delete()
    .ilike("name", `${ruleNamePrefix}%`);
}