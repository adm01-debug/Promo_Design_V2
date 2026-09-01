CREATE OR REPLACE FUNCTION public.get_live_activity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_activity jsonb;
  v_locks jsonb;
  v_states jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: requires owner or admin role';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.duration_ms DESC NULLS LAST), '[]'::jsonb) INTO v_activity
  FROM (
    SELECT
      pid,
      usename AS user_name,
      application_name,
      client_addr::text AS client_addr,
      state,
      wait_event_type,
      wait_event,
      EXTRACT(MILLISECOND FROM (now() - COALESCE(xact_start, query_start)))::bigint AS duration_ms,
      xact_start,
      query_start,
      left(regexp_replace(query, '\s+', ' ', 'g'), 300) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND pid <> pg_backend_pid()
      AND state IS NOT NULL
      AND state <> 'idle'
    ORDER BY (now() - COALESCE(xact_start, query_start)) DESC NULLS LAST
    LIMIT 25
  ) a;

  SELECT COALESCE(jsonb_agg(row_to_json(l)), '[]'::jsonb) INTO v_locks
  FROM (
    SELECT
      blocked.pid AS blocked_pid,
      blocked.usename AS blocked_user,
      left(regexp_replace(blocked.query, '\s+', ' ', 'g'), 200) AS blocked_query,
      blocking.pid AS blocking_pid,
      blocking.usename AS blocking_user,
      left(regexp_replace(blocking.query, '\s+', ' ', 'g'), 200) AS blocking_query,
      EXTRACT(MILLISECOND FROM (now() - blocked.query_start))::bigint AS blocked_ms
    FROM pg_stat_activity blocked
    JOIN pg_stat_activity blocking
      ON blocking.pid = ANY (pg_blocking_pids(blocked.pid))
    WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0
    LIMIT 20
  ) l;

  SELECT jsonb_object_agg(state, cnt) INTO v_states
  FROM (
    SELECT COALESCE(state, 'unknown') AS state, count(*)::int AS cnt
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY state
  ) s;

  RETURN jsonb_build_object(
    'activity', v_activity,
    'locks', v_locks,
    'connections_by_state', COALESCE(v_states, '{}'::jsonb),
    'captured_at', now()
  );
END;
$function$;