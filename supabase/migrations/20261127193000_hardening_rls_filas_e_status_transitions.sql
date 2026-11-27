-- Hardening de RLS e constraints encontrados na auditoria de RLS efetiva
-- (43 tabelas public, 125 policies conferidas em 27/11/2026):
--   * os_webhook_queue e integration_queue liberavam INSERT/UPDATE/DELETE
--     para anon; as unicas policies sao SELECT para membros da org, entao a
--     escrita real ja era bloqueada pela RLS, mas o grant de anon nao deve
--     existir. REVOKE e idempotente.
--   * service_orders.status aceitava NULL: registro sem status escapava de
--     toda a maquina de status. Backfill com o status inicial 'aberta' (default atual
--     coluna) e depois NOT NULL.
--   * service_orders nao tinha nenhum CHECK para status, embora
--     STATUS_TRANSITIONS no app defina os 7 valores validos.
--
-- Nenhuma policy, funcao ou grant de leitura e alterado.

-- 1) Escrita de anon removida das filas (service_role inalterado)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.os_webhook_queue FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.integration_queue FROM anon;

-- 2) status obrigatorio em service_orders
UPDATE public.service_orders SET status = 'aberta' WHERE status IS NULL;
ALTER TABLE public.service_orders ALTER COLUMN status SET NOT NULL;

-- 3) dominio de status alinhado com src/features/service-orders (STATUS_TRANSITIONS)
ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;
ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_status_check
  CHECK (status IN ('aberta', 'aprovada', 'em_producao', 'pronta', 'entregue', 'concluida', 'cancelada'));

-- 4) Verificacao: qualquer divergencia aborta a migration
DO $chk$
DECLARE
  v_anon int;
  v_null int;
  v_cnt int;
BEGIN
  SELECT count(*) INTO v_anon
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND c.relname IN ('os_webhook_queue', 'integration_queue')
    AND has_table_privilege('anon', c.oid, 'INSERT');
  IF v_anon > 0 THEN
    RAISE EXCEPTION 'anon ainda pode escrever em % tabela(s) de fila', v_anon;
  END IF;

  SELECT count(*) INTO v_null FROM public.service_orders WHERE status IS NULL;
  IF v_null > 0 THEN
    RAISE EXCEPTION 'service_orders com status nulo: %', v_null;
  END IF;

  SELECT count(*) INTO v_cnt FROM pg_constraint
  WHERE conrelid = 'public.service_orders'::regclass AND conname = 'service_orders_status_check';
  IF v_cnt <> 1 THEN
    RAISE EXCEPTION 'constraint service_orders_status_check ausente';
  END IF;
END
$chk$;