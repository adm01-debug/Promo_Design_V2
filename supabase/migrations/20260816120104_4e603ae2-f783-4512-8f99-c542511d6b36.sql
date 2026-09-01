CREATE OR REPLACE FUNCTION public.export_public_schema()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'tables', COALESCE((
      SELECT jsonb_agg(t ORDER BY t->>'table_name')
      FROM (
        SELECT jsonb_build_object(
          'table_name', c.relname,
          'columns', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'name', a.attname,
              'type', format_type(a.atttypid, a.atttypmod),
              'not_null', a.attnotnull,
              'default', pg_get_expr(d.adbin, d.adrelid),
              'position', a.attnum
            ) ORDER BY a.attnum)
            FROM pg_attribute a
            LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
            WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
          ), '[]'::jsonb),
          'constraints', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'name', con.conname,
              'type', con.contype,
              'definition', pg_get_constraintdef(con.oid)
            ) ORDER BY con.conname)
            FROM pg_constraint con
            WHERE con.conrelid = c.oid
          ), '[]'::jsonb),
          'indexes', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'name', i.indexname,
              'definition', i.indexdef
            ) ORDER BY i.indexname)
            FROM pg_indexes i
            WHERE i.schemaname = 'public' AND i.tablename = c.relname
          ), '[]'::jsonb)
        ) AS t
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND c.relispartition = false
      ) s
    ), '[]'::jsonb),
    'enums', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', t.typname,
        'values', (
          SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
          FROM pg_enum e WHERE e.enumtypid = t.oid
        )
      ) ORDER BY t.typname)
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.export_public_schema() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_public_schema() FROM anon;
REVOKE ALL ON FUNCTION public.export_public_schema() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.export_public_schema() TO service_role;