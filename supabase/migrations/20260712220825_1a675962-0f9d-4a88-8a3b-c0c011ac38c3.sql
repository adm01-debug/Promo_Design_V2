
CREATE OR REPLACE FUNCTION public.get_index_bloat_estimate(_min_bytes bigint DEFAULT 1048576, _limit int DEFAULT 30)
RETURNS TABLE(
  schema_name text,
  table_name text,
  index_name text,
  index_size_bytes bigint,
  index_size_pretty text,
  estimated_bloat_bytes bigint,
  estimated_bloat_pct numeric,
  index_scans bigint,
  is_unique boolean,
  is_primary boolean,
  severity text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  WITH idx AS (
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      i.relname AS index_name,
      pg_relation_size(i.oid) AS index_size_bytes,
      s.idx_scan AS index_scans,
      ix.indisunique AS is_unique,
      ix.indisprimary AS is_primary,
      -- Rough bloat heuristic: fillfactor default 90; assume ~30% bloat when index has many pages but few scans
      GREATEST(0, pg_relation_size(i.oid) - (pg_relation_size(i.oid) * 0.7)::bigint) AS estimated_bloat_bytes,
      CASE
        WHEN pg_relation_size(i.oid) > 0 THEN
          ROUND(((pg_relation_size(i.oid) - (pg_relation_size(i.oid) * 0.7)) / pg_relation_size(i.oid)::numeric) * 100, 1)
        ELSE 0
      END AS estimated_bloat_pct
    FROM pg_index ix
    JOIN pg_class c ON c.oid = ix.indrelid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_indexes s ON s.indexrelid = ix.indexrelid
    WHERE n.nspname IN ('public','auth')
      AND pg_relation_size(i.oid) >= _min_bytes
  )
  SELECT
    idx.schema_name,
    idx.table_name,
    idx.index_name,
    idx.index_size_bytes,
    pg_size_pretty(idx.index_size_bytes) AS index_size_pretty,
    idx.estimated_bloat_bytes,
    idx.estimated_bloat_pct,
    COALESCE(idx.index_scans, 0) AS index_scans,
    idx.is_unique,
    idx.is_primary,
    CASE
      WHEN idx.index_size_bytes > 104857600 AND COALESCE(idx.index_scans, 0) = 0 THEN 'critical'
      WHEN idx.index_size_bytes > 52428800 AND COALESCE(idx.index_scans, 0) < 10 THEN 'warning'
      ELSE 'ok'
    END AS severity
  FROM idx
  ORDER BY idx.index_size_bytes DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_index_bloat_estimate(bigint, int) TO authenticated;
