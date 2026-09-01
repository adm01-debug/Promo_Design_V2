
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE OR REPLACE FUNCTION public.get_slow_queries(_limit integer DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  IF _limit < 1 OR _limit > 100 THEN
    RAISE EXCEPTION 'invalid limit: must be between 1 and 100';
  END IF;

  BEGIN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'query', left(query, 400),
        'calls', calls,
        'total_exec_ms', round(total_exec_time::numeric, 2),
        'mean_exec_ms', round(mean_exec_time::numeric, 2),
        'max_exec_ms', round(max_exec_time::numeric, 2),
        'rows_returned', rows,
        'shared_blks_hit', shared_blks_hit,
        'shared_blks_read', shared_blks_read
      )
      ORDER BY mean_exec_time DESC
    ), '[]'::jsonb) INTO v_result
    FROM (
      SELECT * FROM public.pg_stat_statements_view
      WHERE query NOT ILIKE '%pg_stat_statements%'
        AND query NOT ILIKE '%get_slow_queries%'
        AND calls >= 2
      ORDER BY mean_exec_time DESC
      LIMIT _limit
    ) s;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: try direct access to pg_stat_statements
    BEGIN
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'query', left(query, 400),
          'calls', calls,
          'total_exec_ms', round(total_exec_time::numeric, 2),
          'mean_exec_ms', round(mean_exec_time::numeric, 2),
          'max_exec_ms', round(max_exec_time::numeric, 2),
          'rows_returned', rows,
          'shared_blks_hit', shared_blks_hit,
          'shared_blks_read', shared_blks_read
        )
        ORDER BY mean_exec_time DESC
      ), '[]'::jsonb) INTO v_result
      FROM (
        SELECT * FROM extensions.pg_stat_statements
        WHERE query NOT ILIKE '%pg_stat_statements%'
          AND query NOT ILIKE '%get_slow_queries%'
          AND calls >= 2
        ORDER BY mean_exec_time DESC
        LIMIT _limit
      ) s;
    EXCEPTION WHEN OTHERS THEN
      v_result := jsonb_build_object('error', 'pg_stat_statements not available', 'items', '[]'::jsonb);
      RETURN v_result;
    END;
  END;

  RETURN jsonb_build_object('items', v_result, 'captured_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.get_slow_queries(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_slow_queries(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slow_queries(integer) TO service_role;
