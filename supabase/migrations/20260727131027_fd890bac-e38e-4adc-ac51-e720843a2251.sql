CREATE OR REPLACE FUNCTION public.get_remix_popularity(_org_id uuid, _days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _window integer := greatest(7, least(coalesce(_days, 30), 365));
  _since timestamptz := now() - make_interval(days => _window);
  _items jsonb;
  _by_origin jsonb;
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
      max(created_at) AS last_used_at,
      count(*) FILTER (WHERE coalesce(new_values ->> 'origin', 'feed') = 'feed')::int AS feed_remixes,
      count(*) FILTER (WHERE new_values ->> 'origin' = 'client_suggestion')::int AS client_suggestion_remixes,
      count(*) FILTER (WHERE new_values ->> 'origin' = 'deep_link')::int AS deep_link_remixes
    FROM public.audit_log
    WHERE organization_id = _org_id
      AND action = 'video.remix_applied'
      AND created_at >= _since
      AND new_values ->> 'recipe_id' IS NOT NULL
    GROUP BY 1
  ) t;

  SELECT jsonb_build_object(
    'feed', count(*) FILTER (WHERE coalesce(new_values ->> 'origin', 'feed') = 'feed')::int,
    'client_suggestion', count(*) FILTER (WHERE new_values ->> 'origin' = 'client_suggestion')::int,
    'deep_link', count(*) FILTER (WHERE new_values ->> 'origin' = 'deep_link')::int
  )
    INTO _by_origin
  FROM public.audit_log
  WHERE organization_id = _org_id
    AND action = 'video.remix_applied'
    AND created_at >= _since
    AND new_values ->> 'recipe_id' IS NOT NULL;

  RETURN jsonb_build_object(
    'window_days', _window,
    'items', _items,
    'by_origin', coalesce(_by_origin, jsonb_build_object('feed', 0, 'client_suggestion', 0, 'deep_link', 0))
  );
END;
$function$;