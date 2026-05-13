-- Ensure lock_version exists for optimistic locking
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'lock_version') THEN
        ALTER TABLE public.assets ADD COLUMN lock_version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Track who last modified the record
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'last_modified_by') THEN
        ALTER TABLE public.assets ADD COLUMN last_modified_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Function to handle optimistic locking and audit tracking
CREATE OR REPLACE FUNCTION public.handle_asset_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Optimistic locking check
  IF (OLD.lock_version IS NOT NULL AND NEW.lock_version IS NOT NULL AND NEW.lock_version <> OLD.lock_version + 1) THEN
    RAISE EXCEPTION 'Conflito de concorrência: o registro foi alterado por outro usuário.';
  END IF;

  -- Auto-increment lock version if not manually handled
  IF (NEW.lock_version = OLD.lock_version) THEN
    NEW.lock_version := OLD.lock_version + 1;
  END IF;

  -- Set last_modified_by if available in metadata (via session)
  -- In Supabase, we can use auth.uid()
  NEW.last_modified_by := auth.uid();
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger for asset updates
DROP TRIGGER IF EXISTS trigger_assets_audit_lock ON public.assets;
CREATE TRIGGER trigger_assets_audit_lock
BEFORE UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.handle_asset_update();

-- Create audit log trigger to capture the change
CREATE OR REPLACE FUNCTION public.log_asset_change()
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
    NEW.organization_id,
    v_user_id,
    TG_OP,
    'asset',
    NEW.id,
    row_to_json(OLD),
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_assets_audit_insert_log ON public.assets;
CREATE TRIGGER trigger_assets_audit_insert_log
AFTER UPDATE OR INSERT OR DELETE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.log_asset_change();
