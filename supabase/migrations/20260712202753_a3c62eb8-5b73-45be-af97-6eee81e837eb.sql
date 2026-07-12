
CREATE OR REPLACE FUNCTION public.get_db_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_db_size bigint;
  v_conn_total int;
  v_conn_active int;
  v_conn_idle int;
  v_conn_idle_in_txn int;
  v_conn_max int;
  v_cache_hit numeric;
  v_deadlocks bigint;
  v_rolled_back bigint;
  v_temp_bytes bigint;
  v_xact_commit bigint;
  v_longest_txn_ms bigint;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  SELECT pg_database_size(current_database()) INTO v_db_size;

  SELECT setting::int INTO v_conn_max
  FROM pg_settings WHERE name = 'max_connections';

  SELECT
    count(*),
    count(*) FILTER (WHERE state = 'active'),
    count(*) FILTER (WHERE state = 'idle'),
    count(*) FILTER (WHERE state = 'idle in transaction'),
    COALESCE(MAX(EXTRACT(MILLISECOND FROM (now() - xact_start)))::bigint, 0)
  INTO v_conn_total, v_conn_active, v_conn_idle, v_conn_idle_in_txn, v_longest_txn_ms
  FROM pg_stat_activity
  WHERE datname = current_database();

  SELECT
    ROUND((sum(blks_hit)::numeric / NULLIF(sum(blks_hit) + sum(blks_read), 0)) * 100, 2),
    sum(deadlocks),
    sum(xact_rollback),
    sum(temp_bytes),
    sum(xact_commit)
  INTO v_cache_hit, v_deadlocks, v_rolled_back, v_temp_bytes, v_xact_commit
  FROM pg_stat_database
  WHERE datname = current_database();

  v_result := jsonb_build_object(
    'db_size_bytes', v_db_size,
    'connections', jsonb_build_object(
      'total', v_conn_total,
      'active', v_conn_active,
      'idle', v_conn_idle,
      'idle_in_transaction', v_conn_idle_in_txn,
      'max', COALESCE(v_conn_max, 100),
      'saturation_pct', CASE
        WHEN COALESCE(v_conn_max, 0) = 0 THEN 0
        ELSE ROUND((v_conn_total::numeric / v_conn_max) * 100, 1)
      END
    ),
    'longest_txn_ms', v_longest_txn_ms,
    'cache_hit_ratio', COALESCE(v_cache_hit, 100),
    'deadlocks', COALESCE(v_deadlocks, 0),
    'xact_rollback', COALESCE(v_rolled_back, 0),
    'xact_commit', COALESCE(v_xact_commit, 0),
    'temp_bytes', COALESCE(v_temp_bytes, 0),
    'captured_at', now()
  );

  RETURN v_result;
END;
$$;
