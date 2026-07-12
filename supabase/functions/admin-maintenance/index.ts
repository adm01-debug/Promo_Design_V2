import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  action: z.enum([
    "stats", "cleanup", "history", "table_sizes", "growth",
    "capture_snapshot", "size_history", "snapshots_list", "failures_summary",
    "duration_stats", "cleanup_per_org", "slo_baseline", "db_health", "slow_queries",
    "unused_indexes", "bloat_health",
  ]),
  slow_queries_limit: z.number().int().min(1).max(100).optional(),
  unused_indexes_min_kb: z.number().int().min(0).max(10485760).optional(),
  slo_baseline_days: z.number().int().min(14).max(365).optional(),
  slo_recent_days: z.number().int().min(1).max(30).optional(),
  slo_threshold: z.number().min(1.1).max(10).optional(),
  duration_days_back: z.number().int().min(1).max(365).optional(),
  audit_retention_days: z.number().int().min(30).max(3650).optional(),
  notifications_read_retention_days: z.number().int().min(7).max(3650).optional(),
  status_audit_retention_days: z.number().int().min(30).max(3650).optional(),
  history_limit: z.number().int().min(1).max(100).optional(),
  growth_days_back: z.number().int().min(1).max(365).optional(),
  size_history_days: z.number().int().min(1).max(365).optional(),
  // For per-org cleanup
  organization_id: z.string().uuid().optional(),
  // Filters for snapshots_list
  snapshots_table_name: z.string().min(1).max(128).optional(),
  snapshots_from: z.string().datetime().optional(),
  snapshots_to: z.string().datetime().optional(),
  snapshots_page: z.number().int().min(1).max(10_000).optional(),
  snapshots_page_size: z.number().int().min(5).max(200).optional(),
  // Filters for failures_summary
  failures_days_back: z.number().int().min(1).max(365).optional(),
  failures_limit: z.number().int().min(1).max(50).optional(),
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
    if (params.action === "size_history") {
      const days = params.size_history_days ?? 90;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await admin
        .from("table_size_snapshots")
        .select("table_name,total_bytes,captured_at")
        .gte("captured_at", since)
        .order("captured_at", { ascending: true });
      if (error) return json({ error: error.message, requestId }, 500);
      return json({ ok: true, history: data ?? [], days, requestId });
    }

    if (params.action === "snapshots_list") {
      const page = params.snapshots_page ?? 1;
      const pageSize = params.snapshots_page_size ?? 25;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = admin
        .from("table_size_snapshots")
        .select("id,table_name,total_bytes,table_bytes,index_bytes,row_estimate,captured_at", { count: "exact" })
        .order("captured_at", { ascending: false })
        .range(from, to);

      if (params.snapshots_table_name) query = query.eq("table_name", params.snapshots_table_name);
      if (params.snapshots_from) query = query.gte("captured_at", params.snapshots_from);
      if (params.snapshots_to) query = query.lte("captured_at", params.snapshots_to);

      const { data, count, error } = await query;
      if (error) return json({ error: error.message, requestId }, 500);

      // Distinct table names for filter dropdown (small dataset, fetch top 200)
      const { data: distinctRows } = await admin
        .from("table_size_snapshots")
        .select("table_name")
        .order("table_name", { ascending: true })
        .limit(500);
      const tables = Array.from(new Set((distinctRows ?? []).map((r) => r.table_name)));

      return json({
        ok: true,
        rows: data ?? [],
        total: count ?? 0,
        page,
        page_size: pageSize,
        tables,
        requestId,
      });
    }

    if (params.action === "failures_summary") {
      const daysBack = params.failures_days_back ?? 30;
      const limit = params.failures_limit ?? 10;
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      // Recent failure/skipped/partial runs
      const { data: failures, error: failuresErr } = await admin
        .from("maintenance_runs")
        .select("id,source,status,duration_ms,error_message,started_at,finished_at,created_at")
        .in("status", ["error", "skipped", "partial"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (failuresErr) return json({ error: failuresErr.message, requestId }, 500);

      // Aggregate counts by status × source in the window
      const { data: allRuns, error: allErr } = await admin
        .from("maintenance_runs")
        .select("source,status")
        .gte("created_at", since);
      if (allErr) return json({ error: allErr.message, requestId }, 500);

      const totals: Record<string, number> = { success: 0, error: 0, skipped: 0, partial: 0 };
      const bySource: Record<string, Record<string, number>> = {};
      for (const row of allRuns ?? []) {
        totals[row.status] = (totals[row.status] ?? 0) + 1;
        bySource[row.source] ??= { success: 0, error: 0, skipped: 0, partial: 0 };
        bySource[row.source][row.status] = (bySource[row.source][row.status] ?? 0) + 1;
      }

      // Last success timestamps per source (health signal)
      const { data: lastOk } = await admin
        .from("maintenance_runs")
        .select("source,created_at")
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(50);
      const lastSuccessBySource: Record<string, string> = {};
      for (const row of lastOk ?? []) {
        if (!lastSuccessBySource[row.source]) lastSuccessBySource[row.source] = row.created_at;
      }

      return json({
        ok: true,
        days_back: daysBack,
        totals,
        by_source: bySource,
        failures: failures ?? [],
        last_success_by_source: lastSuccessBySource,
        requestId,
      });
    }

    if (params.action === "duration_stats") {
      const daysBack = params.duration_days_back ?? 30;
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
      const { data: runs, error: rErr } = await admin
        .from("maintenance_runs")
        .select("source,duration_ms,created_at")
        .eq("status", "success")
        .not("duration_ms", "is", null)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (rErr) return json({ error: rErr.message, requestId }, 500);

      const bySource = new Map<string, number[]>();
      const timeline: Array<{ created_at: string; duration_ms: number; source: string }> = [];
      for (const r of runs ?? []) {
        if (r.duration_ms == null) continue;
        const arr = bySource.get(r.source) ?? [];
        arr.push(r.duration_ms);
        bySource.set(r.source, arr);
        timeline.push({ created_at: r.created_at, duration_ms: r.duration_ms, source: r.source });
      }
      const pct = (arr: number[], p: number) => {
        if (arr.length === 0) return null;
        const sorted = [...arr].sort((a, b) => a - b);
        const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
        return sorted[idx];
      };
      const stats: Record<string, { count: number; p50: number | null; p95: number | null; p99: number | null; max: number | null; avg: number | null }> = {};
      for (const [src, arr] of bySource.entries()) {
        const sum = arr.reduce((a, b) => a + b, 0);
        stats[src] = {
          count: arr.length,
          p50: pct(arr, 50),
          p95: pct(arr, 95),
          p99: pct(arr, 99),
          max: Math.max(...arr),
          avg: Math.round(sum / arr.length),
        };
      }
      return json({ ok: true, days_back: daysBack, stats, timeline, requestId });
    }

    if (params.action === "slo_baseline") {
      const baselineDays = params.slo_baseline_days ?? 60;
      const recentDays = params.slo_recent_days ?? 7;
      const threshold = params.slo_threshold ?? 2;
      const baselineSince = new Date(Date.now() - baselineDays * 86400_000).toISOString();
      const recentSince = new Date(Date.now() - recentDays * 86400_000).toISOString();

      const { data: runs, error: bErr } = await admin
        .from("maintenance_runs")
        .select("source,duration_ms,created_at")
        .eq("status", "success")
        .not("duration_ms", "is", null)
        .gte("created_at", baselineSince);
      if (bErr) return json({ error: bErr.message, requestId }, 500);

      const p95 = (arr: number[]): number | null => {
        if (arr.length === 0) return null;
        const s = [...arr].sort((a, b) => a - b);
        return s[Math.min(s.length - 1, Math.floor(0.95 * s.length))];
      };

      const baselineBySource = new Map<string, number[]>();
      const recentBySource = new Map<string, number[]>();
      for (const r of runs ?? []) {
        if (r.duration_ms == null) continue;
        (baselineBySource.get(r.source) ?? baselineBySource.set(r.source, []).get(r.source)!).push(r.duration_ms);
        if (r.created_at >= recentSince) {
          (recentBySource.get(r.source) ?? recentBySource.set(r.source, []).get(r.source)!).push(r.duration_ms);
        }
      }

      const results = Array.from(baselineBySource.keys()).map((source) => {
        const baseArr = baselineBySource.get(source) ?? [];
        const recentArr = recentBySource.get(source) ?? [];
        const baselineP95 = p95(baseArr);
        const recentP95 = p95(recentArr);
        const ratio =
          baselineP95 && recentP95 && baselineP95 > 0 ? recentP95 / baselineP95 : null;
        let status: "ok" | "warning" | "critical" | "insufficient_data" = "insufficient_data";
        if (baseArr.length < 5 || recentArr.length < 3) status = "insufficient_data";
        else if (ratio == null) status = "insufficient_data";
        else if (ratio >= threshold) status = "critical";
        else if (ratio >= threshold * 0.75) status = "warning";
        else status = "ok";
        return {
          source,
          baseline_p95_ms: baselineP95,
          recent_p95_ms: recentP95,
          baseline_samples: baseArr.length,
          recent_samples: recentArr.length,
          ratio,
          status,
        };
      });

      return json({
        ok: true,
        baseline_days: baselineDays,
        recent_days: recentDays,
        threshold,
        sources: results,
        requestId,
      });
    }

    if (params.action === "cleanup_per_org") {
      if (!params.organization_id) {
        return json({ error: "organization_id é obrigatório", requestId }, 400);
      }
      const { data: orgRole, error: orgRoleErr } = await admin
        .from("organization_members")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("organization_id", params.organization_id)
        .in("role", ["owner", "admin"])
        .limit(1);
      if (orgRoleErr) return json({ error: orgRoleErr.message, requestId }, 500);
      if (!orgRole || orgRole.length === 0) {
        return json({ error: "Permissão negada nesta organização", requestId }, 403);
      }
      console.log(`[${requestId}] per-org cleanup by ${userData.user.id} org=${params.organization_id}`);
      const { data, error } = await admin.rpc("cleanup_expired_data_for_org", {
        _org_id: params.organization_id,
        _source: "manual_per_org",
        _triggered_by: userData.user.id,
      });
      if (error) return json({ error: error.message, requestId }, 500);
      return json({ ok: true, result: data, requestId });
    }

    if (params.action === "db_health") {
      const { data, error } = await admin.rpc("get_db_health");
      if (error) return json({ error: error.message, requestId }, 500);
      return json({ ok: true, health: data, requestId });
    }

    if (params.action === "slow_queries") {
      const { data, error } = await admin.rpc("get_slow_queries", {
        _limit: params.slow_queries_limit ?? 15,
      });
      if (error) return json({ error: error.message, requestId }, 500);
      return json({ ok: true, result: data, requestId });
    }

    if (params.action === "unused_indexes") {
      const { data, error } = await admin.rpc("get_unused_indexes", {
        _min_size_kb: params.unused_indexes_min_kb ?? 64,
      });
      if (error) return json({ error: error.message, requestId }, 500);
      return json({ ok: true, result: data, requestId });
    }

    if (params.action === "bloat_health") {
      const { data, error } = await admin.rpc("get_table_bloat_health");
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
