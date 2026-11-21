-- OS → ERP webhook queue.
-- Owner decision 2026-11-21: dispatch on ALL service-order changes
-- (created, content edited, status changed incl. cancel/reopen, deleted).
--
-- Design:
--   * AFTER triggers in service_orders enqueue durable rows.
--   * os-webhook-dispatcher edge function (called by cron) drains the queue
--     via RPCs below with HMAC-signed POST + retry/backoff. Secrets live
--     only in Supabase function env (Dashboard), never in code/migrations.
--   * RLS: queue is closed to app roles; only service_role + SECURITY
--     DEFINER RPCs can read/update rows.

CREATE TABLE IF NOT EXISTS public.os_webhook_queue (
  event_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No FK to service_orders: the AFTER DELETE trigger enqueues os.deleted
  -- after the parent row is gone, so a FK would reject the delete. The queue
  -- is an event log (payload is a snapshot); os_id is kept as plain uuid so
  -- the ERP can identify the deleted order.
  os_id            uuid NOT NULL,
  event            text NOT NULL CHECK (event IN
    ('os.created','os.updated','os.status_changed','os.deleted')),
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','delivered','failed','dead')),
  attempts         int NOT NULL DEFAULT 0,
  next_attempt_at  timestamptz NOT NULL DEFAULT now(),
  last_error       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  delivered_at     timestamptz
);

ALTER TABLE public.os_webhook_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.os_webhook_queue FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.os_webhook_queue TO service_role;

-- One row per (os_id, event): bursts coalesce into the latest payload, so the
-- ERP receives the freshest snapshot instead of a storm of stale ones.
CREATE UNIQUE INDEX IF NOT EXISTS uq_os_webhook_queue_os_event
  ON public.os_webhook_queue (os_id, event);

CREATE INDEX IF NOT EXISTS idx_os_webhook_queue_pending
  ON public.os_webhook_queue (status, next_attempt_at, created_at);

-- ---------------------------------------------------------------------------
-- Payload builder: full snapshot of the OS row + transition metadata.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.os_webhook_payload(
  _os public.service_orders,
  _prev_status text
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'os_id',         _os.id,
    'os_number',     _os.os_number,
    'status',        _os.status,
    'previous_status', _prev_status,
    'client_name',   _os.client_name,
    'client_company', _os.client_company,
    'client_phone',  _os.client_phone,
    'client_email',  _os.client_email,
    'product_name',  _os.product_name,
    'product_sku',   _os.product_sku,
    'product_material', _os.product_material,
    'technique',     _os.technique,
    'quantity',      _os.quantity,
    'delivery_date', _os.delivery_date,
    'observations',  _os.observations,
    'created_at',    _os.created_at,
    'updated_at',    _os.updated_at,
    'deleted_at',    _os.deleted_at
  );
$$;

REVOKE EXECUTE ON FUNCTION public.os_webhook_payload(public.service_orders, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.os_webhook_payload(public.service_orders, text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Enqueue (called by the AFTER triggers).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_os_webhook(
  _os_id uuid,
  _event text,
  _payload jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.os_webhook_queue (os_id, event, payload)
  VALUES (_os_id, _event, _payload)
  ON CONFLICT (os_id, event) DO UPDATE SET
    payload = EXCLUDED.payload,
    -- New state supersedes any previous outcome: even a delivered row is
    -- re-queued (fresh snapshot) but keeps its event_id for ERP idempotency.
    status = 'pending',
    attempts = 0,
    last_error = NULL,
    next_attempt_at = now(),
    delivered_at = NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_os_webhook(uuid, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_os_webhook(uuid, text, jsonb)
  TO service_role;

-- ---------------------------------------------------------------------------
-- AFTER triggers.
--   INSERT             → os.created
--   UPDATE             → os.updated (content fields changed)
--                        + os.status_changed (status actually changed)
--                        + os.deleted (soft-delete via deleted_at set)
--   DELETE             → os.deleted
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_os_webhook_enqueue()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_changed_content boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_os_webhook(
      NEW.id, 'os.created', public.os_webhook_payload(NEW, NULL));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.enqueue_os_webhook(
      OLD.id, 'os.deleted', public.os_webhook_payload(OLD, OLD.status));
    RETURN OLD;
  END IF;

  -- UPDATE branch ------------------------------------------------------------
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.enqueue_os_webhook(
      NEW.id, 'os.status_changed', public.os_webhook_payload(NEW, OLD.status));
  END IF;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    PERFORM public.enqueue_os_webhook(
      NEW.id, 'os.deleted', public.os_webhook_payload(NEW, NEW.status));
  END IF;

  v_changed_content :=
       NEW.client_name       IS DISTINCT FROM OLD.client_name
    OR NEW.client_company    IS DISTINCT FROM OLD.client_company
    OR NEW.client_phone      IS DISTINCT FROM OLD.client_phone
    OR NEW.client_email      IS DISTINCT FROM OLD.client_email
    OR NEW.product_name      IS DISTINCT FROM OLD.product_name
    OR NEW.product_sku       IS DISTINCT FROM OLD.product_sku
    OR NEW.product_material  IS DISTINCT FROM OLD.product_material
    OR NEW.technique         IS DISTINCT FROM OLD.technique
    OR NEW.quantity          IS DISTINCT FROM OLD.quantity
    OR NEW.delivery_date     IS DISTINCT FROM OLD.delivery_date
    OR NEW.observations      IS DISTINCT FROM OLD.observations
    OR NEW.os_number         IS DISTINCT FROM OLD.os_number;

  IF v_changed_content THEN
    PERFORM public.enqueue_os_webhook(
      NEW.id, 'os.updated', public.os_webhook_payload(NEW, NEW.status));
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_os_webhook_enqueue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tg_os_webhook_enqueue() TO service_role;

DROP TRIGGER IF EXISTS trg_os_webhook_enqueue ON public.service_orders;
CREATE TRIGGER trg_os_webhook_enqueue
  AFTER INSERT OR UPDATE OR DELETE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_os_webhook_enqueue();

-- ---------------------------------------------------------------------------
-- Dispatcher RPCs (used by the edge function, runs as service_role).
--   dequeue_os_webhooks(_limit)     → claim batch, bump attempts + backoff
--   mark_os_webhook_*                → settle outcome
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dequeue_os_webhooks(_limit int DEFAULT 25)
RETURNS TABLE (
  event_id uuid, os_id uuid, event text, payload jsonb, attempts int
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
    FROM public.os_webhook_queue q
    WHERE q.status = 'pending'
      AND q.next_attempt_at <= now()
    ORDER BY q.next_attempt_at, q.created_at
    LIMIT _limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.os_webhook_queue q
  SET attempts = q.attempts + 1,
      next_attempt_at = now() + public.webhook_retry_delay(q.attempts)
  FROM claimed c
  WHERE q.event_id = c.event_id
  RETURNING q.event_id, q.os_id, q.event, q.payload, q.attempts;
END;
$$;

-- Exponential backoff: 1min, 5min, 15min, 1h, 4h, 12h, 24h, then dead-letter.
CREATE OR REPLACE FUNCTION public.webhook_retry_delay(_prior_attempts int)
RETURNS interval
LANGUAGE sql IMMUTABLE STRICT
AS $$
  SELECT CASE _prior_attempts
    WHEN 0 THEN interval '1 minute'
    WHEN 1 THEN interval '5 minutes'
    WHEN 2 THEN interval '15 minutes'
    WHEN 3 THEN interval '1 hour'
    WHEN 4 THEN interval '4 hours'
    WHEN 5 THEN interval '12 hours'
    ELSE interval '24 hours'
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.dequeue_os_webhooks(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.webhook_retry_delay(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dequeue_os_webhooks(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.webhook_retry_delay(int) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_os_webhook_delivered(_event_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden: service_role only';
  END IF;
  UPDATE public.os_webhook_queue
     SET status = 'delivered', delivered_at = now(), last_error = NULL
   WHERE event_id = _event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_os_webhook_failed(_event_id uuid, _error text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden: service_role only';
  END IF;
  UPDATE public.os_webhook_queue
     SET status = CASE
           WHEN attempts >= 8 THEN 'dead'
           ELSE 'pending'
         END,
         last_error = left(_error, 500)
   WHERE event_id = _event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_os_webhook_delivered(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_os_webhook_failed(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_os_webhook_delivered(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_os_webhook_failed(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Cron: drain the queue every minute.
-- Uses pg_cron + pg_net (both already enabled in earlier migrations) to POST
-- to the edge function with the cron secret. URL/secret resolved below from
-- vault-agnostic settings so nothing sensitive is committed.
--
-- NOTE: the edge function URL is the project's functions base; the secret
-- value is provided at deploy time via `supabase functions secret set` and
-- read here through a special `pg_temp` trick is NOT possible — instead the
-- cron job simply triggers the function and the function enforces its own
-- auth (it only accepts service-role Bearer or matching x-cron-secret).
-- ---------------------------------------------------------------------------

-- Only run if the project has a cron target URL configured. We do not commit
-- the real project URL/secret; operators set these via:
--   ALTER ROLE postgres SET app.net.functions_base = 'https://PROJECT.functions.supabase.co';
--   (then the dispatcher call below uses current_setting)
CREATE OR REPLACE FUNCTION public.run_os_webhook_dispatcher()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_base text := current_setting('app.net.functions_base', true);
  v_secret text := current_setting('app.net.os_webhook_cron_secret', true);
  v_url text;
  v_res bigint;
BEGIN
  IF COALESCE(v_base, '') = '' OR COALESCE(v_secret, '') = '' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'cron not configured');
  END IF;

  v_url := rtrim(v_base, '/') || '/os-webhook-dispatcher';
  v_res := extensions.net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'
  );
  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_res,
    'url', v_url
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_os_webhook_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_os_webhook_dispatcher() TO service_role;

DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job
   WHERE jobname = 'os-webhook-dispatcher-every-minute';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'os-webhook-dispatcher-every-minute',
  '* * * * *',
  $$SELECT public.run_os_webhook_dispatcher();$$
);
