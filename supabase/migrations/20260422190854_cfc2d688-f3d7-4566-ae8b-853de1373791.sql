-- Add recipients configuration to audit alert rules
ALTER TABLE public.audit_alert_rules
  ADD COLUMN IF NOT EXISTS recipients_mode text NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS recipient_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Constrain recipients_mode to known values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_alert_rules_recipients_mode_check'
  ) THEN
    ALTER TABLE public.audit_alert_rules
      ADD CONSTRAINT audit_alert_rules_recipients_mode_check
      CHECK (recipients_mode IN ('owner','organization','users'));
  END IF;
END $$;

-- Recreate trigger function to fan-out notifications to multiple recipients
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
    IF r.value_key IS NOT NULL AND r.value_query IS NOT NULL AND length(r.value_query) > 0 THEN
      v_match := (
        coalesce(NEW.old_values->>r.value_key, '') ILIKE '%' || r.value_query || '%'
        OR coalesce(NEW.new_values->>r.value_key, '') ILIKE '%' || r.value_query || '%'
      );
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
      -- Restrict custom list to actual org members for safety
      SELECT COALESCE(array_agg(DISTINCT om.user_id), '{}'::uuid[])
        INTO v_recipients
      FROM public.organization_members om
      WHERE om.organization_id = r.organization_id
        AND om.user_id = ANY(COALESCE(r.recipient_user_ids, '{}'::uuid[]));
      -- Always include the rule owner so they don't lose their own alerts
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