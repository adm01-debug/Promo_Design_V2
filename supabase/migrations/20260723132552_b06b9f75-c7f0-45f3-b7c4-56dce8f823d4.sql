
CREATE TABLE public.brand_guidelines_infer_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  request_id TEXT,
  model TEXT,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  proposal JSONB NOT NULL,
  snapshot_before JSONB NOT NULL DEFAULT '{}'::jsonb,
  diff JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_size INT NOT NULL DEFAULT 0,
  assets_used INT NOT NULL DEFAULT 0,
  confidence NUMERIC(4,3),
  applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  applied_selection JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bg_infer_history_client ON public.brand_guidelines_infer_history(client_id, created_at DESC);
CREATE INDEX idx_bg_infer_history_org ON public.brand_guidelines_infer_history(organization_id, created_at DESC);

GRANT SELECT, UPDATE ON public.brand_guidelines_infer_history TO authenticated;
GRANT ALL ON public.brand_guidelines_infer_history TO service_role;

ALTER TABLE public.brand_guidelines_infer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view infer history in their orgs"
  ON public.brand_guidelines_infer_history
  FOR SELECT
  TO authenticated
  USING (public.is_member_of(auth.uid(), organization_id));

CREATE POLICY "Members can mark history as applied in their orgs"
  ON public.brand_guidelines_infer_history
  FOR UPDATE
  TO authenticated
  USING (public.is_member_of(auth.uid(), organization_id))
  WITH CHECK (public.is_member_of(auth.uid(), organization_id));

CREATE TRIGGER update_bg_infer_history_updated_at
  BEFORE UPDATE ON public.brand_guidelines_infer_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
