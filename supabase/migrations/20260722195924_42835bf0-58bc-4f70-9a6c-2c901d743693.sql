
CREATE OR REPLACE FUNCTION public.get_last_hour_overview(_minutes integer DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_since timestamptz;
  v_maint_errors jsonb;
  v_maint_by_source jsonb;
  v_alerts jsonb;
  v_alerts_by_type jsonb;
  v_ai_usage jsonb;
  v_top_features jsonb;
  v_totals jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;
  IF _minutes < 1 OR _minutes > 1440 THEN
    RAISE EXCEPTION 'invalid window: must be between 1 and 1440 minutes';
  END IF;

  v_since := now() - make_interval(mins => _minutes);

  -- Maintenance errors (last N min, capped at 50)
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::jsonb) INTO v_maint_errors
  FROM (
    SELECT id, source, status, duration_ms, error_message, created_at
    FROM public.maintenance_runs
    WHERE status = 'error' AND created_at >= v_since
    ORDER BY created_at DESC LIMIT 50
  ) r;

  SELECT COALESCE(jsonb_object_agg(source, cnt), '{}'::jsonb) INTO v_maint_by_source
  FROM (
    SELECT source, count(*)::int AS cnt
    FROM public.maintenance_runs
    WHERE status = 'error' AND created_at >= v_since
    GROUP BY source ORDER BY count(*) DESC LIMIT 5
  ) s;

  -- System-level alerts (capped at 100)
  SELECT COALESCE(jsonb_agg(row_to_json(n) ORDER BY n.created_at DESC), '[]'::jsonb) INTO v_alerts
  FROM (
    SELECT id, event_type, os_number, product_name, old_status, new_status, created_at, read
    FROM public.notifications
    WHERE created_at >= v_since
      AND event_type IN (
        'audit_alert','replication_slot_alert','maintenance_failure',
        'maintenance_failure_critical','slo_regression','lock_alert',
        'connection_saturation_alert','idle_in_txn_alert'
      )
    ORDER BY created_at DESC LIMIT 100
  ) n;

  SELECT COALESCE(jsonb_object_agg(event_type, cnt), '{}'::jsonb) INTO v_alerts_by_type
  FROM (
    SELECT event_type, count(*)::int AS cnt
    FROM public.notifications
    WHERE created_at >= v_since
      AND event_type IN (
        'audit_alert','replication_slot_alert','maintenance_failure',
        'maintenance_failure_critical','slo_regression','lock_alert',
        'connection_saturation_alert','idle_in_txn_alert'
      )
    GROUP BY event_type
  ) g;

  -- AI usage totals (last N min)
  SELECT jsonb_build_object(
    'requests', COALESCE(count(*), 0)::int,
    'total_cost', COALESCE(sum(cost_estimate), 0)::numeric,
    'tokens_in', COALESCE(sum(tokens_in), 0)::bigint,
    'tokens_out', COALESCE(sum(tokens_out), 0)::bigint
  ) INTO v_ai_usage
  FROM public.ai_usage_log
  WHERE created_at >= v_since;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.requests DESC), '[]'::jsonb) INTO v_top_features
  FROM (
    SELECT feature_name, count(*)::int AS requests, COALESCE(sum(cost_estimate),0)::numeric AS cost
    FROM public.ai_usage_log
    WHERE created_at >= v_since
    GROUP BY feature_name
    ORDER BY count(*) DESC
    LIMIT 5
  ) t;

  v_totals := jsonb_build_object(
    'maintenance_errors', jsonb_array_length(v_maint_errors),
    'alerts', jsonb_array_length(v_alerts),
    'ai_requests', (v_ai_usage->>'requests')::int
  );

  RETURN jsonb_build_object(
    'window_minutes', _minutes,
    'since', v_since,
    'captured_at', now(),
    'totals', v_totals,
    'maintenance_errors', v_maint_errors,
    'maintenance_errors_by_source', v_maint_by_source,
    'alerts', v_alerts,
    'alerts_by_type', v_alerts_by_type,
    'ai_usage', v_ai_usage,
    'top_ai_features', v_top_features
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_last_hour_overview(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_last_hour_overview(integer) TO authenticated, service_role;
