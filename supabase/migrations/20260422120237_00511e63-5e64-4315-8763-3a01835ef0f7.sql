CREATE OR REPLACE FUNCTION public.search_assets_ranked(
  _org_id uuid,
  _query text,
  _client_id uuid DEFAULT NULL::uuid,
  _asset_types public.asset_type[] DEFAULT NULL::public.asset_type[],
  _tags text[] DEFAULT NULL::text[],
  _tags_mode text DEFAULT 'all'::text,
  _include_archived boolean DEFAULT false,
  _limit integer DEFAULT 24,
  _offset integer DEFAULT 0,
  _min_size bigint DEFAULT NULL,
  _max_size bigint DEFAULT NULL
)
RETURNS TABLE(
  id uuid, organization_id uuid, client_id uuid, name text, description text,
  asset_type public.asset_type, file_path text, file_size bigint, mime_type text,
  width integer, height integer, dominant_colors text[], thumbnail_path text,
  tags text[], metadata jsonb, version integer, parent_asset_id uuid,
  is_archived boolean, created_by uuid, created_at timestamp with time zone,
  updated_at timestamp with time zone, ocr_text text, ocr_status text,
  rank real, ocr_match boolean, total_count bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH q AS (
    SELECT NULLIF(btrim(_query), '') AS term
  ),
  filtered AS (
    SELECT a.*,
      CASE
        WHEN (SELECT term FROM q) IS NULL THEN 0::real
        ELSE (
          similarity(a.name, (SELECT term FROM q))
          + 0.3 * similarity(coalesce(a.description, ''), (SELECT term FROM q))
          + 0.2 * similarity(coalesce(a.ocr_text, ''), (SELECT term FROM q))
        )::real
      END AS rank,
      CASE
        WHEN (SELECT term FROM q) IS NULL THEN false
        ELSE (
          (
            coalesce(a.ocr_text, '') % (SELECT term FROM q)
            OR coalesce(a.ocr_text, '') ILIKE '%' || (SELECT term FROM q) || '%'
          )
          AND NOT (
            a.name % (SELECT term FROM q)
            OR a.name ILIKE '%' || (SELECT term FROM q) || '%'
            OR coalesce(a.description, '') ILIKE '%' || (SELECT term FROM q) || '%'
          )
        )
      END AS ocr_match
    FROM public.assets a
    WHERE a.organization_id = _org_id
      AND is_member_of(auth.uid(), a.organization_id)
      AND (_include_archived OR a.is_archived = false)
      AND (_client_id IS NULL OR a.client_id = _client_id)
      AND (_asset_types IS NULL OR a.asset_type = ANY(_asset_types))
      AND (_min_size IS NULL OR a.file_size >= _min_size)
      AND (_max_size IS NULL OR a.file_size <= _max_size)
      AND (
        _tags IS NULL
        OR array_length(_tags, 1) IS NULL
        OR (_tags_mode = 'all' AND a.tags @> _tags)
        OR (_tags_mode = 'any' AND a.tags && _tags)
      )
      AND (
        (SELECT term FROM q) IS NULL
        OR a.name % (SELECT term FROM q)
        OR coalesce(a.description, '') % (SELECT term FROM q)
        OR coalesce(a.ocr_text, '') % (SELECT term FROM q)
        OR a.name ILIKE '%' || (SELECT term FROM q) || '%'
      )
  ),
  counted AS (SELECT COUNT(*) AS c FROM filtered)
  SELECT
    f.id, f.organization_id, f.client_id, f.name, f.description, f.asset_type,
    f.file_path, f.file_size, f.mime_type, f.width, f.height, f.dominant_colors,
    f.thumbnail_path, f.tags, f.metadata, f.version, f.parent_asset_id,
    f.is_archived, f.created_by, f.created_at, f.updated_at, f.ocr_text, f.ocr_status,
    f.rank, f.ocr_match,
    (SELECT c FROM counted) AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN (SELECT term FROM q) IS NULL THEN 0::real ELSE f.rank END DESC,
    f.created_at DESC
  LIMIT _limit OFFSET _offset;
$function$;