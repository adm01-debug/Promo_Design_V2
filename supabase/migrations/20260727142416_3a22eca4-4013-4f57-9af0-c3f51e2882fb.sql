CREATE OR REPLACE FUNCTION public.get_remix_origin_timeseries(_org_id uuid, _days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _window integer := greatest(7, least(coalesce(_days, 30), 365));
  _since date := (now() - make_interval(days => _window - 1))::date;
  _points jsonb;
BEGIN
  IF NOT public.is_member_of(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT coalesce(jsonb_agg(t ORDER BY t.day), '[]'::jsonb)
    INTO _points
  FROM (
    SELECT
      d::date AS day,
      count(a.*) FILTER (WHERE coalesce(a.new_values ->> 'origin', 'feed') = 'feed')::int AS feed,
      count(a.*) FILTER (WHERE a.new_values ->> 'origin' = 'client_suggestion')::int AS client_suggestion,
      count(a.*) FILTER (WHERE a.new_values ->> 'origin' = 'deep_link')::int AS deep_link,
      count(a.*)::int AS total
    FROM generate_series(_since, current_date, interval '1 day') AS d
    LEFT JOIN public.audit_log a
      ON a.organization_id = _org_id
     AND a.action = 'video.remix_applied'
     AND a.new_values ->> 'recipe_id' IS NOT NULL
     AND a.created_at >= d
     AND a.created_at < d + interval '1 day'
    GROUP BY 1
  ) t;

  RETURN jsonb_build_object('window_days', _window, 'points', _points);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_remix_origin_timeseries(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_remix_origin_timeseries(uuid, integer) TO authenticated;