
REVOKE EXECUTE ON FUNCTION public.run_scheduled_lock_check() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_scheduled_lock_check() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_lock_check() TO postgres, service_role;
