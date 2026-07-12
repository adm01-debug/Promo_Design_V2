-- =====================================================================
-- Enable RLS on every audit_log partition.
--
-- Rationale
-- ---------
-- Postgres inherits GRANTs from the partitioned parent to its children,
-- but it does NOT inherit the RLS-enabled flag. If a client hits the
-- child table by name (e.g. `.from("audit_log_y2026m07")` via PostgREST)
-- the parent's policies do not apply. Enabling RLS on each partition
-- makes the check unconditional.
-- =====================================================================

-- 1) Enable RLS on every current partition.
DO $do$
DECLARE
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT c.relname AS name
    FROM pg_inherits i
    JOIN pg_class c   ON c.oid = i.inhrelid
    JOIN pg_class p   ON p.oid = i.inhparent
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.relname = 'audit_log' AND n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_row.name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_row.name);
  END LOOP;
END
$do$;

-- 2) Update the partition creator to enable RLS on brand-new partitions.
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
  -- Close the direct-access bypass: children need RLS turned on too.
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_name);

  RETURN format('created:%s', v_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_audit_log_partition(DATE) FROM PUBLIC, anon, authenticated;
