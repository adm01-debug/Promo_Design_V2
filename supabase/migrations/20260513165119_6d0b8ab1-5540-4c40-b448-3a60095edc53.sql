-- 1. Add missing columns to service_orders
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);

-- 2. Add missing columns to magicup_history
ALTER TABLE public.magicup_history ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.magicup_history ADD COLUMN IF NOT EXISTS lock_version INTEGER DEFAULT 1;

-- 3. Add missing columns to mockup_drafts
ALTER TABLE public.mockup_drafts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.mockup_drafts ADD COLUMN IF NOT EXISTS lock_version INTEGER DEFAULT 1;
ALTER TABLE public.mockup_drafts ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id);

-- 4. Update RLS for service_orders
DROP POLICY IF EXISTS "Users can view their own service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Users can create their own service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Users can update their own service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Users can delete their own service orders" ON public.service_orders;

CREATE POLICY "Org members can view service orders"
ON public.service_orders FOR SELECT
USING (is_member_of(auth.uid(), organization_id));

CREATE POLICY "Org designers+ can create service orders"
ON public.service_orders FOR INSERT
WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

CREATE POLICY "Org designers+ can update service orders"
ON public.service_orders FOR UPDATE
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

CREATE POLICY "Org admins+ can delete service orders"
ON public.service_orders FOR DELETE
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- 5. Update RLS for magicup_history
DROP POLICY IF EXISTS "Users can view their own history" ON public.magicup_history;
DROP POLICY IF EXISTS "Users can insert their own history" ON public.magicup_history;
DROP POLICY IF EXISTS "Users can delete their own history" ON public.magicup_history;

CREATE POLICY "Org members can view magicup history"
ON public.magicup_history FOR SELECT
USING (is_member_of(auth.uid(), organization_id));

CREATE POLICY "Org members can insert magicup history"
ON public.magicup_history FOR INSERT
WITH CHECK (is_member_of(auth.uid(), organization_id));

CREATE POLICY "Org members can delete their own magicup history"
ON public.magicup_history FOR DELETE
USING (auth.uid() = user_id);

-- 6. Update RLS for mockup_drafts
CREATE POLICY "Org members can view mockup drafts"
ON public.mockup_drafts FOR SELECT
USING (is_member_of(auth.uid(), organization_id));

CREATE POLICY "Org members can manage mockup drafts"
ON public.mockup_drafts FOR ALL
USING (is_member_of(auth.uid(), organization_id));

-- 7. Add audit triggers for service_orders
DROP TRIGGER IF EXISTS trigger_service_orders_audit_lock ON public.service_orders;
CREATE TRIGGER trigger_service_orders_audit_lock
BEFORE UPDATE ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.handle_asset_update(); -- Using the same generic handler

DROP TRIGGER IF EXISTS trigger_service_orders_audit_log ON public.service_orders;
CREATE TRIGGER trigger_service_orders_audit_log
AFTER UPDATE OR INSERT OR DELETE ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.log_asset_change(); -- This function might need to be more generic

-- Make log_asset_change more generic
CREATE OR REPLACE FUNCTION public.log_generic_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  INSERT INTO public.audit_log (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    v_user_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-apply triggers with generic logger
DROP TRIGGER IF EXISTS trigger_assets_audit_insert_log ON public.assets;
CREATE TRIGGER trigger_assets_audit_insert_log
AFTER UPDATE OR INSERT OR DELETE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.log_generic_change();

DROP TRIGGER IF EXISTS trigger_service_orders_audit_log ON public.service_orders;
CREATE TRIGGER trigger_service_orders_audit_log
AFTER UPDATE OR INSERT OR DELETE ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.log_generic_change();
