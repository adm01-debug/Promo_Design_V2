
CREATE OR REPLACE FUNCTION public.cleanup_expired_data_for_org(
  _org_id uuid,
  _source text DEFAULT 'manual_per_org',
  _triggered_by uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_days integer;
  v_notif_days integer;
  v_status_days integer;
  v_audit_deleted bigint := 0;
  v_notif_deleted bigint := 0;
  v_status_deleted bigint := 0;
  v_started timestamptz := clock_timestamp();
  v_duration_ms integer;
BEGIN
  IF _source = 'manual_per_org' AND auth.role() IS DISTINCT FROM 'service_role'
    AND NOT public.has_any_role(auth.uid(), _org_id, ARRAY['owner'::app_role, 'admin'::app_role]) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role for this organization';
  END IF;

  SELECT audit_retention_days, notifications_retention_days, status_audit_retention_days
    INTO v_audit_days, v_notif_days, v_status_days
  FROM public.organizations WHERE id = _org_id;

  IF v_audit_days IS NULL THEN
    RAISE EXCEPTION 'organization not found: %', _org_id;
  END IF;

  WITH d AS (
    DELETE FROM public.audit_log
    WHERE organization_id = _org_id
      AND created_at < now() - make_interval(days => v_audit_days)
    RETURNING 1
  ) SELECT count(*) INTO v_audit_deleted FROM d;

  WITH d AS (
    DELETE FROM public.status_audit_log s
    USING public.service_orders so
    WHERE s.service_order_id = so.id
      AND so.organization_id = _org_id
      AND s.changed_at < now() - make_interval(days => v_status_days)
    RETURNING 1
  ) SELECT count(*) INTO v_status_deleted FROM d;

  WITH d AS (
    DELETE FROM public.notifications n
    USING public.service_orders so
    WHERE n.os_id = so.id
      AND so.organization_id = _org_id
      AND n.read = true
      AND n.created_at < now() - make_interval(days => v_notif_days)
    RETURNING 1
  ) SELECT count(*) INTO v_notif_deleted FROM d;

  v_duration_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started))::int;

  INSERT INTO public.maintenance_runs(
    triggered_by, source, status,
    audit_deleted, notifications_deleted, status_audit_deleted,
    duration_ms, started_at, finished_at
  ) VALUES (
    COALESCE(_triggered_by, CASE WHEN _source = 'manual_per_org' THEN auth.uid() ELSE NULL END),
    _source, 'success',
    v_audit_deleted, v_notif_deleted, v_status_deleted,
    v_duration_ms, v_started, clock_timestamp()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'organization_id', _org_id,
    'audit_deleted', v_audit_deleted,
    'notifications_deleted', v_notif_deleted,
    'status_audit_deleted', v_status_deleted,
    'duration_ms', v_duration_ms
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.run_scheduled_cleanup_per_org()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_results jsonb := '[]'::jsonb;
  v_result jsonb;
  v_max_notif_days integer;
  v_orphan_deleted bigint := 0;
  v_started timestamptz := clock_timestamp();
  v_duration_ms integer;
BEGIN
  FOR v_org IN SELECT id FROM public.organizations ORDER BY id LOOP
    BEGIN
      v_result := public.cleanup_expired_data_for_org(v_org.id, 'cron_per_org', NULL);
      v_results := v_results || v_result;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.maintenance_runs(source, status, error_message, started_at, finished_at)
      VALUES ('cron_per_org', 'error', left('org ' || v_org.id || ': ' || SQLERRM, 1000),
              clock_timestamp(), clock_timestamp());
    END;
  END LOOP;

  SELECT COALESCE(MAX(notifications_retention_days), 90) INTO v_max_notif_days FROM public.organizations;

  WITH d AS (
    DELETE FROM public.notifications
    WHERE os_id IS NULL
      AND read = true
      AND created_at < now() - make_interval(days => v_max_notif_days)
    RETURNING 1
  ) SELECT count(*) INTO v_orphan_deleted FROM d;

  v_duration_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started))::int;

  INSERT INTO public.maintenance_runs(
    source, status, notifications_deleted, duration_ms, started_at, finished_at
  ) VALUES (
    'cron_per_org_orphans', 'success', v_orphan_deleted, v_duration_ms, v_started, clock_timestamp()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'per_org', v_results,
    'orphan_notifications_deleted', v_orphan_deleted,
    'orphan_retention_days', v_max_notif_days,
    'duration_ms', v_duration_ms
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_data_for_org(uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_scheduled_cleanup_per_org() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data_for_org(uuid, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.run_scheduled_cleanup_per_org() TO service_role;
