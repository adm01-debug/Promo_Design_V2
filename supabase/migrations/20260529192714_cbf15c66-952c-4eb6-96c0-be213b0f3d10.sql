-- Final hardening
ALTER FUNCTION public.explain_search_assets_ranked(UUID, TEXT) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.is_mfa_authenticated() SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.explain_search_assets_ranked(UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.explain_search_assets_ranked(UUID, TEXT) TO authenticated, service_role;
