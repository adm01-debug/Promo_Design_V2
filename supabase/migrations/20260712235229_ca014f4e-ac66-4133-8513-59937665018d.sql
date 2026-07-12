DO $$
DECLARE
  part RECORD;
BEGIN
  FOR part IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      AND c.relname LIKE 'audit_log_%'
      AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false)',
      'deny_direct_partition_access',
      part.relname
    );
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_index_bloat_estimate(bigint, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_long_running_txns(integer)             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_sequence_saturation(numeric)           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.terminate_backend(integer, text)           FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.explain_search_assets_ranked(uuid, text)   FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_index_bloat_estimate(bigint, integer)   TO service_role;
GRANT EXECUTE ON FUNCTION public.get_long_running_txns(integer)              TO service_role;
GRANT EXECUTE ON FUNCTION public.get_sequence_saturation(numeric)            TO service_role;
GRANT EXECUTE ON FUNCTION public.terminate_backend(integer, text)            TO service_role;
GRANT EXECUTE ON FUNCTION public.explain_search_assets_ranked(uuid, text)    TO service_role;