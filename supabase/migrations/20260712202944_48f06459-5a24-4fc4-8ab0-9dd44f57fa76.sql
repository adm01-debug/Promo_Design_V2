CREATE OR REPLACE FUNCTION public.get_top_writers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.total_writes DESC NULLS LAST), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      s.schemaname AS schema,
      s.relname AS table_name,
      s.n_tup_ins AS inserts,
      s.n_tup_upd AS updates,
      s.n_tup_del AS deletes,
      s.n_tup_hot_upd AS hot_updates,
      (s.n_tup_ins + s.n_tup_upd + s.n_tup_del) AS total_writes,
      CASE
        WHEN s.n_tup_upd = 0 THEN NULL
        ELSE round((s.n_tup_hot_upd::numeric / s.n_tup_upd) * 100, 2)
      END AS hot_update_ratio,
      s.n_live_tup AS live_tuples,
      s.n_dead_tup AS dead_tuples,
      s.last_autovacuum,
      s.last_autoanalyze,
      s.autovacuum_count,
      s.autoanalyze_count
    FROM pg_stat_user_tables s
    WHERE s.schemaname = 'public'
      AND (s.n_tup_ins + s.n_tup_upd + s.n_tup_del) > 0
    ORDER BY (s.n_tup_ins + s.n_tup_upd + s.n_tup_del) DESC
    LIMIT 20
  ) t;

  RETURN jsonb_build_object('items', v_result, 'captured_at', now());
END;
$function$;