-- Fix search_path for functions missing it
ALTER FUNCTION public.handle_optimistic_locking() SET search_path = public;
ALTER FUNCTION public.handle_asset_update() SET search_path = public;
ALTER FUNCTION public.increment_lock_version_column() SET search_path = public;
ALTER FUNCTION public.log_asset_change() SET search_path = public;

-- Revoke execute from public/anon for sensitive security definer functions if they were accidentally exposed
-- Note: These are usually called by triggers or service role, so limiting access is safer.
REVOKE EXECUTE ON FUNCTION public.log_asset_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_asset_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_optimistic_locking() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_lock_version_column() FROM PUBLIC;
