-- Retencao de dados (LGPD/limpeza) nunca rodava: public.run_scheduled_cleanup_per_org()
-- existia desde 20260712194748 mas nao tinha nenhum cron.schedule, e a edge function
-- cleanup-expired-data tambem nao tinha chamador. Resultado: audit_log, notifications e
-- status_audit cresciam indefinidamente em producao.
-- Idempotente: unschedule antes de reagendar (padrao dos demais jobs do repo).

DO $mig$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job
   WHERE jobname = 'cleanup-expired-data-daily';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $mig$;

SELECT cron.schedule(
  'cleanup-expired-data-daily',
  '15 3 * * *',
  $$SELECT public.run_scheduled_cleanup_per_org();$$
);