
DO $$
DECLARE r RECORD; sig text;
  keep text[] := ARRAY[
    'accept_organization_invite',
    'check_ai_quota',
    'is_any_org_admin',
    'is_member_of',
    'has_role',
    'has_any_role',
    'current_user_orgs',
    'search_assets_ranked',
    'get_index_bloat_estimate',
    'get_sequence_saturation',
    'get_long_running_txns',
    'terminate_backend',
    'explain_search_assets_ranked'
  ];
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
      AND NOT (p.proname = ANY(keep))
  LOOP
    sig := format('public.%I(%s)', r.proname, r.args);
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || sig || ' FROM authenticated';
  END LOOP;
END $$;
