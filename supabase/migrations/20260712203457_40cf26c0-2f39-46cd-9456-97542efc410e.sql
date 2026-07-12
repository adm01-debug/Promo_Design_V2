CREATE OR REPLACE FUNCTION public.kill_backend(_pid integer, _mode text DEFAULT 'cancel')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result boolean;
  v_target RECORD;
  v_started timestamptz := clock_timestamp();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  IF _pid IS NULL OR _pid <= 0 THEN
    RAISE EXCEPTION 'invalid pid';
  END IF;

  IF _mode NOT IN ('cancel', 'terminate') THEN
    RAISE EXCEPTION 'invalid mode: use cancel or terminate';
  END IF;

  -- Verifica que o PID pertence ao banco atual (não permite matar processos do sistema)
  SELECT pid, usename, state, application_name, query
  INTO v_target
  FROM pg_stat_activity
  WHERE pid = _pid
    AND datname = current_database();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pid % not found in current database', _pid;
  END IF;

  -- Bloqueia matar processos do superusuário/serviço
  IF v_target.usename IN ('postgres', 'supabase_admin', 'supabase_auth_admin', 'supabase_storage_admin', 'authenticator') THEN
    RAISE EXCEPTION 'cannot terminate system backend (%)', v_target.usename;
  END IF;

  IF _mode = 'cancel' THEN
    SELECT pg_cancel_backend(_pid) INTO v_result;
  ELSE
    SELECT pg_terminate_backend(_pid) INTO v_result;
  END IF;

  INSERT INTO public.maintenance_runs(
    triggered_by, source, status,
    audit_deleted, notifications_deleted, status_audit_deleted,
    duration_ms, started_at, finished_at, error_message
  ) VALUES (
    auth.uid(), 'kill_backend_' || _mode,
    CASE WHEN v_result THEN 'success' ELSE 'error' END,
    0, 0, 0,
    EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started))::int,
    v_started, clock_timestamp(),
    left(format('pid=%s user=%s state=%s query=%s',
      _pid, v_target.usename, v_target.state,
      left(regexp_replace(coalesce(v_target.query,''), '\s+', ' ', 'g'), 200)
    ), 1000)
  );

  RETURN jsonb_build_object(
    'ok', v_result,
    'pid', _pid,
    'mode', _mode,
    'target_user', v_target.usename,
    'target_state', v_target.state
  );
END;
$function$;