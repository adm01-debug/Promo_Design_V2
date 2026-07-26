CREATE INDEX IF NOT EXISTS idx_audit_log_remix_applied
  ON public.audit_log (organization_id, created_at DESC)
  WHERE action = 'video.remix_applied';

CREATE OR REPLACE FUNCTION public.get_remix_popularity(
  _org_id uuid,
  _days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window integer := greatest(7, least(coalesce(_days, 30), 365));
  _since timestamptz := now() - make_interval(days => _window);
  _items jsonb;
BEGIN
  IF NOT public.is_member_of(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT coalesce(jsonb_agg(t ORDER BY t.remixes DESC, t.recipe_id), '[]'::jsonb)
    INTO _items
  FROM (
    SELECT
      new_values ->> 'recipe_id' AS recipe_id,
      count(*)::int AS remixes,
      count(DISTINCT user_id)::int AS unique_users,
      max(created_at) AS last_used_at
    FROM public.audit_log
    WHERE organization_id = _org_id
      AND action = 'video.remix_applied'
      AND created_at >= _since
      AND new_values ->> 'recipe_id' IS NOT NULL
    GROUP BY 1
  ) t;

  RETURN jsonb_build_object(
    'window_days', _window,
    'items', _items
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_remix_popularity(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_remix_popularity(uuid, integer) TO authenticated;