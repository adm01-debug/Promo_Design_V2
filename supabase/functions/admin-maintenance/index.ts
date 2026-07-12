import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  action: z.enum(["stats", "cleanup", "history", "table_sizes", "growth", "capture_snapshot", "size_history"]),
  audit_retention_days: z.number().int().min(30).max(3650).optional(),
  notifications_read_retention_days: z.number().int().min(7).max(3650).optional(),
  status_audit_retention_days: z.number().int().min(30).max(3650).optional(),
  history_limit: z.number().int().min(1).max(100).optional(),
  growth_days_back: z.number().int().min(1).max(365).optional(),
  size_history_days: z.number().int().min(1).max(365).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado", requestId }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Sessão inválida", requestId }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: memberships, error: mErr } = await admin
      .from("organization_members")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["owner", "admin"])
      .limit(1);

    if (mErr) {
      console.error(`[${requestId}] membership check error:`, mErr);
      return json({ error: "Falha na verificação de permissão", requestId }, 500);
    }
    if (!memberships || memberships.length === 0) {
      return json({ error: "Permissão negada: requer owner ou admin", requestId }, 403);
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "Parâmetros inválidos", details: parsed.error.flatten(), requestId }, 400);
    }
    const params = parsed.data;

    if (params.action === "stats") {
      const { data, error } = await admin.rpc("get_maintenance_stats");
      if (error) return json({ error: error.message, requestId }, 500);
      return json({ ok: true, stats: data, requestId });
    }

    if (params.action === "history") {
      const limit = params.history_limit ?? 20;
      const { data, error } = await admin
        .from("maintenance_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return json({ error: error.message, requestId }, 500);
      return json({ ok: true, history: data ?? [], requestId });
    }

    if (params.action === "table_sizes") {
      const { data, error } = await admin.rpc("get_table_sizes");
      if (error) return json({ error: error.message, requestId }, 500);
      return json({ ok: true, tables: data, requestId });
    }

    if (params.action === "growth") {
      const { data, error } = await admin.rpc("get_table_growth", {
        _days_back: params.growth_days_back ?? 7,
      });
      if (error) return json({ error: error.message, requestId }, 500);
      return json({ ok: true, growth: data, days_back: params.growth_days_back ?? 7, requestId });
    }

    if (params.action === "capture_snapshot") {
      console.log(`[${requestId}] snapshot capture requested by ${userData.user.id}`);
      const { data, error } = await admin.rpc("capture_table_size_snapshot");
      if (error) return json({ error: error.message, requestId }, 500);
      return json({ ok: true, result: data, requestId });
    }

    // cleanup
    console.log(`[${requestId}] manual cleanup requested by ${userData.user.id}`);
    const { data, error } = await admin.rpc("cleanup_expired_data", {
      _audit_retention_days: params.audit_retention_days ?? 180,
      _notifications_read_retention_days: params.notifications_read_retention_days ?? 90,
      _status_audit_retention_days: params.status_audit_retention_days ?? 365,
      _source: "manual",
      _triggered_by: userData.user.id,
    });
    if (error) return json({ error: error.message, requestId }, 500);
    return json({ ok: true, result: data, requestId });
  } catch (e) {
    console.error(`[${requestId}] fatal:`, e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido", requestId }, 500);
  }
});
