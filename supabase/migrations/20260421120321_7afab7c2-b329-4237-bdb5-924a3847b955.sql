-- Enum for asset types
CREATE TYPE public.asset_type AS ENUM ('logo', 'art', 'photo', 'mockup', 'document', 'other');

-- Assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  asset_type public.asset_type NOT NULL DEFAULT 'other',
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  dominant_colors TEXT[] DEFAULT '{}',
  thumbnail_path TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  parent_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_org ON public.assets(organization_id);
CREATE INDEX idx_assets_client ON public.assets(client_id);
CREATE INDEX idx_assets_type ON public.assets(asset_type);
CREATE INDEX idx_assets_tags ON public.assets USING GIN(tags);
CREATE INDEX idx_assets_parent ON public.assets(parent_asset_id);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view assets"
  ON public.assets FOR SELECT TO authenticated
  USING (is_member_of(auth.uid(), organization_id));

CREATE POLICY "Designers+ can create assets"
  ON public.assets FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role,'admin'::app_role,'designer'::app_role]));

CREATE POLICY "Designers+ can update assets"
  ON public.assets FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role,'admin'::app_role,'designer'::app_role]));

CREATE POLICY "Owners and admins can delete assets"
  ON public.assets FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role,'admin'::app_role]));

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_assets
  AFTER INSERT OR UPDATE OR DELETE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- Brand guidelines table
CREATE TABLE public.brand_guidelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  primary_colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  secondary_colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  fonts JSONB NOT NULL DEFAULT '[]'::jsonb,
  do_rules TEXT[] DEFAULT '{}',
  dont_rules TEXT[] DEFAULT '{}',
  logo_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_guidelines_org ON public.brand_guidelines(organization_id);

ALTER TABLE public.brand_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view brand guidelines"
  ON public.brand_guidelines FOR SELECT TO authenticated
  USING (is_member_of(auth.uid(), organization_id));

CREATE POLICY "Designers+ can create brand guidelines"
  ON public.brand_guidelines FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role,'admin'::app_role,'designer'::app_role]));

CREATE POLICY "Designers+ can update brand guidelines"
  ON public.brand_guidelines FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role,'admin'::app_role,'designer'::app_role]));

CREATE POLICY "Owners and admins can delete brand guidelines"
  ON public.brand_guidelines FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role,'admin'::app_role]));

CREATE TRIGGER update_brand_guidelines_updated_at
  BEFORE UPDATE ON public.brand_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_brand_guidelines
  AFTER INSERT OR UPDATE OR DELETE ON public.brand_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.write_audit_log();

-- Storage bucket for assets (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path = {organization_id}/{client_id|_org}/{asset_id}/{filename}
-- First folder segment is organization_id; access if user is member of that org
CREATE POLICY "Org members can read assets bucket"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assets'
    AND is_member_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Designers+ can upload to assets bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assets'
    AND has_any_role(auth.uid(), ((storage.foldername(name))[1])::uuid, ARRAY['owner'::app_role,'admin'::app_role,'designer'::app_role])
  );

CREATE POLICY "Designers+ can update assets bucket"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assets'
    AND has_any_role(auth.uid(), ((storage.foldername(name))[1])::uuid, ARRAY['owner'::app_role,'admin'::app_role,'designer'::app_role])
  );

CREATE POLICY "Admins+ can delete from assets bucket"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assets'
    AND has_any_role(auth.uid(), ((storage.foldername(name))[1])::uuid, ARRAY['owner'::app_role,'admin'::app_role])
  );