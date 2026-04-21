-- Table for audit alert rules
CREATE TABLE public.audit_alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  actions TEXT[] NOT NULL DEFAULT '{}',
  table_names TEXT[] NOT NULL DEFAULT '{}',
  target_user_id UUID NULL,
  value_key TEXT NULL,
  value_query TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_alert_rules_org_active ON public.audit_alert_rules(organization_id, is_active);
CREATE INDEX idx_audit_alert_rules_user ON public.audit_alert_rules(user_id);

ALTER TABLE public.audit_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view alert rules"
ON public.audit_alert_rules FOR SELECT TO authenticated
USING (is_member_of(auth.uid(), organization_id));

CREATE POLICY "Owners can insert their alert rules"
ON public.audit_alert_rules FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_member_of(auth.uid(), organization_id));

CREATE POLICY "Owners can update their alert rules"
ON public.audit_alert_rules FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete their alert rules"
ON public.audit_alert_rules FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER trg_audit_alert_rules_updated_at
BEFORE UPDATE ON public.audit_alert_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function: create notification when audit_log event matches a rule
CREATE OR REPLACE FUNCTION public.notify_audit_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_match BOOLEAN;
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

    IF v_match THEN
      INSERT INTO public.notifications (
        user_id, os_id, os_number, product_name, old_status, new_status, event_type
      )
      VALUES (
        r.user_id,
        NULL,
        'AUDIT',
        left(r.name, 200),
        NEW.table_name,
        NEW.action || ' em ' || NEW.table_name,
        'audit_alert'
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_alert_notify
AFTER INSERT ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.notify_audit_alert();