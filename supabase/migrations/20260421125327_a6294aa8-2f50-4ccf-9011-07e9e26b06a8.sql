CREATE OR REPLACE FUNCTION public.search_assets_ranked(
  _org_id uuid,
  _query text,
  _client_id uuid DEFAULT NULL,
  _asset_types asset_type[] DEFAULT NULL,
  _tags text[] DEFAULT NULL,
  _tags_mode text DEFAULT 'all',
  _include_archived boolean DEFAULT false,
  _limit integer DEFAULT 24,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  client_id uuid,
  name text,
  description text,
  asset_type asset_type,
  file_path text,
  file_size bigint,
  mime_type text,
  width integer,
  height integer,
  dominant_colors text[],
  thumbnail_path text,
  tags text[],
  metadata jsonb,
  version integer,
  parent_asset_id uuid,
  is_archived boolean,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  rank real,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT a.*,
      (similarity(a.name, _query) + 0.3 * similarity(coalesce(a.description, ''), _query))::real AS rank
    FROM public.assets a
    WHERE a.organization_id = _org_id
      AND is_member_of(auth.uid(), a.organization_id)
      AND (_include_archived OR a.is_archived = false)
      AND (_client_id IS NULL OR a.client_id = _client_id)
      AND (_asset_types IS NULL OR a.asset_type = ANY(_asset_types))
      AND (
        _tags IS NULL
        OR array_length(_tags, 1) IS NULL
        OR (_tags_mode = 'all' AND a.tags @> _tags)
        OR (_tags_mode = 'any' AND a.tags && _tags)
      )
      AND (a.name ILIKE '%' || _query || '%' OR coalesce(a.description, '') ILIKE '%' || _query || '%' OR similarity(a.name, _query) > 0.1)
  ),
  counted AS (SELECT COUNT(*) AS c FROM filtered)
  SELECT f.id, f.organization_id, f.client_id, f.name, f.description, f.asset_type,
    f.file_path, f.file_size, f.mime_type, f.width, f.height, f.dominant_colors,
    f.thumbnail_path, f.tags, f.metadata, f.version, f.parent_asset_id,
    f.is_archived, f.created_by, f.created_at, f.updated_at, f.rank,
    (SELECT c FROM counted) AS total_count
  FROM filtered f
  ORDER BY f.rank DESC, f.created_at DESC
  LIMIT _limit OFFSET _offset;
$$;