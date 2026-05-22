-- Revoke EXECUTE from PUBLIC (which includes anon and authenticated) for trigger functions
REVOKE EXECUTE ON FUNCTION public.log_generic_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_creator_as_owner() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_audit_alert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_func() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_asset_update() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_os_created() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_os_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_asset_change() FROM PUBLIC;

-- Revoke from anon for other sensitive functions
REVOKE EXECUTE ON FUNCTION public.current_user_orgs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_organization_invite(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, app_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.explain_search_assets_ranked(uuid, text) FROM anon;

-- Grant execute specifically to authenticated where needed (e.g. for RLS or legitimate app features)
GRANT EXECUTE ON FUNCTION public.current_user_orgs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mfa_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, app_role[]) TO authenticated;
