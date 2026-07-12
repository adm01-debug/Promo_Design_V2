
DO $$
DECLARE r RECORD; sig text;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
      AND (has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('public', p.oid, 'EXECUTE'))
  LOOP
    sig := format('public.%I(%s)', r.proname, r.args);
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || sig || ' FROM PUBLIC, anon';
  END LOOP;
END $$;
