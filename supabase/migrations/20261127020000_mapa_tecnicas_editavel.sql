-- O integration_technique_map decide, na criacao da OS, se o job nasce no Fast
-- Gravacoes: integration_fg_technique() procura a tecnica normalizada da OS
-- nesta tabela e grava o fg_technique_id no payload da fila. Ate aqui a tabela
-- so tinha SELECT (migration 20261127010000): mapear uma tecnica nova exigia
-- SQL na mao, e tecnica fora do mapa gerava fg_technique_id NULL em silencio -
-- o evento aparece como "Tecnica nao mapeada" no painel, mas nao havia como
-- corrigir pela tela.
--
-- Esta migration libera a manutencao (criar, editar, excluir) para owner/admin
-- da organizacao, garante que a chave gravada sai sempre normalizada (a busca do
-- job compara integration_norm_technique(texto da OS) com promo_technique) e
-- mantem updated_at coerente.

-- 1) Quem mantem o mapa: owner ou admin de alguma organizacao. Helper isolado
--    (SECURITY DEFINER) para que a regra fique em um unico lugar - hoje existe
--    uma organizacao no sistema, mas o mapa e global; se virar multi-tenant,
--    so este predicado muda.
CREATE OR REPLACE FUNCTION public.integration_map_can_manage()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.organization_members m
     WHERE m.user_id = auth.uid()
       AND m.role IN ('owner', 'admin')
  );
$function$;

REVOKE ALL ON FUNCTION public.integration_map_can_manage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.integration_map_can_manage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.integration_map_can_manage() TO service_role;

COMMENT ON FUNCTION public.integration_map_can_manage() IS
  'Owner/admin de organizacao: pode manter o mapa de tecnicas do Fast Gravacoes.';

-- 2) Escrita para o owner/admin. Sem o GRANT a policy nem e avaliada.
GRANT INSERT, UPDATE, DELETE ON public.integration_technique_map TO authenticated;

DROP POLICY IF EXISTS "Admins can insert integration technique map"
  ON public.integration_technique_map;
CREATE POLICY "Admins can insert integration technique map"
  ON public.integration_technique_map
  FOR INSERT
  TO authenticated
  WITH CHECK (public.integration_map_can_manage());

DROP POLICY IF EXISTS "Admins can update integration technique map"
  ON public.integration_technique_map;
CREATE POLICY "Admins can update integration technique map"
  ON public.integration_technique_map
  FOR UPDATE
  TO authenticated
  USING (public.integration_map_can_manage())
  WITH CHECK (public.integration_map_can_manage());

DROP POLICY IF EXISTS "Admins can delete integration technique map"
  ON public.integration_technique_map;
CREATE POLICY "Admins can delete integration technique map"
  ON public.integration_technique_map
  FOR DELETE
  TO authenticated
  USING (public.integration_map_can_manage());

-- 3) Normalizacao na escrita. A leitura usa
--    integration_norm_technique(texto da OS), que baixa caixa, tira acento e
--    colapsa espaco. Gravar a chave como o usuario digitou ("Silk Screen ")
--    criaria uma linha que nunca casa com nenhuma OS e o job continuaria nao
--    nascendo - so que agora sem nenhum sinal na tela. SECURITY DEFINER porque
--    chama extensions.unaccent e roda no INSERT do usuario autenticado.
CREATE OR REPLACE FUNCTION public.tg_integration_technique_map_normalize()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.promo_technique := public.integration_norm_technique(NEW.promo_technique);
  NEW.fg_technique_id := btrim(NEW.fg_technique_id);

  IF NEW.promo_technique = '' THEN
    RAISE EXCEPTION 'ERR_TECNICA_VAZIA';
  END IF;

  IF NEW.fg_technique_id = '' THEN
    RAISE EXCEPTION 'ERR_DESTINO_VAZIO';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tg_integration_technique_map_normalize
  ON public.integration_technique_map;
CREATE TRIGGER tg_integration_technique_map_normalize
  BEFORE INSERT OR UPDATE ON public.integration_technique_map
  FOR EACH ROW EXECUTE FUNCTION public.tg_integration_technique_map_normalize();

-- 4) Reprocessamento tem que enxergar o mapa novo. O fg_technique_id e resolvido
--    na criacao da OS (integration_enqueue) e congelado no payload: mapear a
--    tecnica depois e clicar em Reprocessar reenviaria o payload antigo (NULL) e
--    o adapter marcaria 'skipped' de novo ("lacuna de cadastro") - a tela de
--    mapeamento nao teria efeito nenhum. Aqui o requeue re-resolve a tecnica a
--    partir do texto da OS que ja esta no payload. Nao muda nada para os outros
--    destinos nem para evento ja entregue.
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
         delivered_at = NULL,
         payload = CASE
           WHEN v_destination = 'fast_gravacoes'
             AND payload ? 'technique'
             THEN payload || jsonb_build_object(
                    'fg_technique_id',
                    public.integration_fg_technique(payload ->> 'technique')
                  )
           ELSE payload
         END
   WHERE event_id = _event_id;

  RETURN jsonb_build_object(
    'ok', true,
    'event_id', _event_id,
    'status', 'pending',
    'destination', v_destination
  );
END;
$function$;