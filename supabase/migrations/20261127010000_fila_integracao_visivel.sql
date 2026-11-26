-- A integration_queue e a fila multi-destino do Promo Design
-- (Champions / Fast Gravacoes / Supply), alimentada por tg_os_integration_enqueue
-- e tg_design_integration_enqueue e drenada pela edge integration-dispatcher.
-- Nasceu trancada (RLS + REVOKE de anon/authenticated) porque so o service_role
-- a usa para entregar. Efeito colateral: quando um destino esta sem credencial
-- (self-disable por destino) ou a entrega falha, o evento fica 'pending'/'dead'
-- para sempre e NINGUEM enxerga - mesmo problema que a os_webhook_queue tinha
-- antes da migration 20261126230000. Esta migration libera a leitura para o
-- dono do registro ou membros da organizacao dele e cria a RPC de
-- reprocessamento manual. O mapa de tecnicas (integration_technique_map) ganha
-- leitura autenticada para diagnostico de "tecnica nao mapeada".

-- 1) Fila: leitura pelo dono do registro (OS ou design) ou membro da org dele.
--    Sem o GRANT a policy nem e avaliada (42501 permission denied).
DROP POLICY IF EXISTS "Org members can view integration queue" ON public.integration_queue;
GRANT SELECT ON public.integration_queue TO authenticated;
CREATE POLICY "Org members can view integration queue"
  ON public.integration_queue
  FOR SELECT
  TO authenticated
  USING (
    (
      entity = 'service_order'
      AND EXISTS (
        SELECT 1
          FROM public.service_orders so
         WHERE so.id = integration_queue.entity_id
           AND (
             so.user_id = auth.uid()
             OR (
               so.organization_id IS NOT NULL
               AND public.is_member_of(auth.uid(), so.organization_id)
             )
           )
      )
    )
    OR (
      entity = 'design'
      AND EXISTS (
        SELECT 1
          FROM public.mockup_drafts d
         WHERE d.id = integration_queue.entity_id
           AND (
             d.user_id = auth.uid()
             OR (
               d.organization_id IS NOT NULL
               AND public.is_member_of(auth.uid(), d.organization_id)
             )
           )
      )
    )
  );

-- 2) Mapa de tecnicas: configuracao global de integracao (nao e dado de
--    cliente). Leitura autenticada para o time diagnosticar por que um job nao
--    nasceu no Fast Gravacoes (fg_technique_id NULL na fila).
DROP POLICY IF EXISTS "Authenticated can view integration technique map"
  ON public.integration_technique_map;
GRANT SELECT ON public.integration_technique_map TO authenticated;
CREATE POLICY "Authenticated can view integration technique map"
  ON public.integration_technique_map
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 3) Reprocessamento manual de um evento da fila multi-destino. Mesmas regras
--    da requeue_os_webhook: nunca aceita evento ja entregue (evita entrega
--    duplicada no sistema do cliente) e valida a permissao no banco.
CREATE OR REPLACE FUNCTION public.requeue_integration_event(_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entity text;
  v_entity_id uuid;
  v_status text;
  v_destination text;
BEGIN
  SELECT q.entity, q.entity_id, q.status, q.destination
    INTO v_entity, v_entity_id, v_status, v_destination
    FROM public.integration_queue q
   WHERE q.event_id = _event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERR_EVENT_NOT_FOUND';
  END IF;

  IF NOT (
    (
      v_entity = 'service_order'
      AND EXISTS (
        SELECT 1
          FROM public.service_orders so
         WHERE so.id = v_entity_id
           AND (
             so.user_id = auth.uid()
             OR (
               so.organization_id IS NOT NULL
               AND public.is_member_of(auth.uid(), so.organization_id)
             )
           )
      )
    )
    OR (
      v_entity = 'design'
      AND EXISTS (
        SELECT 1
          FROM public.mockup_drafts d
         WHERE d.id = v_entity_id
           AND (
             d.user_id = auth.uid()
             OR (
               d.organization_id IS NOT NULL
               AND public.is_member_of(auth.uid(), d.organization_id)
             )
           )
      )
    )
  ) THEN
    RAISE EXCEPTION 'ERR_NOT_MEMBER';
  END IF;

  IF v_status = 'delivered' THEN
    RAISE EXCEPTION 'ERR_ALREADY_DELIVERED';
  END IF;

  UPDATE public.integration_queue
     SET status = 'pending',
         attempts = 0,
         next_attempt_at = now(),
         last_error = NULL,
         delivered_at = NULL
   WHERE event_id = _event_id;

  RETURN jsonb_build_object(
    'ok', true,
    'event_id', _event_id,
    'status', 'pending',
    'destination', v_destination
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.requeue_integration_event(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.requeue_integration_event(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.requeue_integration_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.requeue_integration_event(uuid) TO service_role;
