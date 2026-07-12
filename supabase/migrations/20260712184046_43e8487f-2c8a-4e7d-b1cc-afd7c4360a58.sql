-- 1) Expand allowed source values on maintenance_runs
ALTER TABLE public.maintenance_runs DROP CONSTRAINT IF EXISTS maintenance_runs_source_check;
ALTER TABLE public.maintenance_runs ADD CONSTRAINT maintenance_runs_source_check
  CHECK (source = ANY (ARRAY['cron','manual','snapshot_cron','snapshot_manual']));

-- 2) Rewrite capture_table_size_snapshot to log failures to maintenance_runs
CREATE OR REPLACE FUNCTION public.capture_table_size_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_lock_key bigint := hashtext('capture_table_size_snapshot')::bigint;
  v_acquired boolean;
  v_inserted integer := 0;
  v_tbl text;
  v_tables text[] := ARRAY[
    'audit_log','notifications','status_audit_log','assets',
    'service_orders','ai_usage_log','magicup_history','videos',
    'mockup_drafts','maintenance_runs','table_size_snapshots'
  ];
  v_retention_deleted bigint := 0;
  v_started timestamptz := clock_timestamp();
  v_duration_ms integer;
  v_source text;
  v_triggered_by uuid;
BEGIN
  IF auth.role() = 'service_role' THEN
    v_source := 'snapshot_cron';
    v_triggered_by := NULL;
  ELSIF public.is_any_org_admin(auth.uid()) THEN
    v_source := 'snapshot_manual';
    v_triggered_by := auth.uid();
  ELSE
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  v_acquired := pg_try_advisory_lock(v_lock_key);
  IF NOT v_acquired THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'lock_busy');
  END IF;

  BEGIN
    FOREACH v_tbl IN ARRAY v_tables LOOP
      IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v_tbl
      ) THEN
        INSERT INTO public.table_size_snapshots(
          table_name, total_bytes, table_bytes, index_bytes, row_estimate
        )
        SELECT
          v_tbl,
          pg_total_relation_size(('public.' || v_tbl)::regclass),
          pg_relation_size(('public.' || v_tbl)::regclass),
          pg_indexes_size(('public.' || v_tbl)::regclass),
          COALESCE((SELECT c.reltuples::bigint FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname='public' AND c.relname = v_tbl), 0);
        v_inserted := v_inserted + 1;
      END IF;
    END LOOP;

    -- Retention: keep last 90 days of snapshots
    WITH d AS (
      DELETE FROM public.table_size_snapshots
      WHERE captured_at < now() - interval '90 days'
      RETURNING 1
    ) SELECT count(*) INTO v_retention_deleted FROM d;

    PERFORM pg_advisory_unlock(v_lock_key);
    RETURN jsonb_build_object(
      'ok', true,
      'inserted', v_inserted,
      'retention_deleted', v_retention_deleted,
      'captured_at', now()
    );
  EXCEPTION WHEN OTHERS THEN
    v_duration_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started))::int;
    BEGIN
      INSERT INTO public.maintenance_runs(
        triggered_by, source, status,
        audit_deleted, notifications_deleted, status_audit_deleted,
        duration_ms, started_at, finished_at, error_message
      ) VALUES (
        v_triggered_by, v_source, 'error',
        0, 0, 0,
        v_duration_ms, v_started, clock_timestamp(),
        left('snapshot_failure: ' || SQLERRM, 1000)
      );
    EXCEPTION WHEN OTHERS THEN
      -- never let logging swallow the original error
      NULL;
    END;
    PERFORM pg_advisory_unlock(v_lock_key);
    RAISE;
  END;
END;
$function$;