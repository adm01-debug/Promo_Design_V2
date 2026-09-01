-- Revoke execute from public for remaining sensitive functions
REVOKE EXECUTE ON FUNCTION public.add_creator_as_owner() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_orgs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.explain_search_assets_ranked(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_audit_alert() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_os_created() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_os_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_assets_ranked(uuid, text, uuid, asset_type[], text[], text, boolean, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_assets_ranked(uuid, text, uuid, asset_type[], text[], text, boolean, integer, integer, bigint, bigint) FROM PUBLIC;

-- Grant execute to authenticated users for necessary functions
GRANT EXECUTE ON FUNCTION public.current_user_orgs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_assets_ranked(uuid, text, uuid, asset_type[], text[], text, boolean, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_assets_ranked(uuid, text, uuid, asset_type[], text[], text, boolean, integer, integer, bigint, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.explain_search_assets_ranked(uuid, text) TO authenticated;
