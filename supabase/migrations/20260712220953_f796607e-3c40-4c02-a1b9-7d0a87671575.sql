
CREATE OR REPLACE FUNCTION public.get_sequence_saturation(_min_pct numeric DEFAULT 0)
RETURNS TABLE(
  schema_name text,
  sequence_name text,
  owned_table text,
  owned_column text,
  last_value bigint,
  max_value bigint,
  used_pct numeric,
  severity text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public','pg_catalog'
AS $$
DECLARE
  v_row RECORD;
  v_last bigint;
BEGIN
  IF NOT (public.is_any_org_admin(auth.uid()) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  FOR v_row IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS sequence_name,
      s.seqmax AS max_value,
      dep_c.relname AS owned_table,
      dep_a.attname AS owned_column,
      format('%I.%I', n.nspname, c.relname) AS fqn
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_sequence s ON s.seqrelid = c.oid
    LEFT JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'a'
    LEFT JOIN pg_class dep_c ON dep_c.oid = d.refobjid
    LEFT JOIN pg_attribute dep_a ON dep_a.attrelid = d.refobjid AND dep_a.attnum = d.refobjsubid
    WHERE c.relkind = 'S'
      AND n.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE format('SELECT last_value FROM %s', v_row.fqn) INTO v_last;
    EXCEPTION WHEN OTHERS THEN
      v_last := 0;
    END;

    schema_name := v_row.schema_name;
    sequence_name := v_row.sequence_name;
    owned_table := v_row.owned_table;
    owned_column := v_row.owned_column;
    last_value := v_last;
    max_value := v_row.max_value;
    used_pct := CASE WHEN v_row.max_value > 0
      THEN ROUND((v_last::numeric / v_row.max_value::numeric) * 100, 4)
      ELSE 0 END;
    severity := CASE
      WHEN used_pct >= 90 THEN 'critical'
      WHEN used_pct >= 70 THEN 'warning'
      ELSE 'ok'
    END;

    IF used_pct >= _min_pct THEN
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sequence_saturation(numeric) TO authenticated;
