-- Revoke execute from public on security definer functions
REVOKE EXECUTE ON FUNCTION public.log_generic_change() FROM public;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.log_status_change() FROM public;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_asset_update() FROM public;
REVOKE EXECUTE ON FUNCTION public.add_creator_as_owner() FROM public;
REVOKE EXECUTE ON FUNCTION public.notify_os_created() FROM public;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_func() FROM public;
REVOKE EXECUTE ON FUNCTION public.notify_os_status_change() FROM public;
REVOKE EXECUTE ON FUNCTION public.notify_audit_alert() FROM public;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, numeric) FROM public;
REVOKE EXECUTE ON FUNCTION public.explain_search_assets_ranked(uuid, text) FROM public;
REVOKE EXECUTE ON FUNCTION public.accept_organization_invite(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.log_asset_change() FROM public;

-- Grant execute to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.log_generic_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_status_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.write_audit_log() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_asset_update() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_creator_as_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_os_created() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_trigger_func() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_os_status_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_audit_alert() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.explain_search_assets_ranked(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_organization_invite(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_asset_change() TO authenticated, service_role;
