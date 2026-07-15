-- ADR-0009 follow-up: revogar EXECUTE de `authenticated` em SECDEFs que
-- não precisam ser chamadas pelo cliente. `is_any_org_admin` só é usada
-- por outras funções SECDEF (rodam como owner). `check_ai_quota` (ambas as
-- assinaturas) agora é invocada apenas via edge function com service_role.
-- `accept_organization_invite` continua acessível a `authenticated` (é a
-- única SECDEF legítima chamada diretamente pelo cliente).

REVOKE EXECUTE ON FUNCTION public.is_any_org_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_any_org_admin(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_ai_quota(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_quota(uuid, numeric) TO service_role;