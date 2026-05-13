-- Function to handle auditing
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_changed_fields JSONB := '{}'::jsonb;
BEGIN
    -- Get user ID from Supabase auth context
    v_user_id := auth.uid();
    
    -- Attempt to get organization_id from the record
    BEGIN
        IF (TG_OP = 'DELETE') THEN
            v_org_id := OLD.organization_id;
        ELSIF (TG_OP = 'UPDATE') THEN
            v_org_id := NEW.organization_id;
        ELSIF (TG_OP = 'INSERT') THEN
            v_org_id := NEW.organization_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback if organization_id doesn't exist on the table
        v_org_id := NULL;
    END;

    IF (TG_OP = 'UPDATE') THEN
        -- Calculate changed fields
        SELECT jsonb_object_agg(key, value)
        INTO v_changed_fields
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key;
        
        INSERT INTO public.audit_log (
            organization_id,
            user_id,
            table_name,
            record_id,
            action,
            old_values,
            new_values,
            changed_fields
        ) VALUES (
            v_org_id,
            v_user_id,
            TG_TABLE_NAME,
            OLD.id,
            TG_OP,
            to_jsonb(OLD),
            to_jsonb(NEW),
            v_changed_fields
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_log (
            organization_id,
            user_id,
            table_name,
            record_id,
            action,
            new_values
        ) VALUES (
            v_org_id,
            v_user_id,
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_log (
            organization_id,
            user_id,
            table_name,
            record_id,
            action,
            old_values
        ) VALUES (
            v_org_id,
            v_user_id,
            TG_TABLE_NAME,
            OLD.id,
            TG_OP,
            to_jsonb(OLD)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable audit triggers on core tables
DROP TRIGGER IF EXISTS audit_organizations_trigger ON public.organizations;
CREATE TRIGGER audit_organizations_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_clients_trigger ON public.clients;
CREATE TRIGGER audit_clients_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_assets_trigger ON public.assets;
CREATE TRIGGER audit_assets_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_service_orders_trigger ON public.service_orders;
CREATE TRIGGER audit_service_orders_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Ensure RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view audit logs for their organization" ON public.audit_log;
CREATE POLICY "Users can view audit logs for their organization"
ON public.audit_log
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id 
        FROM public.organization_members 
        WHERE user_id = auth.uid()
    )
);