
REVOKE ALL ON FUNCTION public.cleanup_expired_data(integer, integer, integer, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_data(integer, integer, integer, text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.run_scheduled_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_cleanup() TO service_role;

REVOKE ALL ON FUNCTION public.is_any_org_admin(uuid) FROM PUBLIC, anon;
