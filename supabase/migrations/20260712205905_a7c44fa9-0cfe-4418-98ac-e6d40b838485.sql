
CREATE OR REPLACE FUNCTION public.run_scheduled_lock_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  SELECT public.check_lock_alerts(30000) INTO v_result;
  RAISE NOTICE 'Scheduled lock check: %', v_result;
  RETURN v_result;
END;
$$;

-- Ensure pg_cron is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule previous job if exists (idempotent)
DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'check-lock-alerts-every-minute';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

-- Schedule every minute
SELECT cron.schedule(
  'check-lock-alerts-every-minute',
  '* * * * *',
  $cron$SELECT public.run_scheduled_lock_check();$cron$
);
