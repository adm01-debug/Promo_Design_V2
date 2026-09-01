
-- Deprecate legacy check_ai_quota(uuid) → delegate to check_ai_quota(uuid, numeric)
DROP FUNCTION IF EXISTS public.check_ai_quota(uuid);

CREATE OR REPLACE FUNCTION public.check_ai_quota(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.check_ai_quota(_org_id, 0::numeric);
$$;

REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid) TO authenticated, service_role;

-- Deprecate legacy cleanup_expired_data(int,int,int) → delegate to full signature
DROP FUNCTION IF EXISTS public.cleanup_expired_data(integer, integer, integer);

CREATE OR REPLACE FUNCTION public.cleanup_expired_data(
  _audit_retention_days integer DEFAULT 180,
  _notifications_read_retention_days integer DEFAULT 90,
  _status_audit_retention_days integer DEFAULT 365
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.cleanup_expired_data(
    _audit_retention_days,
    _notifications_read_retention_days,
    _status_audit_retention_days,
    'manual'::text,
    NULL::uuid
  );
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_data(integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data(integer, integer, integer) TO service_role;
