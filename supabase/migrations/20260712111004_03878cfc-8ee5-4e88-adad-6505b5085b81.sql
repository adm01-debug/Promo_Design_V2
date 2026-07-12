
CREATE OR REPLACE FUNCTION public.cleanup_expired_data(
  _audit_retention_days integer DEFAULT 180,
  _notifications_read_retention_days integer DEFAULT 90,
  _status_audit_retention_days integer DEFAULT 365
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_deleted bigint := 0;
  v_notif_deleted bigint := 0;
  v_status_deleted bigint := 0;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden: service_role required';
  END IF;

  WITH d AS (
    DELETE FROM public.audit_log
    WHERE created_at < now() - make_interval(days => _audit_retention_days)
    RETURNING 1
  ) SELECT count(*) INTO v_audit_deleted FROM d;

  WITH d AS (
    DELETE FROM public.notifications
    WHERE read = true
      AND created_at < now() - make_interval(days => _notifications_read_retention_days)
    RETURNING 1
  ) SELECT count(*) INTO v_notif_deleted FROM d;

  WITH d AS (
    DELETE FROM public.status_audit_log
    WHERE changed_at < now() - make_interval(days => _status_audit_retention_days)
    RETURNING 1
  ) SELECT count(*) INTO v_status_deleted FROM d;

  RETURN jsonb_build_object(
    'audit_log_deleted', v_audit_deleted,
    'notifications_deleted', v_notif_deleted,
    'status_audit_deleted', v_status_deleted,
    'executed_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_data(integer, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data(integer, integer, integer) TO service_role;

CREATE INDEX IF NOT EXISTS idx_audit_log_created_brin
  ON public.audit_log USING brin (created_at) WITH (pages_per_range = 32);

CREATE OR REPLACE FUNCTION public.get_maintenance_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'audit_log_total', (SELECT count(*) FROM public.audit_log),
    'audit_log_older_180d', (SELECT count(*) FROM public.audit_log WHERE created_at < now() - interval '180 days'),
    'notifications_read_older_90d', (SELECT count(*) FROM public.notifications WHERE read = true AND created_at < now() - interval '90 days'),
    'status_audit_older_365d', (SELECT count(*) FROM public.status_audit_log WHERE changed_at < now() - interval '365 days')
  );
$$;

REVOKE ALL ON FUNCTION public.get_maintenance_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_maintenance_stats() TO authenticated, service_role;
