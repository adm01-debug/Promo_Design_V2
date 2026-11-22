-- Job 9 (slo-regression-check-hourly) falhava 100% das execucoes em producao:
--   ERROR: forbidden: service_role or admin required
--   CONTEXT: PL/pgSQL function check_slo_regressions line 11 at RAISE
-- 2158 execucoes com status=failed acumuladas desde 2026-07.
--
-- Causa: public.check_slo_regressions() guarda contra auth.role(). Sob pg_cron nao
-- existe JWT, entao auth.role() e NULL e o guard sempre dispara. O job 2
-- (check-slo-regressions-daily) nao sofre disso porque chama
-- public.run_scheduled_slo_check(), que injeta request.jwt.claim.role antes.
-- O job 9 foi criado chamando a RPC crua, sem o mesmo tratamento.
--
-- Correcao pelo mesmo caminho ja usado no job 12 (capture-table-size-snapshot):
-- injetar o contexto no comando do job, sem alterar a funcao nem afrouxar o guard.
-- Idempotente: unschedule antes de reagendar (padrao dos demais jobs do repo).

DO $mig$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job
   WHERE jobname = 'slo-regression-check-hourly';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $mig$;

SELECT cron.schedule(
  'slo-regression-check-hourly',
  '17 * * * *',
  $cmd$SELECT set_config('request.jwt.claims','{"role":"service_role"}',true); SELECT public.check_slo_regressions(60, 7, 2.0);$cmd$
);