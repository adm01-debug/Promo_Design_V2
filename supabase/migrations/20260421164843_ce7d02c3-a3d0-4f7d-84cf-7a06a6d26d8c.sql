-- 1. Add OCR columns to assets
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS ocr_text text NULL;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS ocr_status text NOT NULL DEFAULT 'none';

-- 2. Trigram index for fast OCR text search
CREATE INDEX IF NOT EXISTS assets_ocr_text_trgm_idx
  ON public.assets USING gin (ocr_text gin_trgm_ops);

-- 3. Drop old function (signature/return type changes)
DROP FUNCTION IF EXISTS public.search_assets_ranked(uuid, text, uuid, asset_type[], text[], text, boolean, integer, integer);

-- 4. Recreate with OCR support
CREATE OR REPLACE FUNCTION public.search_assets_ranked(
  _org_id uuid,
  _query text,
  _client_id uuid DEFAULT NULL::uuid,
  _asset_types asset_type[] DEFAULT NULL::asset_type[],
  _tags text[] DEFAULT NULL::text[],
  _tags_mode text DEFAULT 'all'::text,
  _include_archived boolean DEFAULT false,
  _limit integer DEFAULT 24,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, organization_id uuid, client_id uuid, name text, description text,
  asset_type asset_type, file_path text, file_size bigint, mime_type text,
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
  WITH filtered AS (
    SELECT a.*,
      (similarity(a.name, _query)
        + 0.3 * similarity(coalesce(a.description, ''), _query)
        + 0.2 * similarity(coalesce(a.ocr_text, ''), _query)
      )::real AS rank,
      (
        (
          coalesce(a.ocr_text, '') ILIKE '%' || _query || '%'
          OR similarity(coalesce(a.ocr_text, ''), _query) > 0.1
        )
        AND NOT (
          a.name ILIKE '%' || _query || '%'
          OR coalesce(a.description, '') ILIKE '%' || _query || '%'
        )
      ) AS ocr_match
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
      AND (
        a.name ILIKE '%' || _query || '%'
        OR coalesce(a.description, '') ILIKE '%' || _query || '%'
        OR similarity(a.name, _query) > 0.1
        OR coalesce(a.ocr_text, '') ILIKE '%' || _query || '%'
        OR similarity(coalesce(a.ocr_text, ''), _query) > 0.1
      )
  ),
  counted AS (SELECT COUNT(*) AS c FROM filtered)
  SELECT f.id, f.organization_id, f.client_id, f.name, f.description, f.asset_type,
    f.file_path, f.file_size, f.mime_type, f.width, f.height, f.dominant_colors,
    f.thumbnail_path, f.tags, f.metadata, f.version, f.parent_asset_id,
    f.is_archived, f.created_by, f.created_at, f.updated_at, f.ocr_text, f.ocr_status,
    f.rank, f.ocr_match,
    (SELECT c FROM counted) AS total_count
  FROM filtered f
  ORDER BY f.rank DESC, f.created_at DESC
  LIMIT _limit OFFSET _offset;
$function$;