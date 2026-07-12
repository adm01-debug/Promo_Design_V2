
CREATE OR REPLACE FUNCTION public.check_and_consume_ai_rate_limit(
  _user_id uuid,
  _feature text,
  _limit_per_min integer DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF _user_id IS NULL OR _feature IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_args');
  END IF;

  SELECT count(*) INTO v_count
  FROM public.ai_usage_log
  WHERE user_id = _user_id
    AND feature_name = _feature
    AND created_at >= now() - interval '60 seconds';

  IF v_count >= _limit_per_min THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'count', v_count,
      'limit', _limit_per_min,
      'retry_after_seconds', 60
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'count', v_count, 'limit', _limit_per_min);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_consume_ai_rate_limit(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_consume_ai_rate_limit(uuid, text, integer) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_feature_time
  ON public.ai_usage_log (user_id, feature_name, created_at DESC);
