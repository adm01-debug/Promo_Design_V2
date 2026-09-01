
CREATE OR REPLACE FUNCTION public.get_table_bloat_health()
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

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.dead_ratio DESC NULLS LAST), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      s.schemaname AS schema,
      s.relname AS table_name,
      s.n_live_tup AS live_tuples,
      s.n_dead_tup AS dead_tuples,
      CASE
        WHEN (s.n_live_tup + s.n_dead_tup) = 0 THEN 0
        ELSE round((s.n_dead_tup::numeric / (s.n_live_tup + s.n_dead_tup)) * 100, 2)
      END AS dead_ratio,
      s.last_vacuum,
      s.last_autovacuum,
      s.last_analyze,
      s.last_autoanalyze,
      s.vacuum_count,
      s.autovacuum_count,
      pg_total_relation_size(s.relid) AS total_bytes,
      pg_size_pretty(pg_total_relation_size(s.relid)) AS total_pretty,
      CASE
        WHEN s.n_live_tup + s.n_dead_tup < 1000 THEN 'ok'
        WHEN s.n_dead_tup::numeric / GREATEST(s.n_live_tup + s.n_dead_tup, 1) >= 0.3 THEN 'critical'
        WHEN s.n_dead_tup::numeric / GREATEST(s.n_live_tup + s.n_dead_tup, 1) >= 0.15 THEN 'warning'
        ELSE 'ok'
      END AS status
    FROM pg_stat_user_tables s
    WHERE s.schemaname = 'public'
  ) t;

  RETURN jsonb_build_object('items', v_result, 'captured_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.get_table_bloat_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_table_bloat_health() TO authenticated, service_role;
