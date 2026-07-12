CREATE OR REPLACE FUNCTION public.check_replication_slot_alerts(_max_retained_bytes bigint DEFAULT 1073741824)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row RECORD;
  v_admin RECORD;
  v_alerts_created integer := 0;
  v_slots_flagged integer := 0;
  v_severity text;
  v_msg text;
  v_retained bigint;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: service_role or admin required';
  END IF;

  FOR v_row IN
    SELECT
      slot_name,
      slot_type,
      active,
      restart_lsn,
      CASE WHEN restart_lsn IS NOT NULL
        THEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint
        ELSE NULL END AS retained_bytes
    FROM pg_replication_slots
  LOOP
    v_retained := v_row.retained_bytes;
    v_severity := NULL;

    IF NOT v_row.active THEN
      v_severity := 'inactive';
    ELSIF v_retained IS NOT NULL AND v_retained > _max_retained_bytes THEN
      v_severity := 'wal_bloat';
    END IF;

    IF v_severity IS NULL THEN
      CONTINUE;
    END IF;

    v_slots_flagged := v_slots_flagged + 1;

    -- Dedupe: skip if same slot alerted in last 6 hours
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE event_type = 'replication_slot_alert'
        AND new_status = v_row.slot_name
        AND created_at >= now() - interval '6 hours'
    ) THEN
      CONTINUE;
    END IF;

    v_msg := CASE v_severity
      WHEN 'inactive' THEN 'Slot inativo: ' || v_row.slot_name
      ELSE 'Slot ' || v_row.slot_name || ' retendo ' ||
           pg_size_pretty(v_retained) || ' de WAL'
    END;

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
        'REPL-' || left(md5(v_row.slot_name || now()::text), 6),
        v_msg,
        v_severity,
        v_row.slot_name,
        'replication_slot_alert'
      );
      v_alerts_created := v_alerts_created + 1;
    END LOOP;

    RAISE NOTICE 'Replication slot alert: slot=% severity=% retained=%',
      v_row.slot_name, v_severity, v_retained;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'slots_flagged', v_slots_flagged,
    'alerts_created', v_alerts_created,
    'max_retained_bytes', _max_retained_bytes,
    'checked_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_replication_slot_alerts(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_replication_slot_alerts(bigint) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.run_scheduled_replication_slot_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  SELECT public.check_replication_slot_alerts(1073741824) INTO v_result;
  RAISE NOTICE 'Scheduled replication slot check: %', v_result;
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_scheduled_replication_slot_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_replication_slot_check() TO postgres, service_role;

DO $$
DECLARE v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'check-replication-slots-every-10min';
  IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;
END $$;

SELECT cron.schedule(
  'check-replication-slots-every-10min',
  '*/10 * * * *',
  $$ SELECT public.run_scheduled_replication_slot_check(); $$
);