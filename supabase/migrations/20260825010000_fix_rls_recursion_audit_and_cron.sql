-- =============================================================================
-- Correcoes encontradas na auditoria adversarial de 2026-08-25 (Promo Design V2)
-- Todos os bugs abaixo eram latentes no Lovable Cloud: nunca dispararam porque
-- aquele banco jamais teve um usuario. Reproduzidos e corrigidos no V2.
-- Migration idempotente: pode rodar mais de uma vez.
-- =============================================================================

-- 1) CRITICO: recursao infinita em RLS (54001 stack depth limit exceeded).
--    is_member_of/has_role/has_any_role eram SECURITY INVOKER e leem
--    organization_members, cuja policy SELECT chama is_member_of -> recursao.
--    Dispara assim que existir 1 linha em organization_members.
--    Alcance: 69 policies em 21 tabelas.
ALTER FUNCTION public.is_member_of(uuid, uuid) SECURITY DEFINER;
ALTER FUNCTION public.has_role(uuid, uuid, public.app_role) SECURITY DEFINER;
ALTER FUNCTION public.has_any_role(uuid, uuid, public.app_role[]) SECURITY DEFINER;

-- 2) anon recebia 42501 (permission denied for function) em vez de lista vazia.
--    21 policies usam role `public`, que inclui anon, e chamam is_member_of.
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, uuid, public.app_role[]) TO anon;

-- 3) CRITICO: audit_trigger_func grava auth.uid() em audit_log.user_id, que era
--    NOT NULL. Toda escrita sem sessao autenticada (service_role/edge functions,
--    pg_cron, SQL editor) em qualquer das 21 tabelas auditadas falhava com 23502.
--    user_id nulo passa a significar "acao do sistema".
ALTER TABLE public.audit_log ALTER COLUMN user_id DROP NOT NULL;

-- 4) CRITICO: maintenance_runs_source_check rejeitava 5 valores que as proprias
--    funcoes gravam -> 23514 abortava a transacao inteira do job semanal.
--      cron_per_org, cron_per_org_orphans  -> run_scheduled_cleanup_per_org
--      manual_per_org                      -> cleanup_expired_data_for_org
--      manual_analyze                      -> run_manual_analyze
--      manual_vacuum_<mode>                -> run_manual_vacuum
ALTER TABLE public.maintenance_runs DROP CONSTRAINT IF EXISTS maintenance_runs_source_check;
ALTER TABLE public.maintenance_runs ADD CONSTRAINT maintenance_runs_source_check
  CHECK (
    source = ANY (ARRAY['cron','manual','snapshot_cron','snapshot_manual',
                        'cron_per_org','cron_per_org_orphans','manual_per_org','manual_analyze'])
    OR source LIKE 'manual_vacuum_%'
  );

-- 5) capture_table_size_snapshot exige auth.role()='service_role' ou admin.
--    Sob pg_cron nao ha JWT -> auth.role() e NULL -> P0001 forbidden toda semana.
--    Injeta o contexto no comando do job, sem alterar a funcao.
DO $mig$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'capture-table-size-snapshot-weekly') THEN
    PERFORM cron.unschedule('capture-table-size-snapshot-weekly');
  END IF;
  PERFORM cron.schedule(
    'capture-table-size-snapshot-weekly',
    '30 2 * * 0',
    $cmd$SELECT set_config('request.jwt.claims','{"role":"service_role"}',true); SELECT public.capture_table_size_snapshot();$cmd$
  );
END $mig$;

-- 6) POST /organizations com Prefer: return=representation devolvia 403 42501.
--    O RETURNING e avaliado contra a policy SELECT antes do trigger AFTER
--    inserir o criador em organization_members -> linha invisivel ao proprio
--    autor. O front usa .insert().select() em OrganizationContext.tsx.
DROP POLICY IF EXISTS "Creators can view their own organizations" ON public.organizations;
CREATE POLICY "Creators can view their own organizations"
  ON public.organizations FOR SELECT
  USING (created_by = auth.uid());
