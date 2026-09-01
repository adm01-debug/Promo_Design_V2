
CREATE OR REPLACE FUNCTION public.check_slo_regressions(
  _baseline_days integer DEFAULT 60,
  _recent_days integer DEFAULT 7,
  _threshold numeric DEFAULT 2.0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_alerts_created integer := 0;
  v_admin RECORD;
  v_source_label text;
  v_msg text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role'
    AND NOT public.is_any_org_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: service_role or admin required';
  END IF;

  FOR v_row IN
    WITH base AS (
      SELECT source, duration_ms, created_at
      FROM public.maintenance_runs
      WHERE status = 'success'
        AND duration_ms IS NOT NULL
        AND created_at >= now() - make_interval(days => _baseline_days)
    ),
    baseline AS (
      SELECT source,
        percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
        count(*) AS n
      FROM base
      GROUP BY source
      HAVING count(*) >= 5
    ),
    recent AS (
      SELECT source,
        percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
        count(*) AS n
      FROM base
      WHERE created_at >= now() - make_interval(days => _recent_days)
      GROUP BY source
      HAVING count(*) >= 3
    )
    SELECT b.source,
           b.p95 AS baseline_p95,
           r.p95 AS recent_p95,
           (r.p95::numeric / NULLIF(b.p95, 0)) AS ratio
    FROM baseline b
    JOIN recent r USING (source)
    WHERE b.p95 > 0
      AND (r.p95::numeric / b.p95) >= _threshold
  LOOP
    -- Dedupe: skip if the same source already alerted in last 24h
    IF EXISTS (
      SELECT 1 FROM public.notifications
      WHERE event_type = 'slo_regression'
        AND new_status = v_row.source
        AND created_at >= now() - interval '24 hours'
    ) THEN
      CONTINUE;
    END IF;

    v_source_label := v_row.source;
    v_msg := format('p95 recente %sms vs baseline %sms (%.2fx)',
      v_row.recent_p95, v_row.baseline_p95, v_row.ratio);

    FOR v_admin IN
      SELECT DISTINCT user_id
      FROM public.organization_members
      WHERE role IN ('owner', 'admin')
    LOOP
      INSERT INTO public.notifications (
        user_id, os_id, os_number, product_name,
        old_status, new_status, event_type
      ) VALUES (
        v_admin.user_id,
        NULL,
        'SLO-' || left(md5(v_source_label || now()::text), 6),
        'Regressão de latência: ' || v_source_label,
        v_row.baseline_p95::text || 'ms',
        v_source_label,
        'slo_regression'
      );
      v_alerts_created := v_alerts_created + 1;
    END LOOP;

    RAISE NOTICE 'SLO regression alerted: source=% ratio=% msg=%',
      v_source_label, v_row.ratio, v_msg;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'alerts_created', v_alerts_created,
    'checked_at', now(),
    'threshold', _threshold
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_slo_regressions(integer, integer, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_slo_regressions(integer, integer, numeric) TO authenticated, service_role;
