-- Revoke execute from public for RLS helpers and trigger functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, app_role[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_service_order() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_status_change() FROM PUBLIC;

-- Grant execute to authenticated users for RLS helpers
GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) TO authenticated;
