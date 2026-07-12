
CREATE OR REPLACE FUNCTION public.get_unused_indexes(_min_size_kb integer DEFAULT 64)
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

  IF _min_size_kb < 0 OR _min_size_kb > 10485760 THEN
    RAISE EXCEPTION 'invalid min_size_kb';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY (t.size_bytes)::bigint DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      s.schemaname AS schema,
      s.relname AS table_name,
      s.indexrelname AS index_name,
      s.idx_scan AS scans,
      s.idx_tup_read AS tuples_read,
      s.idx_tup_fetch AS tuples_fetched,
      pg_relation_size(s.indexrelid) AS size_bytes,
      pg_size_pretty(pg_relation_size(s.indexrelid)) AS size_pretty,
      i.indisunique AS is_unique,
      i.indisprimary AS is_primary
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON i.indexrelid = s.indexrelid
    WHERE s.schemaname = 'public'
      AND s.idx_scan = 0
      AND NOT i.indisprimary
      AND NOT i.indisunique
      AND pg_relation_size(s.indexrelid) >= (_min_size_kb * 1024)
  ) t;

  RETURN jsonb_build_object('items', v_result, 'captured_at', now(), 'min_size_kb', _min_size_kb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_unused_indexes(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unused_indexes(integer) TO authenticated, service_role;
