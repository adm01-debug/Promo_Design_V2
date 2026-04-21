-- ENUM
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner','admin','designer','approver','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ORGANIZATION MEMBERS
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  invited_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- ROLE FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _org_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _org_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.is_member_of(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id);
$$;

CREATE OR REPLACE FUNCTION public.current_user_orgs()
RETURNS SETOF UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$;

-- ORGANIZATIONS POLICIES
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
  FOR SELECT TO authenticated USING (public.is_member_of(auth.uid(), id));
DROP POLICY IF EXISTS "Authenticated can create organizations" ON public.organizations;
CREATE POLICY "Authenticated can create organizations" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Owners and admins can update org" ON public.organizations;
CREATE POLICY "Owners and admins can update org" ON public.organizations
  FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), id, ARRAY['owner','admin']::public.app_role[]));
DROP POLICY IF EXISTS "Owners can delete org" ON public.organizations;
CREATE POLICY "Owners can delete org" ON public.organizations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), id, 'owner'));

-- ORG MEMBERS POLICIES
DROP POLICY IF EXISTS "Members can view org members" ON public.organization_members;
CREATE POLICY "Members can view org members" ON public.organization_members
  FOR SELECT TO authenticated USING (public.is_member_of(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.organization_members;
CREATE POLICY "Owners and admins can add members" ON public.organization_members
  FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.organization_members;
CREATE POLICY "Owners and admins can update members" ON public.organization_members
  FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));
DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.organization_members;
CREATE POLICY "Owners and admins can remove members" ON public.organization_members
  FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));

-- TRIGGER: creator becomes owner
CREATE OR REPLACE FUNCTION public.add_creator_as_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_add_creator_as_owner ON public.organizations;
CREATE TRIGGER trg_add_creator_as_owner AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.add_creator_as_owner();

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  document TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}'::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(organization_id, name);

DROP POLICY IF EXISTS "Org members can view clients" ON public.clients;
CREATE POLICY "Org members can view clients" ON public.clients
  FOR SELECT TO authenticated USING (public.is_member_of(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Designers+ can create clients" ON public.clients;
CREATE POLICY "Designers+ can create clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin','designer']::public.app_role[]));
DROP POLICY IF EXISTS "Designers+ can update clients" ON public.clients;
CREATE POLICY "Designers+ can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin','designer']::public.app_role[]));
DROP POLICY IF EXISTS "Owners and admins can delete clients" ON public.clients;
CREATE POLICY "Owners and admins can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLIENT CONTACTS
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON public.client_contacts(client_id);

DROP POLICY IF EXISTS "Org members can view contacts" ON public.client_contacts;
CREATE POLICY "Org members can view contacts" ON public.client_contacts
  FOR SELECT TO authenticated USING (public.is_member_of(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Designers+ can create contacts" ON public.client_contacts;
CREATE POLICY "Designers+ can create contacts" ON public.client_contacts
  FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin','designer']::public.app_role[]));
DROP POLICY IF EXISTS "Designers+ can update contacts" ON public.client_contacts;
CREATE POLICY "Designers+ can update contacts" ON public.client_contacts
  FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin','designer']::public.app_role[]));
DROP POLICY IF EXISTS "Owners and admins can delete contacts" ON public.client_contacts;
CREATE POLICY "Owners and admins can delete contacts" ON public.client_contacts
  FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin']::public.app_role[]));

DROP TRIGGER IF EXISTS trg_client_contacts_updated_at ON public.client_contacts;
CREATE TRIGGER trg_client_contacts_updated_at BEFORE UPDATE ON public.client_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON public.audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);

DROP POLICY IF EXISTS "Org members can view audit log" ON public.audit_log;
CREATE POLICY "Org members can view audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IS NOT NULL AND public.is_member_of(auth.uid(), organization_id))
  );
DROP POLICY IF EXISTS "Authenticated can insert audit entries" ON public.audit_log;
CREATE POLICY "Authenticated can insert audit entries" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- GENERIC AUDIT TRIGGER
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id UUID; v_record_id UUID; v_old JSONB; v_new JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_record_id := (OLD).id;
    v_org_id := CASE WHEN v_old ? 'organization_id' THEN (v_old->>'organization_id')::UUID ELSE NULL END;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW); v_record_id := (NEW).id;
    v_org_id := CASE WHEN v_new ? 'organization_id' THEN (v_new->>'organization_id')::UUID ELSE NULL END;
  ELSE
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_record_id := (NEW).id;
    v_org_id := CASE WHEN v_new ? 'organization_id' THEN (v_new->>'organization_id')::UUID ELSE NULL END;
  END IF;
  INSERT INTO public.audit_log (organization_id, user_id, table_name, record_id, action, old_values, new_values)
  VALUES (v_org_id, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID), TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new);
  RETURN COALESCE(NEW, OLD);
END;$$;

DROP TRIGGER IF EXISTS trg_audit_clients ON public.clients;
CREATE TRIGGER trg_audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

DROP TRIGGER IF EXISTS trg_audit_organization_members ON public.organization_members;
CREATE TRIGGER trg_audit_organization_members AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();