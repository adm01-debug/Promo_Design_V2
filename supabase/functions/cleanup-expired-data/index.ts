import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, corsPreflight } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight(req);
  const corsHeaders = getCorsHeaders(req);

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] cleanup-expired-data started`);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Guard: require service-role Bearer (cron passes anon; we accept via internal secret header too)
    const authHeader = req.headers.get("Authorization") || "";
    const cronSecret = req.headers.get("x-cron-secret") || "";
    const expectedSecret = Deno.env.get("CRON_SECRET") || "";

    const isServiceRole = authHeader === `Bearer ${SERVICE_ROLE}`;
    const isCronCall = expectedSecret.length > 0 && cronSecret === expectedSecret;

    if (!isServiceRole && !isCronCall) {
      console.warn(`[${requestId}] Unauthorized cleanup attempt`);
      return new Response(JSON.stringify({ error: "Unauthorized", requestId }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const auditDays = Number(body.audit_retention_days ?? 180);
    const notifDays = Number(body.notifications_read_retention_days ?? 90);
    const statusDays = Number(body.status_audit_retention_days ?? 365);

    const started = Date.now();
    const { data, error } = await admin.rpc("cleanup_expired_data", {
      _audit_retention_days: auditDays,
      _notifications_read_retention_days: notifDays,
      _status_audit_retention_days: statusDays,
    });

    if (error) {
      console.error(`[${requestId}] cleanup_expired_data error:`, error);
      return new Response(JSON.stringify({ error: error.message, requestId }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const durationMs = Date.now() - started;
    console.log(`[${requestId}] cleanup completed in ${durationMs}ms`, data);

    return new Response(JSON.stringify({ ok: true, result: data, durationMs, requestId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[${requestId}] fatal:`, e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
