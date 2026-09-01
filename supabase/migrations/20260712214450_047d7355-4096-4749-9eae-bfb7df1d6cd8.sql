-- SECURITY DEFINER hardening — least-privilege EXECUTE grants.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon',   r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
  END LOOP;
END$$;

-- RLS helper functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, app_role)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, app_role[])     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid, uuid)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_orgs()                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mfa_authenticated()                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_any_org_admin(uuid)                   TO authenticated;

-- Business RPCs
GRANT EXECUTE ON FUNCTION public.accept_organization_invite(uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid, numeric)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_assets_ranked(uuid, text, uuid, asset_type[], text[], text, boolean, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_assets_ranked(uuid, text, uuid, asset_type[], text[], text, boolean, integer, integer, bigint, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.explain_search_assets_ranked(uuid, text) TO authenticated;

-- Admin observability panels (internal is_any_org_admin gate)
GRANT EXECUTE ON FUNCTION public.get_cache_hit_stats()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_health()                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_activity()                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_maintenance_stats()                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_replication_status()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_slow_queries(integer)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_bloat_health()                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_growth(integer)                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_sizes()                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_writers()                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unused_indexes(integer)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vacuum_health()                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_lock_alerts(integer)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_replication_slot_alerts(bigint)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_slo_regressions(integer, integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.capture_table_size_snapshot()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.kill_backend(integer, text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_manual_vacuum(text, text)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_manual_analyze(text)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data_for_org(uuid, text, uuid) TO authenticated;

-- Cron / service_role entry points
GRANT EXECUTE ON FUNCTION public.run_scheduled_cleanup()                  TO service_role;
GRANT EXECUTE ON FUNCTION public.run_scheduled_cleanup_per_org()          TO service_role;
GRANT EXECUTE ON FUNCTION public.run_scheduled_lock_check()               TO service_role;
GRANT EXECUTE ON FUNCTION public.run_scheduled_replication_slot_check()   TO service_role;
GRANT EXECUTE ON FUNCTION public.run_scheduled_slo_check()                TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data(integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data(integer, integer, integer, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cache_hit_stats()                    TO service_role;
GRANT EXECUTE ON FUNCTION public.get_db_health()                          TO service_role;
GRANT EXECUTE ON FUNCTION public.get_live_activity()                      TO service_role;
GRANT EXECUTE ON FUNCTION public.get_replication_status()                 TO service_role;
GRANT EXECUTE ON FUNCTION public.get_slow_queries(integer)                TO service_role;
GRANT EXECUTE ON FUNCTION public.get_table_bloat_health()                 TO service_role;
GRANT EXECUTE ON FUNCTION public.get_table_growth(integer)                TO service_role;
GRANT EXECUTE ON FUNCTION public.get_table_sizes()                        TO service_role;
GRANT EXECUTE ON FUNCTION public.get_top_writers()                        TO service_role;
GRANT EXECUTE ON FUNCTION public.get_unused_indexes(integer)              TO service_role;
GRANT EXECUTE ON FUNCTION public.get_vacuum_health()                      TO service_role;
GRANT EXECUTE ON FUNCTION public.capture_table_size_snapshot()            TO service_role;
GRANT EXECUTE ON FUNCTION public.run_manual_vacuum(text, text)            TO service_role;
GRANT EXECUTE ON FUNCTION public.run_manual_analyze(text)                 TO service_role;
GRANT EXECUTE ON FUNCTION public.kill_backend(integer, text)              TO service_role;
GRANT EXECUTE ON FUNCTION public.check_lock_alerts(integer)               TO service_role;
GRANT EXECUTE ON FUNCTION public.check_replication_slot_alerts(bigint)    TO service_role;
GRANT EXECUTE ON FUNCTION public.check_slo_regressions(integer, integer, numeric) TO service_role;

-- Performance index for unread notification polling
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
  ON public.notifications (user_id, created_at DESC)
  WHERE read = false;