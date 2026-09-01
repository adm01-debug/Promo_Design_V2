-- 1. Guarda de edição (fonte da verdade no banco)
CREATE OR REPLACE FUNCTION public.tg_service_orders_edit_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_cols text[];
BEGIN
  IF OLD.status NOT IN ('concluida', 'cancelada') THEN
    RETURN NEW;
  END IF;

  -- Soft-delete e reabertura de status continuam permitidos
  SELECT array_agg(key)
    INTO changed_cols
  FROM jsonb_each(to_jsonb(NEW)) n
  WHERE n.key NOT IN ('status', 'updated_at', 'lock_version', 'deleted_at')
    AND n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);

  IF changed_cols IS NOT NULL AND array_length(changed_cols, 1) > 0 THEN
    RAISE EXCEPTION 'ERR_ORDER_EDIT: ordem % em status % nao pode ser editada (campos: %)',
      OLD.id, OLD.status, array_to_string(changed_cols, ', ')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_service_orders_edit_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_service_orders_edit_guard ON public.service_orders;
CREATE TRIGGER trg_service_orders_edit_guard
BEFORE UPDATE ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.tg_service_orders_edit_guard();

-- 2. Telemetria agregada por endpoint + conformidade
CREATE OR REPLACE FUNCTION public.get_endpoint_telemetry(
  _org_id uuid,
  _days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _since timestamptz := now() - make_interval(days => greatest(1, least(_days, 365)));
  _endpoints jsonb;
  _compliance jsonb;
  _totals jsonb;
BEGIN
  IF NOT public.is_member_of(auth.uid(), _org_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT coalesce(jsonb_agg(t ORDER BY t.calls DESC), '[]'::jsonb)
    INTO _endpoints
  FROM (
    SELECT
      feature_name AS endpoint,
      count(*)::int AS calls,
      count(DISTINCT user_id)::int AS unique_users,
      coalesce(sum(tokens_in), 0)::bigint AS tokens_in,
      coalesce(sum(tokens_out), 0)::bigint AS tokens_out,
      round(coalesce(sum(cost_estimate), 0)::numeric, 4) AS cost_estimate,
      max(created_at) AS last_call
    FROM public.ai_usage_log
    WHERE organization_id = _org_id
      AND created_at >= _since
    GROUP BY feature_name
  ) t;

  SELECT coalesce(jsonb_agg(c ORDER BY c.events DESC), '[]'::jsonb)
    INTO _compliance
  FROM (
    SELECT
      action AS event,
      table_name,
      count(*)::int AS events,
      max(created_at) AS last_event
    FROM public.audit_log
    WHERE organization_id = _org_id
      AND created_at >= _since
      AND action IN ('order.edit_blocked', 'brand.recommendation_applied')
    GROUP BY action, table_name
  ) c;

  SELECT jsonb_build_object(
    'total_calls', coalesce(sum((e ->> 'calls')::int), 0),
    'total_cost', coalesce(sum((e ->> 'cost_estimate')::numeric), 0),
    'endpoints', coalesce(jsonb_array_length(_endpoints), 0)
  ) INTO _totals
  FROM jsonb_array_elements(_endpoints) e;

  RETURN jsonb_build_object(
    'window_days', greatest(1, least(_days, 365)),
    'totals', coalesce(_totals, jsonb_build_object('total_calls', 0, 'total_cost', 0, 'endpoints', 0)),
    'endpoints', _endpoints,
    'compliance', _compliance
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_endpoint_telemetry(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_endpoint_telemetry(uuid, integer) TO authenticated;