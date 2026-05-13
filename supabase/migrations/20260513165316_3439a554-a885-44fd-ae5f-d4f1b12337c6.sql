-- 1. Add organization_id
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.catalog_products ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 2. Update RLS for product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public categories are viewable by all" ON public.product_categories;

CREATE POLICY "Org members can view categories"
ON public.product_categories FOR SELECT
USING (is_member_of(auth.uid(), organization_id));

CREATE POLICY "Org admins+ can manage categories"
ON public.product_categories FOR ALL
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- 3. Update RLS for catalog_products
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own products" ON public.catalog_products;

CREATE POLICY "Org members can view products"
ON public.catalog_products FOR SELECT
USING (is_member_of(auth.uid(), organization_id));

CREATE POLICY "Org admins+ can manage products"
ON public.catalog_products FOR ALL
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- 4. Add audit log triggers
DROP TRIGGER IF EXISTS trigger_catalog_products_audit_log ON public.catalog_products;
CREATE TRIGGER trigger_catalog_products_audit_log
AFTER UPDATE OR INSERT OR DELETE ON public.catalog_products
FOR EACH ROW EXECUTE FUNCTION public.log_generic_change();
