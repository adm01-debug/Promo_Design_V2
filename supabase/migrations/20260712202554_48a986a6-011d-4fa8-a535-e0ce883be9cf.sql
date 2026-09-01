
DROP FUNCTION IF EXISTS public.run_vacuum_analyze(text);

CREATE OR REPLACE FUNCTION public.run_manual_analyze(_table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_started timestamptz := clock_timestamp();
  v_duration_ms integer;
  v_lock_key bigint;
  v_acquired boolean;
  v_exists boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  IF _table_name IS NULL OR length(_table_name) = 0 OR length(_table_name) > 128 THEN
    RAISE EXCEPTION 'invalid table_name';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_stat_user_tables
    WHERE schemaname = 'public' AND relname = _table_name
  ) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'table not found in public schema: %', _table_name;
  END IF;

  v_lock_key := hashtext('analyze:' || _table_name)::bigint;
  v_acquired := pg_try_advisory_lock(v_lock_key);
  IF NOT v_acquired THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'lock_busy', 'table', _table_name);
  END IF;

  BEGIN
    EXECUTE format('ANALYZE public.%I', _table_name);
    v_duration_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started))::int;

    INSERT INTO public.maintenance_runs(
      triggered_by, source, status,
      audit_deleted, notifications_deleted, status_audit_deleted,
      duration_ms, started_at, finished_at
    ) VALUES (
      auth.uid(), 'manual_analyze', 'success',
      0, 0, 0,
      v_duration_ms, v_started, clock_timestamp()
    );

    PERFORM pg_advisory_unlock(v_lock_key);
    RETURN jsonb_build_object(
      'ok', true,
      'table', _table_name,
      'duration_ms', v_duration_ms,
      'executed_at', now()
    );
  EXCEPTION WHEN OTHERS THEN
    v_duration_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started))::int;
    INSERT INTO public.maintenance_runs(
      triggered_by, source, status,
      audit_deleted, notifications_deleted, status_audit_deleted,
      duration_ms, started_at, finished_at, error_message
    ) VALUES (
      auth.uid(), 'manual_analyze', 'error',
      0, 0, 0,
      v_duration_ms, v_started, clock_timestamp(),
      left('analyze_failure(' || _table_name || '): ' || SQLERRM, 1000)
    );
    PERFORM pg_advisory_unlock(v_lock_key);
    RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.run_manual_analyze(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_manual_analyze(text) TO authenticated, service_role;
