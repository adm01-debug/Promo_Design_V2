/**
 * os-webhook-dispatcher — drains the durable os_webhook_queue and forwards
 * each event to the ERP endpoint with an HMAC-SHA256 signature, idempotent
 * per event_id.
 *
 * Triggered by (a) pg_cron → net.http_post, or (b) a minute-level Supabase
 * cron integration. Each invocation claims a bounded batch and delivers it.
 * Failures are re-queued by the SQL layer with exponential backoff; rows that
 * exhaust the budget become dead-lettered for admin review.
 *
 * Secrets live ONLY in the function environment (Dashboard → Edge Functions →
 * os-webhook-dispatcher → Secrets): ERP_WEBHOOK_URL and ERP_WEBHOOK_SECRET.
 * When unset the function self-disables (idempotent no-op) so the feature can
 * be rolled out without breaking the pipeline — but it records WHY in
 * os_webhook_queue.last_error, otherwise the rows sit at attempts=0 with an
 * empty error and look untouched instead of blocked by configuration.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, corsPreflight } from "../_shared/cors.ts";
import {
  blockedReason,
  deliverEvent,
  eventsNeedingBlockedReason,
  type QueuedOsEvent,
} from "./lib.ts";

const BATCH_LIMIT = 25;

/**
 * Writes the configuration reason into the pending events that were never
 * attempted. Best-effort: never throws, so a transient DB error cannot break
 * the cron. Status and attempts are left untouched, so the events stay
 * retryable and are delivered as soon as the secrets exist.
 */
async function annotateBlocked(
  admin: ReturnType<typeof createClient>,
  reason: string,
): Promise<number> {
  try {
    const { data, error } = await admin
      .from("os_webhook_queue")
      .select("event_id, last_error")
      .eq("status", "pending")
      .eq("attempts", 0);
    if (error) {
      console.error("annotateBlocked read error:", error);
      return 0;
    }
    const eventIds = eventsNeedingBlockedReason(data ?? [], reason);
    if (eventIds.length === 0) return 0;

    const { error: writeError } = await admin
      .from("os_webhook_queue")
      .update({ last_error: reason })
      .in("event_id", eventIds);
    if (writeError) {
      console.error("annotateBlocked write error:", writeError);
      return 0;
    }
    return eventIds.length;
  } catch (err) {
    console.error("annotateBlocked failed:", err);
    return 0;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight(req);
  const corsHeaders = getCorsHeaders(req);

  // Only internal callers (cron, service-role) may drain the queue.
  const auth = req.headers.get("Authorization") || "";
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronSecret = req.headers.get("x-cron-secret") || "";
  const expectedCron = Deno.env.get("CRON_SECRET") || "";
  if (auth !== `Bearer ${expected}` && !(expectedCron && cronSecret === expectedCron)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("ERP_WEBHOOK_URL") || "";
  const secret = Deno.env.get("ERP_WEBHOOK_SECRET") || "";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const disabledReason = blockedReason(url, secret);
  if (disabledReason) {
    // Feature not configured yet — self-disable without failing the cron, but
    // leave the reason on record so the queue panel is not silent about it.
    const blocked = await annotateBlocked(admin, disabledReason);
    return new Response(
      JSON.stringify({
        ok: true,
        disabled: true,
        delivered: 0,
        blocked,
        reason: disabledReason,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { data: events, error } = await admin.rpc("dequeue_os_webhooks", {
    _limit: BATCH_LIMIT,
  });
  if (error) {
    console.error("dequeue_os_webhooks error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let delivered = 0;
  let failed = 0;
  for (const ev of (events ?? []) as QueuedOsEvent[]) {
    try {
      const ok = await deliverEvent(ev, url, secret);
      if (ok) {
        await admin.rpc("mark_os_webhook_delivered", { _event_id: ev.event_id });
        delivered += 1;
      } else {
        await admin.rpc("mark_os_webhook_failed", {
          _event_id: ev.event_id,
          _error: "non-2xx response",
        });
        failed += 1;
      }
    } catch (err) {
      console.error(`[${ev.event_id}] dispatch failed:`, err);
      await admin.rpc("mark_os_webhook_failed", {
        _event_id: ev.event_id,
        _error: err instanceof Error ? err.message : String(err),
      });
      failed += 1;
    }
  }

  return new Response(JSON.stringify({ ok: true, delivered, failed }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
