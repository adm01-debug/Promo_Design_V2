CREATE OR REPLACE FUNCTION public.run_scheduled_slo_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  SELECT public.check_slo_regressions(60, 7, 2.0) INTO v_result;
  RAISE NOTICE 'Scheduled SLO check: %', v_result;
  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_scheduled_slo_check() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_scheduled_slo_check() TO postgres, service_role;

-- Unschedule prior job if exists
DO $$
DECLARE v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'check-slo-regressions-daily';
  IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;
END $$;

SELECT cron.schedule(
  'check-slo-regressions-daily',
  '17 3 * * *', -- Todos os dias 03:17 UTC
  $$ SELECT public.run_scheduled_slo_check(); $$
);