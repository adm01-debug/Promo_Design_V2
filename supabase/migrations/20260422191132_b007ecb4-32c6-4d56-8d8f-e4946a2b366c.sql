ALTER TABLE public.audit_alert_rules
  ADD COLUMN IF NOT EXISTS advanced_conditions jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.notify_audit_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_match BOOLEAN;
  v_recipient UUID;
  v_recipients UUID[];
  v_cond JSONB;
  v_key TEXT;
  v_op TEXT;
  v_val TEXT;
  v_old TEXT;
  v_new TEXT;
  v_cond_match BOOLEAN;
BEGIN
  IF NEW.organization_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT * FROM public.audit_alert_rules
    WHERE is_active = true
      AND organization_id = NEW.organization_id
      AND (cardinality(actions) = 0 OR NEW.action = ANY(actions))
      AND (cardinality(table_names) = 0 OR NEW.table_name = ANY(table_names))
      AND (target_user_id IS NULL OR NEW.user_id = target_user_id)
  LOOP
    v_match := true;

    -- Primary condition (legacy single value_key/value_query)
    IF r.value_key IS NOT NULL AND r.value_query IS NOT NULL AND length(r.value_query) > 0 THEN
      v_match := (
        coalesce(NEW.old_values->>r.value_key, '') ILIKE '%' || r.value_query || '%'
        OR coalesce(NEW.new_values->>r.value_key, '') ILIKE '%' || r.value_query || '%'
      );
    END IF;

    -- Advanced conditions: ALL must match (AND semantics)
    IF v_match AND jsonb_typeof(r.advanced_conditions) = 'array' AND jsonb_array_length(r.advanced_conditions) > 0 THEN
      FOR v_cond IN SELECT * FROM jsonb_array_elements(r.advanced_conditions)
      LOOP
        v_key := v_cond->>'key';
        v_op := COALESCE(v_cond->>'op', 'contains');
        v_val := COALESCE(v_cond->>'value', '');
        IF v_key IS NULL OR length(v_key) = 0 THEN
          CONTINUE;
        END IF;
        v_old := coalesce(NEW.old_values->>v_key, '');
        v_new := coalesce(NEW.new_values->>v_key, '');

        v_cond_match := CASE v_op
          WHEN 'equals'      THEN (v_old = v_val OR v_new = v_val)
          WHEN 'not_equals'  THEN (v_old <> v_val AND v_new <> v_val)
          WHEN 'starts_with' THEN (v_old ILIKE v_val || '%' OR v_new ILIKE v_val || '%')
          WHEN 'ends_with'   THEN (v_old ILIKE '%' || v_val OR v_new ILIKE '%' || v_val)
          ELSE                    (v_old ILIKE '%' || v_val || '%' OR v_new ILIKE '%' || v_val || '%')
        END;

        IF NOT v_cond_match THEN
          v_match := false;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF NOT v_match THEN
      CONTINUE;
    END IF;

    -- Resolve recipients per rule mode
    IF r.recipients_mode = 'organization' THEN
      SELECT COALESCE(array_agg(DISTINCT om.user_id), '{}'::uuid[])
        INTO v_recipients
      FROM public.organization_members om
      WHERE om.organization_id = r.organization_id;
    ELSIF r.recipients_mode = 'users' THEN
      SELECT COALESCE(array_agg(DISTINCT om.user_id), '{}'::uuid[])
        INTO v_recipients
      FROM public.organization_members om
      WHERE om.organization_id = r.organization_id
        AND om.user_id = ANY(COALESCE(r.recipient_user_ids, '{}'::uuid[]));
      IF NOT (r.user_id = ANY(v_recipients)) THEN
        v_recipients := array_append(v_recipients, r.user_id);
      END IF;
    ELSE
      v_recipients := ARRAY[r.user_id];
    END IF;

    FOREACH v_recipient IN ARRAY v_recipients LOOP
      INSERT INTO public.notifications (
        user_id, os_id, os_number, product_name, old_status, new_status, event_type
      )
      VALUES (
        v_recipient,
        NULL,
        'AUDIT',
        left(r.name, 200),
        NEW.table_name,
        NEW.action || ' em ' || NEW.table_name,
        'audit_alert'
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$function$;