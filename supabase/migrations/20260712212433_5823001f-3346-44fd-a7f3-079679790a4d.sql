CREATE OR REPLACE FUNCTION public.get_vacuum_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.priority_score DESC NULLS LAST), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      s.schemaname AS schema,
      s.relname AS table_name,
      s.n_live_tup AS live_tuples,
      s.n_dead_tup AS dead_tuples,
      s.n_mod_since_analyze AS modified_since_analyze,
      s.last_vacuum,
      s.last_autovacuum,
      s.last_analyze,
      s.last_autoanalyze,
      s.vacuum_count,
      s.autovacuum_count,
      s.analyze_count,
      s.autoanalyze_count,
      GREATEST(
        COALESCE(EXTRACT(EPOCH FROM (now() - s.last_vacuum))/86400, 999999),
        COALESCE(EXTRACT(EPOCH FROM (now() - s.last_autovacuum))/86400, 999999)
      )::int AS days_since_vacuum,
      GREATEST(
        COALESCE(EXTRACT(EPOCH FROM (now() - s.last_analyze))/86400, 999999),
        COALESCE(EXTRACT(EPOCH FROM (now() - s.last_autoanalyze))/86400, 999999)
      )::int AS days_since_analyze,
      CASE
        WHEN s.n_live_tup + s.n_dead_tup = 0 THEN 0
        ELSE round((s.n_dead_tup::numeric / (s.n_live_tup + s.n_dead_tup)) * 100, 2)
      END AS dead_ratio,
      pg_total_relation_size(s.relid) AS total_bytes,
      pg_size_pretty(pg_total_relation_size(s.relid)) AS total_pretty,
      (
        COALESCE(s.n_dead_tup, 0) * 1.0
        + CASE WHEN s.last_autovacuum IS NULL AND s.last_vacuum IS NULL THEN 100000 ELSE 0 END
        + CASE WHEN s.last_autoanalyze IS NULL AND s.last_analyze IS NULL THEN 50000 ELSE 0 END
      )::bigint AS priority_score,
      CASE
        WHEN s.n_live_tup + s.n_dead_tup < 500 THEN 'ok'
        WHEN (s.n_dead_tup::numeric / GREATEST(s.n_live_tup + s.n_dead_tup, 1)) >= 0.3 THEN 'critical'
        WHEN s.last_autovacuum IS NULL AND s.last_vacuum IS NULL AND s.n_live_tup > 10000 THEN 'critical'
        WHEN (s.n_dead_tup::numeric / GREATEST(s.n_live_tup + s.n_dead_tup, 1)) >= 0.15 THEN 'warning'
        WHEN COALESCE(s.last_autoanalyze, s.last_analyze) < now() - interval '30 days' AND s.n_mod_since_analyze > 1000 THEN 'warning'
        ELSE 'ok'
      END AS status
    FROM pg_stat_user_tables s
    WHERE s.schemaname = 'public'
  ) t;

  RETURN jsonb_build_object('items', v_result, 'captured_at', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_vacuum_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vacuum_health() TO authenticated, service_role;