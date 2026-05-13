-- Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.is_member_of(_user_id uuid, _org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id);
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _org_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role);
$function$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _org_id uuid, _roles app_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = ANY(_roles));
$function$;

-- Standardize RLS for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" 
ON public.organizations FOR SELECT 
USING (is_member_of(auth.uid(), id));

DROP POLICY IF EXISTS "Authenticated can create organizations" ON public.organizations;
CREATE POLICY "Authenticated can create organizations" 
ON public.organizations FOR INSERT 
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
CREATE POLICY "Owners can update their organizations" 
ON public.organizations FOR UPDATE 
USING (has_role(auth.uid(), id, 'owner'::app_role));

-- Standardize RLS for clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view clients" ON public.clients;
CREATE POLICY "Org members can view clients" 
ON public.clients FOR SELECT 
USING (is_member_of(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Designers+ can create clients" ON public.clients;
CREATE POLICY "Designers+ can create clients" 
ON public.clients FOR INSERT 
WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

DROP POLICY IF EXISTS "Designers+ can update clients" ON public.clients;
CREATE POLICY "Designers+ can update clients" 
ON public.clients FOR UPDATE 
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

DROP POLICY IF EXISTS "Admins+ can delete clients" ON public.clients;
CREATE POLICY "Admins+ can delete clients" 
ON public.clients FOR DELETE 
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- Standardize RLS for assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view assets" ON public.assets;
CREATE POLICY "Org members can view assets" 
ON public.assets FOR SELECT 
USING (is_member_of(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Designers+ can create assets" ON public.assets;
CREATE POLICY "Designers+ can create assets" 
ON public.assets FOR INSERT 
WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

DROP POLICY IF EXISTS "Designers+ can update assets" ON public.assets;
CREATE POLICY "Designers+ can update assets" 
ON public.assets FOR UPDATE 
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

DROP POLICY IF EXISTS "Owners and admins can delete assets" ON public.assets;
CREATE POLICY "Owners and admins can delete assets" 
ON public.assets FOR DELETE 
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- Standardize RLS for service_orders
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view service orders" ON public.service_orders;
CREATE POLICY "Org members can view service orders" 
ON public.service_orders FOR SELECT 
USING (is_member_of(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org designers+ can create service orders" ON public.service_orders;
CREATE POLICY "Org designers+ can create service orders" 
ON public.service_orders FOR INSERT 
WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

DROP POLICY IF EXISTS "Org designers+ can update service orders" ON public.service_orders;
CREATE POLICY "Org designers+ can update service orders" 
ON public.service_orders FOR UPDATE 
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

DROP POLICY IF EXISTS "Org admins+ can delete service orders" ON public.service_orders;
CREATE POLICY "Org admins+ can delete service orders" 
ON public.service_orders FOR DELETE 
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- Triggers for organization consistency
CREATE OR REPLACE FUNCTION public.validate_org_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'organization_id cannot be null';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = NEW.organization_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User is not a member of the specified organization';
  END IF;
  
  RETURN NEW;
END;$function$;

DROP TRIGGER IF EXISTS trg_validate_client_org ON public.clients;
CREATE TRIGGER trg_validate_client_org
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.validate_org_consistency();

DROP TRIGGER IF EXISTS trg_validate_asset_org ON public.assets;
CREATE TRIGGER trg_validate_asset_org
BEFORE INSERT OR UPDATE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.validate_org_consistency();