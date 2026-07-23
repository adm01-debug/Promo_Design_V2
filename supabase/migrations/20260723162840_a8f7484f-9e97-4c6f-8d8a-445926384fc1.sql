
CREATE OR REPLACE FUNCTION public.get_brand_recommendation_stats(_org_id UUID, _days INT DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
  _since TIMESTAMPTZ := now() - (_days || ' days')::interval;
BEGIN
  IF NOT public.user_belongs_to_org(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  WITH events AS (
    SELECT
      created_at,
      user_id,
      new_values,
      COALESCE((new_values->>'confidence')::numeric, 0) AS confidence,
      COALESCE((new_values->>'sampleSize')::int, 0) AS sample_size,
      new_values->>'source' AS source,
      new_values->>'client_id' AS client_id
    FROM public.audit_log
    WHERE organization_id = _org_id
      AND action = 'brand.recommendation_applied'
      AND created_at >= _since
  ),
  totals AS (
    SELECT
      count(*)::int AS total_applied,
      count(DISTINCT client_id) FILTER (WHERE client_id IS NOT NULL)::int AS unique_clients,
      count(DISTINCT user_id)::int AS unique_users,
      COALESCE(round(avg(confidence)::numeric, 3), 0) AS avg_confidence,
      COALESCE(round(avg(sample_size)::numeric, 1), 0) AS avg_sample_size
    FROM events
  ),
  by_source AS (
    SELECT source, count(*)::int AS n
    FROM events
    WHERE source IS NOT NULL
    GROUP BY source
  ),
  recent AS (
    SELECT jsonb_agg(row_to_json(r) ORDER BY r.created_at DESC) AS items
    FROM (
      SELECT created_at, source, client_id, confidence, sample_size
      FROM events
      ORDER BY created_at DESC
      LIMIT 10
    ) r
  )
  SELECT jsonb_build_object(
    'window_days', _days,
    'totals', (SELECT row_to_json(t) FROM totals t),
    'by_source', COALESCE((SELECT jsonb_object_agg(source, n) FROM by_source), '{}'::jsonb),
    'recent', COALESCE((SELECT items FROM recent), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_brand_recommendation_stats(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_brand_recommendation_stats(UUID, INT) TO authenticated;
