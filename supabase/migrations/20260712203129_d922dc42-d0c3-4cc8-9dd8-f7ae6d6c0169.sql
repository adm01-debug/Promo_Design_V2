CREATE OR REPLACE FUNCTION public.get_cache_hit_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_heap_hit_ratio numeric;
  v_idx_hit_ratio numeric;
  v_tables jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  SELECT
    CASE WHEN sum(heap_blks_hit + heap_blks_read) = 0 THEN NULL
      ELSE round((sum(heap_blks_hit)::numeric / sum(heap_blks_hit + heap_blks_read)) * 100, 2)
    END,
    CASE WHEN sum(idx_blks_hit + idx_blks_read) = 0 THEN NULL
      ELSE round((sum(idx_blks_hit)::numeric / sum(idx_blks_hit + idx_blks_read)) * 100, 2)
    END
  INTO v_heap_hit_ratio, v_idx_hit_ratio
  FROM pg_statio_user_tables
  WHERE schemaname = 'public';

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.seq_scans DESC NULLS LAST), '[]'::jsonb) INTO v_tables
  FROM (
    SELECT
      s.relname AS table_name,
      s.seq_scan AS seq_scans,
      s.seq_tup_read AS seq_tup_read,
      s.idx_scan AS idx_scans,
      s.idx_tup_fetch AS idx_tup_fetch,
      CASE
        WHEN (s.seq_scan + s.idx_scan) = 0 THEN NULL
        ELSE round((s.idx_scan::numeric / (s.seq_scan + s.idx_scan)) * 100, 2)
      END AS index_use_ratio,
      CASE
        WHEN (io.heap_blks_hit + io.heap_blks_read) = 0 THEN NULL
        ELSE round((io.heap_blks_hit::numeric / (io.heap_blks_hit + io.heap_blks_read)) * 100, 2)
      END AS heap_hit_ratio,
      s.n_live_tup AS live_tuples,
      CASE
        WHEN s.n_live_tup > 10000 AND s.seq_scan > 1000
          AND (s.seq_scan::numeric / GREATEST(s.seq_scan + s.idx_scan, 1)) > 0.5
        THEN 'warning'
        ELSE 'ok'
      END AS status
    FROM pg_stat_user_tables s
    JOIN pg_statio_user_tables io ON io.relid = s.relid
    WHERE s.schemaname = 'public'
      AND (s.seq_scan + s.idx_scan) > 0
    ORDER BY s.seq_scan DESC
    LIMIT 20
  ) t;

  RETURN jsonb_build_object(
    'heap_hit_ratio', v_heap_hit_ratio,
    'idx_hit_ratio', v_idx_hit_ratio,
    'tables', v_tables,
    'captured_at', now()
  );
END;
$function$;