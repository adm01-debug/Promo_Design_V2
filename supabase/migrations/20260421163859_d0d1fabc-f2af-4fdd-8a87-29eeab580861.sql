CREATE TABLE public.dam_saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dam_saved_searches_org_user_created
  ON public.dam_saved_searches (organization_id, user_id, created_at DESC);

CREATE UNIQUE INDEX uq_dam_saved_searches_org_user_name
  ON public.dam_saved_searches (organization_id, user_id, lower(name));

ALTER TABLE public.dam_saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved searches"
  ON public.dam_saved_searches
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_member_of(auth.uid(), organization_id));

CREATE POLICY "Users insert own saved searches"
  ON public.dam_saved_searches
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_member_of(auth.uid(), organization_id));

CREATE POLICY "Users update own saved searches"
  ON public.dam_saved_searches
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_member_of(auth.uid(), organization_id));

CREATE POLICY "Users delete own saved searches"
  ON public.dam_saved_searches
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_dam_saved_searches_updated_at
  BEFORE UPDATE ON public.dam_saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();