
CREATE OR REPLACE FUNCTION public.get_recent_incidents(_minutes integer DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz;
  v_maint jsonb;
  v_alerts jsonb;
  v_counts jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  IF _minutes < 1 OR _minutes > 1440 THEN
    RAISE EXCEPTION 'invalid window: must be between 1 and 1440 minutes';
  END IF;

  v_since := now() - make_interval(mins => _minutes);

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_maint
  FROM (
    SELECT id, source, status, duration_ms, error_message, created_at, started_at, finished_at
    FROM public.maintenance_runs
    WHERE status = 'error' AND created_at >= v_since
    ORDER BY created_at DESC
    LIMIT 50
  ) r;

  SELECT COALESCE(jsonb_agg(row_to_json(n) ORDER BY n.created_at DESC), '[]'::jsonb) INTO v_alerts
  FROM (
    SELECT id, event_type, os_number, product_name, old_status, new_status, created_at, read
    FROM public.notifications
    WHERE created_at >= v_since
      AND event_type IN (
        'audit_alert',
        'replication_slot_alert',
        'maintenance_failure',
        'maintenance_failure_critical',
        'slo_regression',
        'lock_alert'
      )
    ORDER BY created_at DESC
    LIMIT 100
  ) n;

  SELECT jsonb_object_agg(event_type, cnt) INTO v_counts
  FROM (
    SELECT event_type, count(*)::int AS cnt
    FROM public.notifications
    WHERE created_at >= v_since
      AND event_type IN (
        'audit_alert',
        'replication_slot_alert',
        'maintenance_failure',
        'maintenance_failure_critical',
        'slo_regression',
        'lock_alert'
      )
    GROUP BY event_type
  ) g;

  RETURN jsonb_build_object(
    'window_minutes', _minutes,
    'since', v_since,
    'captured_at', now(),
    'maintenance_errors', v_maint,
    'alerts', v_alerts,
    'counts_by_type', COALESCE(v_counts, '{}'::jsonb),
    'maintenance_error_count', jsonb_array_length(v_maint),
    'alert_count', jsonb_array_length(v_alerts)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_recent_incidents(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recent_incidents(integer) TO authenticated, service_role;
