-- Secure helper functions for RLS
ALTER FUNCTION public.current_user_orgs() SECURITY INVOKER;
ALTER FUNCTION public.is_member_of(UUID, UUID) SECURITY INVOKER;
ALTER FUNCTION public.has_role(UUID, UUID, app_role) SECURITY INVOKER;
ALTER FUNCTION public.has_any_role(UUID, UUID, app_role[]) SECURITY INVOKER;

-- Secure AI quota checks
ALTER FUNCTION public.check_ai_quota(UUID) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.check_ai_quota(UUID, NUMERIC) SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(UUID, NUMERIC) FROM public;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(UUID, NUMERIC) TO authenticated, service_role;

-- Secure Audit functions
ALTER FUNCTION public.log_generic_change() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.log_status_change() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.log_asset_change() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.write_audit_log() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.notify_audit_alert() SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM public;
REVOKE EXECUTE ON FUNCTION public.notify_audit_alert() FROM public;
GRANT EXECUTE ON FUNCTION public.write_audit_log() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_audit_alert() TO service_role;

-- Secure Organization & Asset functions
ALTER FUNCTION public.accept_organization_invite(UUID) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.handle_asset_update() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.add_creator_as_owner() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.audit_trigger_func() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.notify_os_created() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.notify_os_status_change() SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.notify_os_created() FROM public;
REVOKE EXECUTE ON FUNCTION public.notify_os_status_change() FROM public;
GRANT EXECUTE ON FUNCTION public.notify_os_created() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_os_status_change() TO service_role;
