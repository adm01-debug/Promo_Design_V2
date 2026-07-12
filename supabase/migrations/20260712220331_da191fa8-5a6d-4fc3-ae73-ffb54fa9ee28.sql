
CREATE OR REPLACE FUNCTION public.get_long_running_txns(_min_seconds integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;
  IF _min_seconds < 1 OR _min_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid threshold: must be between 1 and 86400 seconds';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.duration_ms DESC NULLS LAST), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT
      pid,
      usename AS user_name,
      application_name,
      client_addr::text AS client_addr,
      state,
      wait_event_type,
      wait_event,
      xact_start,
      query_start,
      backend_start,
      EXTRACT(MILLISECOND FROM (now() - COALESCE(xact_start, query_start)))::bigint AS duration_ms,
      left(regexp_replace(query, '\s+', ' ', 'g'), 400) AS query,
      CASE
        WHEN EXTRACT(EPOCH FROM (now() - COALESCE(xact_start, query_start))) > 300 THEN 'critical'
        WHEN EXTRACT(EPOCH FROM (now() - COALESCE(xact_start, query_start))) > 60 THEN 'warning'
        ELSE 'ok'
      END AS status,
      usename IN ('postgres', 'supabase_admin', 'supabase_replication_admin', 'authenticator', 'supabase_auth_admin', 'supabase_storage_admin') AS is_system
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND state IS NOT NULL
      AND state <> 'idle'
      AND COALESCE(xact_start, query_start) IS NOT NULL
      AND EXTRACT(EPOCH FROM (now() - COALESCE(xact_start, query_start))) >= _min_seconds
    ORDER BY (now() - COALESCE(xact_start, query_start)) DESC NULLS LAST
    LIMIT 50
  ) t;

  RETURN jsonb_build_object(
    'threshold_seconds', _min_seconds,
    'transactions', v_rows,
    'total', jsonb_array_length(v_rows),
    'captured_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_long_running_txns(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_long_running_txns(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.terminate_backend(_pid integer, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target RECORD;
  v_terminated boolean;
  v_uid uuid := auth.uid();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(v_uid) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  IF _pid IS NULL OR _pid <= 0 THEN
    RAISE EXCEPTION 'invalid pid';
  END IF;

  IF _pid = pg_backend_pid() THEN
    RAISE EXCEPTION 'cannot terminate own backend';
  END IF;

  SELECT pid, usename, datname, state,
         EXTRACT(EPOCH FROM (now() - COALESCE(xact_start, query_start)))::int AS elapsed_s,
         left(regexp_replace(query, '\s+', ' ', 'g'), 400) AS query
    INTO v_target
  FROM pg_stat_activity
  WHERE pid = _pid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pid not found: %', _pid;
  END IF;

  IF v_target.datname IS DISTINCT FROM current_database() THEN
    RAISE EXCEPTION 'pid % is not in current database', _pid;
  END IF;

  IF v_target.usename IN (
    'postgres','supabase_admin','supabase_replication_admin',
    'supabase_auth_admin','supabase_storage_admin','supabase_functions_admin',
    'pgbouncer','authenticator'
  ) THEN
    RAISE EXCEPTION 'refusing to terminate system role: %', v_target.usename;
  END IF;

  SELECT pg_terminate_backend(_pid) INTO v_terminated;

  INSERT INTO public.maintenance_runs(
    triggered_by, source, status, error_message,
    started_at, finished_at, duration_ms
  ) VALUES (
    v_uid, 'terminate_backend',
    CASE WHEN v_terminated THEN 'success' ELSE 'error' END,
    format('pid=%s user=%s elapsed=%ss reason=%s query=%s',
      _pid, v_target.usename, v_target.elapsed_s,
      COALESCE(_reason, 'n/a'), left(v_target.query, 200)),
    now(), now(), v_target.elapsed_s * 1000
  );

  RETURN jsonb_build_object(
    'ok', v_terminated,
    'pid', _pid,
    'user', v_target.usename,
    'elapsed_seconds', v_target.elapsed_s
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.terminate_backend(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.terminate_backend(integer, text) TO authenticated, service_role;
