CREATE TABLE public.audit_saved_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_saved_views_user_org ON public.audit_saved_views(user_id, organization_id);

ALTER TABLE public.audit_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own audit views"
ON public.audit_saved_views FOR SELECT TO authenticated
USING (auth.uid() = user_id AND is_member_of(auth.uid(), organization_id));

CREATE POLICY "Users insert own audit views"
ON public.audit_saved_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_member_of(auth.uid(), organization_id));

CREATE POLICY "Users update own audit views"
ON public.audit_saved_views FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own audit views"
ON public.audit_saved_views FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER trg_audit_saved_views_updated_at
BEFORE UPDATE ON public.audit_saved_views
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();