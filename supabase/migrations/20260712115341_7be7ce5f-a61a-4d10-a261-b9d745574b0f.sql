
-- 1. Tabela maintenance_runs
CREATE TABLE public.maintenance_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  triggered_by UUID,
  source TEXT NOT NULL CHECK (source IN ('cron','manual')),
  status TEXT NOT NULL CHECK (status IN ('success','error','partial','skipped')),
  audit_deleted BIGINT NOT NULL DEFAULT 0,
  notifications_deleted BIGINT NOT NULL DEFAULT 0,
  status_audit_deleted BIGINT NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.maintenance_runs TO authenticated;
GRANT ALL ON public.maintenance_runs TO service_role;

ALTER TABLE public.maintenance_runs ENABLE ROW LEVEL SECURITY;

-- Helper: is user owner/admin em qualquer organização
CREATE OR REPLACE FUNCTION public.is_any_org_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND role IN ('owner','admin')
  );
$$;

CREATE POLICY "Owners/admins podem ver histórico de manutenção"
ON public.maintenance_runs
FOR SELECT
TO authenticated
USING (public.is_any_org_admin(auth.uid()));

CREATE INDEX idx_maintenance_runs_created_desc ON public.maintenance_runs (created_at DESC);

-- 2. Refactor cleanup_expired_data com advisory lock e registro
CREATE OR REPLACE FUNCTION public.cleanup_expired_data(
  _audit_retention_days integer DEFAULT 180,
  _notifications_read_retention_days integer DEFAULT 90,
  _status_audit_retention_days integer DEFAULT 365,
  _source text DEFAULT 'manual',
  _triggered_by uuid DEFAULT NULL
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
  v_started timestamptz := clock_timestamp();
  v_duration_ms integer;
  v_lock_key bigint := hashtext('cleanup_expired_data')::bigint;
  v_acquired boolean;
  v_effective_triggered_by uuid;
BEGIN
  IF _source = 'manual' AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden: service_role required';
  END IF;

  v_effective_triggered_by := COALESCE(_triggered_by, CASE WHEN _source = 'manual' THEN auth.uid() ELSE NULL END);

  v_acquired := pg_try_advisory_lock(v_lock_key);
  IF NOT v_acquired THEN
    INSERT INTO public.maintenance_runs(
      triggered_by, source, status, started_at, finished_at, duration_ms, error_message
    ) VALUES (
      v_effective_triggered_by, _source, 'skipped', v_started, clock_timestamp(),
      EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started))::int,
      'Outra execução de limpeza está em andamento'
    );
    RETURN jsonb_build_object('skipped', true, 'reason', 'lock_busy');
  END IF;

  BEGIN
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

    v_duration_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started))::int;

    INSERT INTO public.maintenance_runs(
      triggered_by, source, status,
      audit_deleted, notifications_deleted, status_audit_deleted,
      duration_ms, started_at, finished_at
    ) VALUES (
      v_effective_triggered_by, _source, 'success',
      v_audit_deleted, v_notif_deleted, v_status_deleted,
      v_duration_ms, v_started, clock_timestamp()
    );

    PERFORM pg_advisory_unlock(v_lock_key);

    RETURN jsonb_build_object(
      'audit_log_deleted', v_audit_deleted,
      'notifications_deleted', v_notif_deleted,
      'status_audit_deleted', v_status_deleted,
      'duration_ms', v_duration_ms,
      'executed_at', now()
    );
  EXCEPTION WHEN OTHERS THEN
    v_duration_ms := EXTRACT(MILLISECOND FROM (clock_timestamp() - v_started))::int;
    INSERT INTO public.maintenance_runs(
      triggered_by, source, status,
      audit_deleted, notifications_deleted, status_audit_deleted,
      duration_ms, started_at, finished_at, error_message
    ) VALUES (
      v_effective_triggered_by, _source, 'error',
      v_audit_deleted, v_notif_deleted, v_status_deleted,
      v_duration_ms, v_started, clock_timestamp(), SQLERRM
    );
    PERFORM pg_advisory_unlock(v_lock_key);
    RAISE;
  END;
END;
$$;

-- 3. Refactor run_scheduled_cleanup para delegar
CREATE OR REPLACE FUNCTION public.run_scheduled_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Chamada interna: assume service_role check via SECURITY DEFINER + cron context
  -- Bypassa o check de service_role via SET LOCAL role
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  SELECT public.cleanup_expired_data(
    _audit_retention_days => 180,
    _notifications_read_retention_days => 90,
    _status_audit_retention_days => 365,
    _source => 'cron',
    _triggered_by => NULL
  ) INTO v_result;

  RAISE NOTICE 'Scheduled cleanup completed: %', v_result;
  RETURN v_result;
END;
$$;

-- 4. get_table_sizes
CREATE OR REPLACE FUNCTION public.get_table_sizes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'table', t.tbl,
      'total_bytes', pg_total_relation_size(('public.' || t.tbl)::regclass),
      'table_bytes', pg_relation_size(('public.' || t.tbl)::regclass),
      'index_bytes', pg_indexes_size(('public.' || t.tbl)::regclass),
      'row_estimate', COALESCE((SELECT c.reltuples::bigint FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname='public' AND c.relname = t.tbl), 0)
    )
    ORDER BY pg_total_relation_size(('public.' || t.tbl)::regclass) DESC
  ) INTO v_result
  FROM (VALUES
    ('audit_log'), ('notifications'), ('status_audit_log'),
    ('assets'), ('service_orders'), ('ai_usage_log'),
    ('magicup_history'), ('videos'), ('mockup_drafts'),
    ('maintenance_runs')
  ) AS t(tbl)
  WHERE EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=t.tbl
  );

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_table_sizes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_sizes() TO service_role;
