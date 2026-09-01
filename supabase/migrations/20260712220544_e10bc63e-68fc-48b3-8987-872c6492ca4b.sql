
CREATE OR REPLACE FUNCTION public.check_connection_saturation_alerts(_threshold_pct numeric DEFAULT 80)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total int;
  v_active int;
  v_idle_in_txn int;
  v_max int;
  v_pct numeric;
  v_admin RECORD;
  v_alerts_created int := 0;
  v_severity text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  IF _threshold_pct < 10 OR _threshold_pct > 100 THEN
    RAISE EXCEPTION 'invalid threshold: must be between 10 and 100';
  END IF;

  SELECT setting::int INTO v_max FROM pg_settings WHERE name = 'max_connections';

  SELECT
    count(*),
    count(*) FILTER (WHERE state = 'active'),
    count(*) FILTER (WHERE state = 'idle in transaction')
  INTO v_total, v_active, v_idle_in_txn
  FROM pg_stat_activity
  WHERE datname = current_database();

  v_pct := CASE WHEN COALESCE(v_max,0) = 0 THEN 0
    ELSE ROUND((v_total::numeric / v_max) * 100, 1) END;

  IF v_pct < _threshold_pct THEN
    RETURN jsonb_build_object(
      'ok', true, 'alerts_created', 0,
      'saturation_pct', v_pct, 'threshold_pct', _threshold_pct,
      'total', v_total, 'max', v_max
    );
  END IF;

  v_severity := CASE WHEN v_pct >= 95 THEN 'critical' WHEN v_pct >= 90 THEN 'high' ELSE 'warning' END;

  -- Deduplication: skip if there is a recent alert (< 30min)
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE event_type = 'connection_saturation_alert'
      AND created_at > now() - interval '30 minutes'
  ) THEN
    RETURN jsonb_build_object(
      'ok', true, 'alerts_created', 0, 'skipped', 'dedup_30min',
      'saturation_pct', v_pct, 'threshold_pct', _threshold_pct
    );
  END IF;

  FOR v_admin IN
    SELECT DISTINCT user_id FROM public.organization_members WHERE role IN ('owner','admin')
  LOOP
    INSERT INTO public.notifications (
      user_id, os_id, os_number, product_name, old_status, new_status, event_type
    ) VALUES (
      v_admin.user_id, NULL, 'CONN-SAT',
      format('Saturação de conexões: %s%% (%s/%s)', v_pct, v_total, v_max),
      v_severity,
      format('active=%s idle_in_txn=%s', v_active, v_idle_in_txn),
      'connection_saturation_alert'
    );
    v_alerts_created := v_alerts_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'alerts_created', v_alerts_created,
    'saturation_pct', v_pct,
    'threshold_pct', _threshold_pct,
    'severity', v_severity,
    'total', v_total,
    'active', v_active,
    'idle_in_transaction', v_idle_in_txn,
    'max', v_max
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_connection_saturation_alerts(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_connection_saturation_alerts(numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.run_scheduled_connection_saturation_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  SELECT public.check_connection_saturation_alerts(80) INTO v_result;
  RAISE NOTICE 'Scheduled connection saturation check: %', v_result;
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_scheduled_connection_saturation_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_connection_saturation_check() TO service_role;

-- Schedule via pg_cron every 5 minutes
DO $$
BEGIN
  PERFORM cron.unschedule('check-connection-saturation-every-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'check-connection-saturation-every-5min',
  '*/5 * * * *',
  $$SELECT public.run_scheduled_connection_saturation_check();$$
);
