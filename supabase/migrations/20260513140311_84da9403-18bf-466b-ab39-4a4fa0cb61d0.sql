-- Revoke public execution from security definer functions
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(UUID, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(UUID, NUMERIC) FROM anon;

-- Explicitly allow authenticated users if needed (it's called from Edge Functions usually via service role, so we don't strictly need public access)
GRANT EXECUTE ON FUNCTION public.check_ai_quota(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(UUID, NUMERIC) TO service_role;
