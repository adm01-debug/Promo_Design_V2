-- Set search_path and revoke public access for security definer functions to prevent hijacking
-- We'll do this for all public schema security definer functions

ALTER FUNCTION public.current_user_orgs() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.current_user_orgs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_orgs() TO authenticated;

ALTER FUNCTION public.check_ai_quota(uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid) TO authenticated;

ALTER FUNCTION public.check_ai_quota(uuid, numeric) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid, numeric) TO authenticated;

ALTER FUNCTION public.log_generic_change() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.log_generic_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_generic_change() TO authenticated;

ALTER FUNCTION public.log_status_change() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.log_status_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_status_change() TO authenticated;

ALTER FUNCTION public.is_member_of(uuid, uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) TO authenticated;

ALTER FUNCTION public.has_any_role(uuid, uuid, app_role[]) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, app_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, app_role[]) TO authenticated;

ALTER FUNCTION public.accept_organization_invite(uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.accept_organization_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invite(uuid) TO authenticated;

ALTER FUNCTION public.write_audit_log() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_audit_log() TO authenticated;

ALTER FUNCTION public.explain_search_assets_ranked(uuid, text) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.explain_search_assets_ranked(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.explain_search_assets_ranked(uuid, text) TO authenticated;

ALTER FUNCTION public.has_role(uuid, uuid, app_role) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, app_role) TO authenticated;

ALTER FUNCTION public.add_creator_as_owner() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.add_creator_as_owner() FROM PUBLIC;

ALTER FUNCTION public.notify_audit_alert() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.notify_audit_alert() FROM PUBLIC;

ALTER FUNCTION public.audit_trigger_func() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_func() FROM PUBLIC;

ALTER FUNCTION public.notify_os_created() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.notify_os_created() FROM PUBLIC;

ALTER FUNCTION public.handle_asset_update() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_asset_update() FROM PUBLIC;

ALTER FUNCTION public.notify_os_status_change() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.notify_os_status_change() FROM PUBLIC;

ALTER FUNCTION public.is_mfa_authenticated() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_mfa_authenticated() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_mfa_authenticated() TO authenticated;

ALTER FUNCTION public.log_asset_change() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.log_asset_change() FROM PUBLIC;

-- Performance: Add missing indexes for foreign keys and common filters
CREATE INDEX IF NOT EXISTS idx_service_orders_client_name ON public.service_orders(client_name);
CREATE INDEX IF NOT EXISTS idx_service_orders_os_number ON public.service_orders(os_number);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON public.service_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_client_id ON public.assets(client_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
