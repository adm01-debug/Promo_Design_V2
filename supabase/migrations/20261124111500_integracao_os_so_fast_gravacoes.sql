-- ---------------------------------------------------------------------------
-- A OS fechada (fase 2 do modulo de design) passa a ter UM destino: o Fast
-- Gravacoes, que e o sistema responsavel por transformar o mockup virtual em
-- peca fisica.
--
-- O Supply nao e mais acionado pelo Design. A compra nasce no Champions no
-- momento em que o orcamento vira pedido - ver docs/pendencias/PND-10-webhooks-erp.md.
--
-- Correcao de contrato do evento final: o status 'concluida' nunca existiu na
-- maquina de estados de service_orders (aberta, aprovada, em_producao, pronta,
-- entregue), portanto 'os.completed' jamais era enfileirado. O gatilho passa a
-- usar 'entregue'.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_os_integration_enqueue()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'pronta' THEN
    v_payload := public.integration_os_payload(NEW);
    PERFORM public.integration_enqueue('service_order', NEW.id, 'os.closed', 'fast_gravacoes', v_payload);
  ELSIF NEW.status = 'entregue' THEN
    v_payload := public.integration_os_payload(NEW);
    PERFORM public.integration_enqueue('service_order', NEW.id, 'os.completed', 'fast_gravacoes', v_payload);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_os_integration_enqueue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_os_integration_enqueue() TO service_role;

-- ---------------------------------------------------------------------------
-- Tecnicas que existem no Design mas nao existiam no dicionario do Fast
-- Gravacoes. Foram cadastradas em public.techniques de la
-- (20261124111000_add_techniques_personalizacao.sql) e passam a ser mapeadas
-- aqui em vez de irem para a fila como 'skipped'.
-- ---------------------------------------------------------------------------
INSERT INTO public.integration_technique_map (promo_technique, fg_technique_id) VALUES
  ('embossing',    'embossing'),
  ('corte',        'corte'),
  ('corte midia',  'corte'),
  ('decalque',     'decalque'),
  ('decalque forno','decalque'),
  ('hot stamp',    'hotstamp'),
  ('hot stamping', 'hotstamp')
ON CONFLICT (promo_technique) DO UPDATE SET
  fg_technique_id = EXCLUDED.fg_technique_id,
  updated_at      = now();
