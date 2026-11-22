-- Cobertura de RLS auditavel em runtime.
--
-- O teste src/test/rls-coverage.test.ts chama supabase.rpc("check_rls_enabled")
-- desde antes de a funcao existir: sem ela o teste mocka a resposta e o caso
-- "should handle RPC absence gracefully" passa pelo motivo errado. Resultado:
-- nao havia como provar em producao que as tabelas de public tem RLS ativo.
--
-- SECURITY DEFINER porque pg_catalog.pg_class/pg_namespace exigem privilegio
-- que o role authenticated nao tem; o corpo so le metadata de schema, nunca
-- dados de usuario. search_path fixo impede sequestro de nome por schema.

CREATE OR REPLACE FUNCTION public.check_rls_enabled()
RETURNS TABLE (table_name text, rowsecurity boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT c.relname::text,
         c.relrowsecurity
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind = 'r'
     AND c.relname NOT LIKE 'pg_%'
   ORDER BY c.relname;
$$;

COMMENT ON FUNCTION public.check_rls_enabled() IS
  'Lista tabelas de public e se RLS esta ativo. Nao le dados de usuario.';

-- anon/authenticated/service_role existem no Supabase mas nao num Postgres
-- puro (supabase db reset em ambiente limpo). Os guards mantem a migration
-- aplicavel nos dois casos em vez de abortar no REVOKE.
DO $grant$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.check_rls_enabled() FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.check_rls_enabled() TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.check_rls_enabled() TO service_role;
  END IF;
END $grant$;

-- Sem grant para PUBLIC: a lista de tabelas e schema interno, nao dado publico.
REVOKE ALL ON FUNCTION public.check_rls_enabled() FROM PUBLIC;