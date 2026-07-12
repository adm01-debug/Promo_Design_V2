
-- Table for weekly disk-size snapshots per critical table
CREATE TABLE public.table_size_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  total_bytes BIGINT NOT NULL,
  table_bytes BIGINT NOT NULL,
  index_bytes BIGINT NOT NULL,
  row_estimate BIGINT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.table_size_snapshots TO authenticated;
GRANT ALL ON public.table_size_snapshots TO service_role;

ALTER TABLE public.table_size_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only org admins can view snapshots"
  ON public.table_size_snapshots
  FOR SELECT
  TO authenticated
  USING (public.is_any_org_admin(auth.uid()));

CREATE INDEX idx_table_size_snapshots_table_time
  ON public.table_size_snapshots(table_name, captured_at DESC);

CREATE INDEX idx_table_size_snapshots_captured_at
  ON public.table_size_snapshots(captured_at DESC);

-- Function to capture snapshot of all critical tables (idempotent via advisory lock)
CREATE OR REPLACE FUNCTION public.capture_table_size_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
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
    PERFORM pg_advisory_unlock(v_lock_key);
    RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_table_size_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.capture_table_size_snapshot() TO authenticated, service_role;

-- Function to compute growth metrics (compare latest snapshot vs snapshot ~N days ago)
CREATE OR REPLACE FUNCTION public.get_table_growth(_days_back integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  IF _days_back < 1 OR _days_back > 365 THEN
    RAISE EXCEPTION 'invalid days_back: must be between 1 and 365';
  END IF;

  WITH latest AS (
    SELECT DISTINCT ON (table_name)
      table_name, total_bytes, row_estimate, captured_at
    FROM public.table_size_snapshots
    ORDER BY table_name, captured_at DESC
  ),
  previous AS (
    SELECT DISTINCT ON (table_name)
      table_name, total_bytes AS prev_bytes, row_estimate AS prev_rows, captured_at AS prev_at
    FROM public.table_size_snapshots
    WHERE captured_at <= now() - make_interval(days => _days_back)
    ORDER BY table_name, captured_at DESC
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'table', l.table_name,
      'current_bytes', l.total_bytes,
      'previous_bytes', COALESCE(p.prev_bytes, NULL),
      'delta_bytes', CASE WHEN p.prev_bytes IS NULL THEN NULL ELSE l.total_bytes - p.prev_bytes END,
      'delta_pct', CASE
        WHEN p.prev_bytes IS NULL OR p.prev_bytes = 0 THEN NULL
        ELSE round(((l.total_bytes - p.prev_bytes)::numeric / p.prev_bytes::numeric) * 100, 2)
      END,
      'current_rows', l.row_estimate,
      'previous_rows', COALESCE(p.prev_rows, NULL),
      'delta_rows', CASE WHEN p.prev_rows IS NULL THEN NULL ELSE l.row_estimate - p.prev_rows END,
      'latest_at', l.captured_at,
      'previous_at', p.prev_at
    )
    ORDER BY l.total_bytes DESC
  ), '[]'::jsonb) INTO v_result
  FROM latest l
  LEFT JOIN previous p ON p.table_name = l.table_name;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_table_growth(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_table_growth(integer) TO authenticated, service_role;
