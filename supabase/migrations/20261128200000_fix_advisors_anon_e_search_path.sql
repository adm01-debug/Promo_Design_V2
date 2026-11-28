-- Fecha 4 advisors WARN do Supabase (35 -> 31):
--   * 3x anon_security_definer_function_executable: has_role, has_any_role e
--     is_member_of sao SECURITY DEFINER e estavam executaveis por `anon` via
--     /rest/v1/rpc. Sao chamadas por 88 policies de RLS, que executam como
--     `authenticated`, entao revogar de anon nao afeta nenhuma policy.
--   * 1x function_search_path_mutable: webhook_retry_delay e SQL puro
--     (CASE sobre intervalos), sem referencia a tabela; fixa o search_path.
-- Medido em producao antes/depois; dados preservados (service_orders 20,
-- clients 8, catalog_products 36, organizations 1).

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, public.app_role[]) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) TO authenticated;

ALTER FUNCTION public.webhook_retry_delay(integer) SET search_path = pg_catalog, public;
