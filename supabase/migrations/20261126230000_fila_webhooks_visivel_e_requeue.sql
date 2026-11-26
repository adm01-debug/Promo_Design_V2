-- A fila de webhooks do ERP (os_webhook_queue) e alimentada pela trigger
-- tg_os_webhook_enqueue e drenada pelo cron os-webhook-dispatcher-every-minute
-- (dequeue_os_webhooks). A tabela nasceu trancada (RLS ligado, nenhuma policy)
-- porque so o service_role precisa dela para entregar. Efeito colateral: quando
-- a entrega falha ou a integracao esta desligada NINGUEM enxerga. Em 2026-11-23
-- quatro eventos os.updated ficaram 'pending' para sempre sem nenhum aviso,
-- porque a edge os-webhook-dispatcher roda em modo self-disable enquanto
-- ERP_WEBHOOK_URL/ERP_WEBHOOK_SECRET nao existirem. Esta migration libera a
-- leitura para o time (dono da OS ou membro da organizacao dela, mesmo criterio
-- da migration 20261126211000) e cria a RPC de reprocessamento manual.

-- 1) Leitura da fila pelo dono da OS e pelos membros da organizacao dela.
--    A tabela nasceu com REVOKE de anon/authenticated (so service_role): sem o
--    GRANT abaixo a policy nem chega a ser avaliada (permission denied 42501).
DROP POLICY IF EXISTS "Org members can view os webhook queue" ON public.os_webhook_queue;
GRANT SELECT ON public.os_webhook_queue TO authenticated;
CREATE POLICY "Org members can view os webhook queue"
  ON public.os_webhook_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.service_orders so
       WHERE so.id = os_webhook_queue.os_id
         AND (
           so.user_id = auth.uid()
           OR (
             so.organization_id IS NOT NULL
             AND public.is_member_of(auth.uid(), so.organization_id)
           )
         )
    )
  );

-- 2) Reprocessamento manual: o operador ve o evento preso e manda tentar de
--    novo, sem depender de suporte. Zera tentativas e backoff para o proximo
--    ciclo do dispatcher pegar o evento. Nunca aceita evento ja entregue, para
--    nao gerar entrega duplicada no ERP do cliente.
CREATE OR REPLACE FUNCTION public.requeue_os_webhook(_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_os_id uuid;
  v_status text;
BEGIN
  SELECT q.os_id, q.status INTO v_os_id, v_status
    FROM public.os_webhook_queue q
   WHERE q.event_id = _event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_EVENT_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.service_orders so
     WHERE so.id = v_os_id
       AND (
         so.user_id = auth.uid()
         OR (
           so.organization_id IS NOT NULL
           AND public.is_member_of(auth.uid(), so.organization_id)
         )
       )
  ) THEN
    RAISE EXCEPTION 'ERR_NOT_MEMBER';
  END IF;

  IF v_status = 'delivered' THEN
    RAISE EXCEPTION 'ERR_ALREADY_DELIVERED';
  END IF;

  UPDATE public.os_webhook_queue
     SET status = 'pending',
         attempts = 0,
         next_attempt_at = now(),
         last_error = NULL
   WHERE event_id = _event_id;

  RETURN jsonb_build_object('ok', true, 'event_id', _event_id, 'status', 'pending');
END;
$function$;

REVOKE ALL ON FUNCTION public.requeue_os_webhook(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.requeue_os_webhook(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.requeue_os_webhook(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.requeue_os_webhook(uuid) TO service_role;