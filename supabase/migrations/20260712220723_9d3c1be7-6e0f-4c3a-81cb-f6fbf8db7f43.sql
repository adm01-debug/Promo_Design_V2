
CREATE OR REPLACE FUNCTION public.check_idle_in_txn_alerts(_threshold_seconds integer DEFAULT 1800)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row RECORD;
  v_admin RECORD;
  v_alerts_created int := 0;
  v_sessions_found int := 0;
  v_details jsonb := '[]'::jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;
  IF _threshold_seconds < 60 OR _threshold_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid threshold: must be between 60 and 86400 seconds';
  END IF;

  FOR v_row IN
    SELECT
      pid,
      usename AS user_name,
      application_name,
      EXTRACT(EPOCH FROM (now() - xact_start))::int AS elapsed_s,
      left(regexp_replace(COALESCE(query, ''), '\s+', ' ', 'g'), 200) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state = 'idle in transaction'
      AND xact_start IS NOT NULL
      AND EXTRACT(EPOCH FROM (now() - xact_start)) >= _threshold_seconds
      AND usename NOT IN (
        'postgres','supabase_admin','supabase_replication_admin',
        'supabase_auth_admin','supabase_storage_admin','supabase_functions_admin'
      )
    LIMIT 20
  LOOP
    v_sessions_found := v_sessions_found + 1;
    v_details := v_details || jsonb_build_object(
      'pid', v_row.pid,
      'user', v_row.user_name,
      'application', v_row.application_name,
      'elapsed_seconds', v_row.elapsed_s
    );

    -- Deduplication: skip if a notification for this PID was created in the last 20min
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE event_type = 'idle_in_txn_alert'
        AND os_number = format('IDLE-PID-%s', v_row.pid)
        AND created_at > now() - interval '20 minutes'
    ) THEN
      CONTINUE;
    END IF;

    FOR v_admin IN
      SELECT DISTINCT user_id FROM public.organization_members WHERE role IN ('owner','admin')
    LOOP
      INSERT INTO public.notifications (
        user_id, os_id, os_number, product_name, old_status, new_status, event_type
      ) VALUES (
        v_admin.user_id, NULL,
        format('IDLE-PID-%s', v_row.pid),
        format('Sessão ociosa em transação há %ss (user=%s)', v_row.elapsed_s, v_row.user_name),
        COALESCE(v_row.application_name, 'app'),
        left(v_row.query, 200),
        'idle_in_txn_alert'
      );
      v_alerts_created := v_alerts_created + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'threshold_seconds', _threshold_seconds,
    'sessions_found', v_sessions_found,
    'alerts_created', v_alerts_created,
    'sessions', v_details,
    'captured_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_idle_in_txn_alerts(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_idle_in_txn_alerts(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.run_scheduled_idle_in_txn_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  SELECT public.check_idle_in_txn_alerts(1800) INTO v_result;
  RAISE NOTICE 'Scheduled idle-in-txn check: %', v_result;
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_scheduled_idle_in_txn_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_idle_in_txn_check() TO service_role;

DO $$
BEGIN
  PERFORM cron.unschedule('check-idle-in-txn-every-10min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'check-idle-in-txn-every-10min',
  '*/10 * * * *',
  $$SELECT public.run_scheduled_idle_in_txn_check();$$
);

-- Include the new event in the consolidated incidents view
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
    ORDER BY created_at DESC LIMIT 50
  ) r;

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

  SELECT jsonb_object_agg(event_type, cnt) INTO v_counts
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
