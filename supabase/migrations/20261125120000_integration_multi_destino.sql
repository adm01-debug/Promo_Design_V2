-- ---------------------------------------------------------------------------
-- Integracao multi-destino: Promo Design -> Promo Champions / Fast Gravacoes
-- / Promo Supply.
--
-- Contexto de negocio (dono, 2026-11-23): nao existe "ERP" generico. Os eventos
-- de OS vao para os sistemas que de fato executam o trabalho:
--   * Promo Champions   = CRM dos vendedores  -> criacao/alteração de design
--   * Fast Gravacoes    = personalizacao      -> OS fechada para producao
--   * Promo Supply      = compras             -> OS fechada (insumo)
--
-- Por que uma fila nova e nao reusar os_webhook_queue:
--   os_webhook_queue e single-destino (1 ERP via ERP_WEBHOOK_URL) e ja esta em
--   producao com trigger + cron proprios. Alterar seu contrato arriscaria o
--   fluxo existente. Esta tabela e aditiva: mesmo padrao de coalescing
--   (UNIQUE por entidade+evento+destino), mesmo modelo de retry/backoff, mas
--   com coluna `destination` e payload montado por destino.
--
-- Coalescing: UNIQUE (entity, entity_id, event, destination) garante que cada
-- sistema de destino recebe no maximo UM evento por OS/design - reentregas
-- trazem o snapshot mais fresco, nunca uma tempestade de eventos velhos.
--
-- RLS: fechada para anon/authenticated; so service_role e as RPCs SECURITY
-- DEFINER operam. Segredos NAO ficam aqui - vivem no env das edge functions.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.integration_queue (
  event_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 'service_order' | 'design'
  entity          text NOT NULL CHECK (entity IN ('service_order','design')),
  -- Sem FK: o snapshot do payload e autossuficiente e o evento precisa
  -- sobreviver a exclusao da linha de origem.
  entity_id       uuid NOT NULL,
  event           text NOT NULL,
  destination     text NOT NULL CHECK (destination IN ('champions','fast_gravacoes','supply')),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','delivered','failed','dead','skipped')),
  attempts        int NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  delivered_at    timestamptz
);

ALTER TABLE public.integration_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.integration_queue FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.integration_queue TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_queue_entity_event_dest
  ON public.integration_queue (entity, entity_id, event, destination);

CREATE INDEX IF NOT EXISTS idx_integration_queue_pending
  ON public.integration_queue (destination, status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_integration_queue_entity
  ON public.integration_queue (entity, entity_id);

COMMENT ON TABLE public.integration_queue IS
  'Fila de integracao Promo Design -> Champions/Fast Gravacoes/Supply. Coalescida por (entity, entity_id, event, destination).';

-- ---------------------------------------------------------------------------
-- Normalizacao de tecnica: a OS guarda texto livre ("Sublimação - Caneca"),
-- o Fast Gravacoes usa IDs canonicos ("sublimation-mug"). Sem esse mapa o
-- destino rejeita o job.
-- ---------------------------------------------------------------------------

-- unaccent e o unico jeito confiavel de tirar acento: um translate() tipado a
-- mao quebra silenciosamente quando origem e destino tem comprimentos
-- diferentes (uma letra ausente desalinha todos os pares seguintes).
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.integration_norm_technique(_text text)
RETURNS text
LANGUAGE sql STABLE
SET search_path = 'public, extensions'
AS $$
  -- unaccent() nao e IMMUTABLE (depende do dicionario), por isso STABLE.
  SELECT btrim(regexp_replace(
    lower(extensions.unaccent(coalesce(_text, ''))),
    '\s+', ' ', 'g'
  ));
$$;

COMMENT ON FUNCTION public.integration_norm_technique(text) IS
  'Normaliza o texto livre de tecnica da OS (minusculo, sem acento, espacos colapsados).';

-- Mapa tecnica-da-OS -> tecnica do Fast Gravacoes (techniques.id e TEXT la).
-- AS CHAVES SAO GRAVADAS JA NORMALIZADAS (ver INSERT abaixo): comparar a chave
-- crua contra integration_norm_technique() falharia em toda tecnica acentuada.
CREATE TABLE IF NOT EXISTS public.integration_technique_map (
  promo_technique text PRIMARY KEY,
  fg_technique_id text NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_technique_map ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.integration_technique_map FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.integration_technique_map TO service_role;
GRANT ALL ON TABLE public.integration_technique_map TO service_role;

INSERT INTO public.integration_technique_map (promo_technique, fg_technique_id)
SELECT public.integration_norm_technique(v.k), v.fg_technique_id
FROM (VALUES
  ('laser',                'laser-co2'),
  ('laser co2',            'laser-co2'),
  ('laser co 2',           'laser-co2'),
  ('laser fiber',          'fiber-laser'),
  ('laser fibra',          'fiber-laser'),
  ('fibra laser',          'fiber-laser'),
  ('laser uv',             'laser-uv'),
  ('tampografia',          'tampo'),
  ('tampo',                'tampo'),
  ('sublimação',           'thermal-press'),
  ('sublimação têxtil',    'thermal-press'),
  ('prensa termica',       'thermal-press'),
  ('sublimação - caneca',  'sublimation-mug'),
  ('sublimação caneca',    'sublimation-mug'),
  ('silk screen',          'silk-textile'),
  ('serigrafia',           'silk-textile'),
  ('silk textil',          'silk-textile'),
  ('silk vinilico plano',  'silk-vinyl-flat'),
  ('silk vinilico rotativo','silk-vinyl-rotative'),
  ('embossing',            'hot-stamp'),
  ('hot stamping',         'hot-stamp'),
  ('hot stamp',            'hot-stamp'),
  ('decalque',             'silk-decal'),
  ('decalque forno',       'decal-oven'),
  ('dtf',                  'dtf-textile'),
  ('dtf textil',           'dtf-textile'),
  ('dtf uv',               'dtf-uv'),
  ('aplicacao dtf uv',     'dtf-uv-application'),
  ('corte',                'cut-media'),
  ('corte midia',          'cut-media')
) AS v(k, fg_technique_id)
ON CONFLICT (promo_technique) DO NOTHING;

-- Resolve a tecnica do Fast Gravacoes a partir do texto livre da OS.
CREATE OR REPLACE FUNCTION public.integration_fg_technique(_text text)
RETURNS text
LANGUAGE sql STABLE
SET search_path = 'public'
AS $$
  SELECT m.fg_technique_id
  FROM public.integration_technique_map m
  WHERE m.promo_technique = public.integration_norm_technique(_text)
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.integration_fg_technique(text) IS
  'Texto livre de tecnica da OS -> techniques.id do Fast Gravacoes (NULL quando nao mapeado).';

-- ---------------------------------------------------------------------------
-- Enqueue idempotente (coalescing).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.integration_enqueue(
  _entity text,
  _entity_id uuid,
  _event text,
  _destination text,
  _payload jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.integration_queue (entity, entity_id, event, destination, payload)
  VALUES (_entity, _entity_id, _event, _destination, _payload)
  ON CONFLICT (entity, entity_id, event, destination) DO UPDATE SET
    payload         = EXCLUDED.payload,
    status          = 'pending',
    attempts        = 0,
    last_error      = NULL,
    next_attempt_at = now(),
    delivered_at    = NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.integration_enqueue(text, uuid, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_enqueue(text, uuid, text, text, jsonb)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Payload dos eventos de OS (snapshot + tecnica resolvida + email do dono).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.integration_os_payload(_os public.service_orders)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'os_id',             _os.id,
    'os_number',         _os.os_number,
    'status',            _os.status,
    'client_name',       _os.client_name,
    'client_company',    _os.client_company,
    'client_email',      _os.client_email,
    'client_phone',      _os.client_phone,
    'product_name',      _os.product_name,
    'product_sku',       _os.product_sku,
    'product_material',  _os.product_material,
    'technique',         _os.technique,
    'fg_technique_id',   public.integration_fg_technique(_os.technique),
    'quantity',          _os.quantity,
    'delivery_date',     _os.delivery_date,
    'observations',      _os.observations,
    'organization_id',   _os.organization_id,
    'owner_email',       (SELECT u.email FROM auth.users u WHERE u.id = _os.user_id),
    'created_at',        _os.created_at,
    'updated_at',        _os.updated_at
  );
$$;

REVOKE EXECUTE ON FUNCTION public.integration_os_payload(public.service_orders)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_os_payload(public.service_orders)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Payload de design (mockup_drafts / magic_up_jobs).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.integration_design_payload(
  _design_id uuid,
  _name text,
  _product_name text,
  _product_sku text,
  _thumbnail_url text,
  _user_id uuid,
  _updated_at timestamptz
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'design_id',    _design_id,
    'name',         _name,
    'product_name', _product_name,
    'product_sku',  _product_sku,
    'thumbnail_url', _thumbnail_url,
    'owner_email',  (SELECT u.email FROM auth.users u WHERE u.id = _user_id),
    'updated_at',   _updated_at
  );
$$;

REVOKE EXECUTE ON FUNCTION public.integration_design_payload(uuid, text, text, text, text, uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.integration_design_payload(uuid, text, text, text, text, uuid, timestamptz)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Triggers de saida.
--   OS atinge 'pronta'    -> os.closed      -> fast_gravacoes + supply
--   OS atinge 'concluida' -> os.completed   -> fast_gravacoes + supply
--   design criado         -> design.created -> champions
--   design alterado       -> design.updated -> champions
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
    PERFORM public.integration_enqueue('service_order', NEW.id, 'os.closed', 'supply', v_payload);
  ELSIF NEW.status = 'concluida' THEN
    v_payload := public.integration_os_payload(NEW);
    PERFORM public.integration_enqueue('service_order', NEW.id, 'os.completed', 'fast_gravacoes', v_payload);
    PERFORM public.integration_enqueue('service_order', NEW.id, 'os.completed', 'supply', v_payload);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_os_integration_enqueue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_os_integration_enqueue() TO service_role;

DROP TRIGGER IF EXISTS trg_os_integration_enqueue ON public.service_orders;
CREATE TRIGGER trg_os_integration_enqueue
  AFTER UPDATE OF status ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_os_integration_enqueue();

CREATE OR REPLACE FUNCTION public.tg_design_integration_enqueue()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_event text;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'design.created';
  ELSE
    -- So reenvia quando algo que o CRM do vendedor usa mudou.
    IF NEW.name IS NOT DISTINCT FROM OLD.name
       AND NEW.product_name IS NOT DISTINCT FROM OLD.product_name
       AND NEW.product_sku IS NOT DISTINCT FROM OLD.product_sku
       AND NEW.thumbnail_url IS NOT DISTINCT FROM OLD.thumbnail_url THEN
      RETURN NEW;
    END IF;
    v_event := 'design.updated';
  END IF;

  v_payload := public.integration_design_payload(
    NEW.id, NEW.name, NEW.product_name, NEW.product_sku,
    NEW.thumbnail_url, NEW.user_id, NEW.updated_at);

  PERFORM public.integration_enqueue('design', NEW.id, v_event, 'champions', v_payload);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_design_integration_enqueue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_design_integration_enqueue() TO service_role;

DROP TRIGGER IF EXISTS trg_design_integration_enqueue ON public.mockup_drafts;
CREATE TRIGGER trg_design_integration_enqueue
  AFTER INSERT OR UPDATE OF name, product_name, product_sku, thumbnail_url
  ON public.mockup_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_design_integration_enqueue();

-- ---------------------------------------------------------------------------
-- RPCs do dispatcher.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dequeue_integration_events(
  _destination text,
  _limit int DEFAULT 25
) RETURNS TABLE (
  event_id uuid, entity text, entity_id uuid, event text, destination text,
  payload jsonb, attempts int
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden: service_role only';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT q.event_id
    FROM public.integration_queue q
    WHERE q.destination = _destination
      AND q.status = 'pending'
      AND q.next_attempt_at <= now()
    ORDER BY q.next_attempt_at, q.created_at
    LIMIT _limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.integration_queue q
  SET attempts = q.attempts + 1,
      next_attempt_at = now() + public.webhook_retry_delay(q.attempts)
  FROM claimed c
  WHERE q.event_id = c.event_id
  RETURNING q.event_id, q.entity, q.entity_id, q.event, q.destination, q.payload, q.attempts;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dequeue_integration_events(text, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dequeue_integration_events(text, int) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_integration_delivered(_event_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden: service_role only';
  END IF;
  UPDATE public.integration_queue
     SET status = 'delivered', delivered_at = now(), last_error = NULL
   WHERE event_id = _event_id;
END;
$$;

-- 'skipped' = o evento nao se aplica ao destino (ex.: tecnica sem mapeamento).
-- Nao e falha: nao deve queimar tentativas nem virar dead-letter, mas fica
-- registrado com o motivo para auditoria.
CREATE OR REPLACE FUNCTION public.mark_integration_skipped(_event_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden: service_role only';
  END IF;
  UPDATE public.integration_queue
     SET status = 'skipped', last_error = left(_reason, 500)
   WHERE event_id = _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_integration_failed(_event_id uuid, _error text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden: service_role only';
  END IF;
  UPDATE public.integration_queue
     SET status = CASE WHEN attempts >= 8 THEN 'dead' ELSE 'pending' END,
         last_error = left(_error, 500)
   WHERE event_id = _event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_integration_delivered(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_integration_skipped(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_integration_failed(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_integration_delivered(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_integration_skipped(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_integration_failed(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Cron: dispara a edge function integration-dispatcher a cada minuto.
-- Config lida do Vault (mesmo padrao de os_webhook_config).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.integration_config(_name text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v text;
BEGIN
  IF _name = 'cron_secret' THEN
    SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = 'integration_cron_secret';
    IF v IS NULL THEN
      SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = 'os_webhook_cron_secret';
    END IF;
  ELSIF _name = 'functions_base' THEN
    SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = 'integration_functions_base';
    IF v IS NULL THEN
      SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = 'os_webhook_functions_base';
    END IF;
  END IF;
  RETURN v;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.integration_config(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.run_integration_dispatcher()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_base text := COALESCE(public.integration_config('functions_base'), '');
  v_secret text := COALESCE(public.integration_config('cron_secret'), '');
  v_url text;
  v_res bigint;
BEGIN
  IF v_base = '' OR v_secret = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'skipped', 'cron not configured',
      'hint', 'gravar integration_functions_base e integration_cron_secret no Vault'
    );
  END IF;

  v_url := rtrim(v_base, '/') || '/integration-dispatcher';
  v_res := net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'::jsonb
  );
  RETURN jsonb_build_object('ok', true, 'request_id', v_res, 'url', v_url);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_integration_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_integration_dispatcher() TO service_role;

DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'integration-dispatcher-every-minute';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'integration-dispatcher-every-minute',
  '* * * * *',
  $$SELECT public.run_integration_dispatcher();$$
);