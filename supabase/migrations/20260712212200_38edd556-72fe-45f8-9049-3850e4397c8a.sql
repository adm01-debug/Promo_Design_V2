CREATE OR REPLACE FUNCTION public.get_replication_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_replicas jsonb;
  v_slots jsonb;
  v_wal jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.application_name), '[]'::jsonb) INTO v_replicas
  FROM (
    SELECT
      pid,
      usename AS user_name,
      application_name,
      client_addr::text AS client_addr,
      state,
      sync_state,
      backend_start,
      EXTRACT(EPOCH FROM (now() - backend_start))::bigint AS uptime_seconds,
      pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn)::bigint AS sent_lag_bytes,
      pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn)::bigint AS write_lag_bytes,
      pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn)::bigint AS flush_lag_bytes,
      pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)::bigint AS replay_lag_bytes,
      EXTRACT(MILLISECOND FROM write_lag)::bigint AS write_lag_ms,
      EXTRACT(MILLISECOND FROM flush_lag)::bigint AS flush_lag_ms,
      EXTRACT(MILLISECOND FROM replay_lag)::bigint AS replay_lag_ms,
      CASE
        WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) > 104857600 THEN 'critical'
        WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) > 10485760 THEN 'warning'
        ELSE 'ok'
      END AS status
    FROM pg_stat_replication
  ) r;

  SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb) INTO v_slots
  FROM (
    SELECT
      slot_name,
      slot_type,
      database,
      active,
      restart_lsn::text,
      confirmed_flush_lsn::text,
      CASE WHEN restart_lsn IS NOT NULL
        THEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint
        ELSE NULL END AS retained_bytes,
      CASE
        WHEN NOT active THEN 'warning'
        WHEN restart_lsn IS NOT NULL AND pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) > 1073741824 THEN 'critical'
        ELSE 'ok'
      END AS status
    FROM pg_replication_slots
  ) s;

  SELECT jsonb_build_object(
    'current_wal_lsn', pg_current_wal_lsn()::text,
    'wal_insert_lsn', pg_current_wal_insert_lsn()::text
  ) INTO v_wal;

  RETURN jsonb_build_object(
    'replicas', v_replicas,
    'slots', v_slots,
    'wal', v_wal,
    'captured_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_replication_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_replication_status() TO authenticated, service_role;