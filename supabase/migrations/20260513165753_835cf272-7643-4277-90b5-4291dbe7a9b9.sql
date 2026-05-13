-- 1. Create organization_invites table
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer'::app_role,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  
  UNIQUE(organization_id, email)
);

-- 2. Enable RLS
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Org admins can view invites"
ON public.organization_invites FOR SELECT
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));

CREATE POLICY "Org admins can create invites"
ON public.organization_invites FOR INSERT
WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));

CREATE POLICY "Org admins can delete invites"
ON public.organization_invites FOR DELETE
USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- 4. Function to accept invite
CREATE OR REPLACE FUNCTION public.accept_organization_invite(_token UUID)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID := auth.uid();
BEGIN
  -- Validate user
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Find valid invite
  SELECT * INTO v_invite
  FROM public.organization_invites
  WHERE token = _token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  -- Create membership
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_invite.organization_id, v_user_id, v_invite.role)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Mark invite as accepted
  UPDATE public.organization_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'ok', true,
    'organization_id', v_invite.organization_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Audit triggers
DROP TRIGGER IF EXISTS trigger_org_invites_audit_log ON public.organization_invites;
CREATE TRIGGER trigger_org_invites_audit_log
AFTER UPDATE OR INSERT OR DELETE ON public.organization_invites
FOR EACH ROW EXECUTE FUNCTION public.log_generic_change();
