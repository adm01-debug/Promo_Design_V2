
-- Consolidate duplicate audit triggers. Keep audit_trigger_func (writes changed_fields).
-- Drop redundant triggers that cause 2-3x audit_log write amplification.

-- assets: 3 audit triggers -> keep 1
DROP TRIGGER IF EXISTS audit_assets ON public.assets;
DROP TRIGGER IF EXISTS trigger_assets_audit_insert_log ON public.assets;

-- clients: 2 audit triggers -> keep 1
DROP TRIGGER IF EXISTS trg_audit_clients ON public.clients;

-- brand_guidelines: replace write_audit_log trigger with the standard audit_trigger_func
DROP TRIGGER IF EXISTS audit_brand_guidelines ON public.brand_guidelines;
CREATE TRIGGER audit_brand_guidelines_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.brand_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- catalog_products: replace log_generic_change (uses wrong column names) with standard
DROP TRIGGER IF EXISTS trigger_catalog_products_audit_log ON public.catalog_products;
CREATE TRIGGER audit_catalog_products_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
