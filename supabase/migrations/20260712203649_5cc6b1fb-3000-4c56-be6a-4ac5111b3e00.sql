CREATE OR REPLACE FUNCTION public.check_lock_alerts(_threshold_ms integer DEFAULT 30000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_lock RECORD;
  v_admin RECORD;
  v_alerts_created integer := 0;
  v_locks_found integer := 0;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: service_role or admin required';
  END IF;

  IF _threshold_ms < 1000 OR _threshold_ms > 3600000 THEN
    RAISE EXCEPTION 'invalid threshold_ms: 1000..3600000';
  END IF;

  FOR v_lock IN
    SELECT
      blocked.pid AS blocked_pid,
      blocking.pid AS blocking_pid,
      blocked.usename AS blocked_user,
      EXTRACT(MILLISECOND FROM (now() - blocked.query_start))::bigint AS blocked_ms,
      left(regexp_replace(coalesce(blocked.query, ''), '\s+', ' ', 'g'), 180) AS blocked_query
    FROM pg_stat_activity blocked
    JOIN pg_stat_activity blocking
      ON blocking.pid = ANY (pg_blocking_pids(blocked.pid))
    WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0
      AND blocked.query_start IS NOT NULL
      AND (now() - blocked.query_start) >= (_threshold_ms || ' milliseconds')::interval
  LOOP
    v_locks_found := v_locks_found + 1;

    -- Dedupe: mesmo PID bloqueado não gera outra alerta na última hora
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE event_type = 'lock_alert'
        AND os_number = 'LOCK-' || v_lock.blocked_pid::text
        AND created_at >= now() - interval '1 hour'
    ) THEN
      CONTINUE;
    END IF;

    FOR v_admin IN
      SELECT DISTINCT user_id
      FROM public.organization_members
      WHERE role IN ('owner', 'admin')
    LOOP
      INSERT INTO public.notifications (
        user_id, os_id, os_number, product_name,
        old_status, new_status, event_type
      ) VALUES (
        v_admin.user_id,
        NULL,
        'LOCK-' || v_lock.blocked_pid::text,
        format('PID %s bloqueado por %s há %sms',
          v_lock.blocked_pid, v_lock.blocking_pid, v_lock.blocked_ms),
        coalesce(v_lock.blocked_user, 'unknown'),
        left(v_lock.blocked_query, 200),
        'lock_alert'
      );
      v_alerts_created := v_alerts_created + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'locks_found', v_locks_found,
    'alerts_created', v_alerts_created,
    'threshold_ms', _threshold_ms,
    'checked_at', now()
  );
END;
$function$;