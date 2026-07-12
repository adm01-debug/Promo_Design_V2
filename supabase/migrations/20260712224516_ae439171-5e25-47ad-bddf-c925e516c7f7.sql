-- =====================================================================
-- Partition audit_log by month on created_at.
--
-- Rationale
-- ---------
-- Historical queries scan by (organization_id, created_at) or
-- (user_id, created_at). Monthly partitions let Postgres prune
-- irrelevant months entirely — smaller indexes per partition, cheaper
-- vacuum, and O(1) retention pruning (DETACH + DROP a partition
-- instead of DELETE'ing millions of rows).
--
-- Pre-conditions verified before running:
--   * public.audit_log is currently empty (0 rows).
--   * No foreign keys reference public.audit_log.
--   * pg_cron is installed (used to auto-create future partitions).
--
-- Migration is idempotent-safe on triggers/policies via DROP ... IF EXISTS.
-- =====================================================================

-- 1) Drop the notification trigger before we replace the table so
--    inserts during the swap can't fire against a stale definition.
DROP TRIGGER IF EXISTS trg_audit_alert_notify ON public.audit_log;

-- 2) Drop the existing (empty) audit_log table.
DROP TABLE IF EXISTS public.audit_log CASCADE;

-- 3) Create the new partitioned parent. Partition key must appear in PK,
--    so PK becomes (id, created_at).
CREATE TABLE public.audit_log (
  id              UUID        NOT NULL DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id         UUID        NOT NULL,
  table_name      TEXT        NOT NULL,
  record_id       UUID,
  action          TEXT        NOT NULL,
  changed_fields  JSONB,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 4) GRANTs BEFORE RLS so the Data API can reach the table.
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL           ON public.audit_log TO service_role;

-- 5) Enable RLS and recreate policies (same semantics as before).
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert audit entries"
  ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can view audit log"
  ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    ((organization_id IS NULL) AND (user_id = auth.uid()))
    OR ((organization_id IS NOT NULL) AND public.is_member_of(auth.uid(), organization_id))
  );

CREATE POLICY "Users can view audit logs for their organization"
  ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_members.organization_id
      FROM public.organization_members
      WHERE organization_members.user_id = auth.uid()
    )
  );

-- 6) Recreate indexes on the partitioned parent. Postgres propagates
--    these to every existing and future partition automatically.
CREATE INDEX idx_audit_log_org
  ON public.audit_log (organization_id, created_at DESC);

CREATE INDEX idx_audit_log_org_created
  ON public.audit_log (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

CREATE INDEX idx_audit_log_user_created
  ON public.audit_log (user_id, created_at DESC);

CREATE INDEX idx_audit_log_action_created
  ON public.audit_log (action, created_at DESC);

CREATE INDEX idx_audit_log_table_record
  ON public.audit_log (table_name, record_id);

-- BRIN on created_at across the parent — useful for range scans that
-- cross many partitions (rare, but very cheap to keep).
CREATE INDEX idx_audit_log_created_brin
  ON public.audit_log USING brin (created_at) WITH (pages_per_range = 32);

-- 7) Recreate the notification trigger.
CREATE TRIGGER trg_audit_alert_notify
  AFTER INSERT ON public.audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_audit_alert();

-- =====================================================================
-- 8) Partition maintenance helpers.
--    Each partition covers exactly one calendar month:
--        audit_log_yYYYYmMM  FOR VALUES FROM (start) TO (end)
--    A default partition catches out-of-range rows so unexpected clock
--    drift or backfills never fail.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.create_audit_log_partition(_month_start DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start   TIMESTAMPTZ := date_trunc('month', _month_start)::timestamptz;
  v_end     TIMESTAMPTZ := (date_trunc('month', _month_start) + interval '1 month')::timestamptz;
  v_name    TEXT        := format('audit_log_y%sm%s',
                                  to_char(v_start, 'YYYY'),
                                  to_char(v_start, 'MM'));
  v_exists  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = v_name
  ) INTO v_exists;

  IF v_exists THEN
    RETURN format('exists:%s', v_name);
  END IF;

  EXECUTE format(
    'CREATE TABLE public.%I PARTITION OF public.audit_log FOR VALUES FROM (%L) TO (%L)',
    v_name, v_start, v_end
  );
  RETURN format('created:%s', v_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_audit_log_partition(DATE) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_audit_log_partitions(_months_ahead INT DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created TEXT[] := ARRAY[]::TEXT[];
  v_month   DATE;
  v_result  TEXT;
  v_i       INT;
BEGIN
  IF _months_ahead < 0 OR _months_ahead > 24 THEN
    RAISE EXCEPTION 'invalid months_ahead: must be 0..24';
  END IF;

  -- Always ensure previous, current, and _months_ahead future months.
  FOR v_i IN -1.._months_ahead LOOP
    v_month := (date_trunc('month', now()) + make_interval(months => v_i))::date;
    SELECT public.create_audit_log_partition(v_month) INTO v_result;
    v_created := array_append(v_created, v_result);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'ensured_at', now(),
    'partitions', to_jsonb(v_created)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_audit_log_partitions(INT) FROM PUBLIC, anon, authenticated;

-- Retention: DETACH + DROP any partition whose window ends before the cutoff.
CREATE OR REPLACE FUNCTION public.drop_old_audit_log_partitions(_retention_months INT DEFAULT 12)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff   TIMESTAMPTZ;
  v_row      RECORD;
  v_dropped  TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  IF _retention_months < 1 OR _retention_months > 120 THEN
    RAISE EXCEPTION 'invalid retention_months: must be 1..120';
  END IF;

  v_cutoff := (date_trunc('month', now()) - make_interval(months => _retention_months))::timestamptz;

  FOR v_row IN
    SELECT c.relname AS name,
           pg_get_expr(c.relpartbound, c.oid) AS bound
    FROM pg_inherits i
    JOIN pg_class c   ON c.oid = i.inhrelid
    JOIN pg_class p   ON p.oid = i.inhparent
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.relname = 'audit_log' AND n.nspname = 'public'
  LOOP
    -- Extract the upper bound of the range partition (TO ('YYYY-MM-01 ...')).
    -- If bound parsing fails (e.g. DEFAULT partition), skip it.
    DECLARE
      v_upper_txt TEXT;
      v_upper     TIMESTAMPTZ;
    BEGIN
      v_upper_txt := substring(v_row.bound FROM 'TO \(''([^'']+)''\)');
      IF v_upper_txt IS NULL THEN
        CONTINUE; -- skip default partition
      END IF;
      v_upper := v_upper_txt::timestamptz;
      IF v_upper <= v_cutoff THEN
        EXECUTE format(
          'ALTER TABLE public.audit_log DETACH PARTITION public.%I',
          v_row.name
        );
        EXECUTE format('DROP TABLE public.%I', v_row.name);
        v_dropped := array_append(v_dropped, v_row.name);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'cutoff', v_cutoff,
    'dropped', to_jsonb(v_dropped)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.drop_old_audit_log_partitions(INT) FROM PUBLIC, anon, authenticated;

-- 9) Bootstrap partitions: previous, current, +3 months, plus DEFAULT.
SELECT public.ensure_audit_log_partitions(3);

CREATE TABLE IF NOT EXISTS public.audit_log_default
  PARTITION OF public.audit_log DEFAULT;

-- 10) Schedule automatic partition creation on the 25th of every month
--     (safely before the month ends). Idempotent via unschedule-by-name.
DO $do$
DECLARE
  v_jobid bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'ensure_audit_log_partitions';
    IF v_jobid IS NOT NULL THEN
      PERFORM cron.unschedule(v_jobid);
    END IF;
    PERFORM cron.schedule(
      'ensure_audit_log_partitions',
      '0 3 25 * *',
      $$SELECT public.ensure_audit_log_partitions(3);$$
    );
  END IF;
END
$do$;
