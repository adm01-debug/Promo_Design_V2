-- Fix search_path and revoke public execute for security helper functions
ALTER FUNCTION public.is_member_of(uuid, uuid) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, uuid, app_role) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, app_role) TO authenticated, service_role;

ALTER FUNCTION public.has_any_role(uuid, uuid, app_role[]) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, app_role[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, app_role[]) TO authenticated, service_role;

ALTER FUNCTION public.validate_org_consistency() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.validate_org_consistency() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_org_consistency() TO authenticated, service_role;

-- Fix write_audit_log which is also security definer
ALTER FUNCTION public.write_audit_log() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.write_audit_log() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_audit_log() TO authenticated, service_role;

-- Also fix add_creator_as_owner
ALTER FUNCTION public.add_creator_as_owner() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.add_creator_as_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_creator_as_owner() TO authenticated, service_role;