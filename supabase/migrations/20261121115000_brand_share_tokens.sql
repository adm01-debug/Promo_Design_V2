-- Brand share: a public link so the client can view the brand guidelines
-- (manual de marca) without logging in.
--
-- Design (reuses the approval_token flow from PR #69):
--   * brand_share_tokens holds one row per shared guideline. The token itself
--     is the sign-in: a high-entropy random string kept in the share URL. RLS
--     is closed: only service_role / SECURITY DEFINER RPCs can touch the
--     table, the public page goes through the brand-share edge function.
--   * Tokens are valid for the configured window (30 days by default) and can
--     be revoked. The snapshot is read from brand_guidelines at request time,
--     so the client always sees the latest manual.

CREATE TABLE IF NOT EXISTS public.brand_share_tokens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token               text NOT NULL UNIQUE,
  brand_guideline_id  uuid NOT NULL REFERENCES public.brand_guidelines(id) ON DELETE CASCADE,
  organization_id     uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at          timestamptz NOT NULL,
  revoked_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_share_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.brand_share_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.brand_share_tokens TO service_role;

CREATE INDEX IF NOT EXISTS idx_brand_share_tokens_status
  ON public.brand_share_tokens (expires_at, revoked_at, created_at);
CREATE INDEX IF NOT EXISTS idx_brand_share_tokens_guideline
  ON public.brand_share_tokens (brand_guideline_id);

-- ---------------------------------------------------------------------------
-- RPCs (SECURITY DEFINER, invoked by the edge function with service_role).
-- ---------------------------------------------------------------------------

-- Create a share token for a brand guideline. Valid 30 days by default.
-- Only a member with designer+ role in the guideline's org may mint a link.
CREATE OR REPLACE FUNCTION public.create_brand_share_token(
  _brand_guideline_id uuid,
  _organization_id uuid,
  _created_by uuid,
  _valid_days int DEFAULT 30
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public', extensions
AS $$
DECLARE
  _token text;
BEGIN
  IF _valid_days < 1 OR _valid_days > 90 THEN
    RAISE EXCEPTION 'valid_days fora do intervalo permitido (1..90)';
  END IF;

  -- Only a member with designer+ role in the org may mint a share link.
  IF _created_by IS NOT NULL THEN
    IF NOT has_any_role(
      _created_by, _organization_id,
      ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]
    ) THEN
      RAISE EXCEPTION 'sem permissao para compartilhar o manual da marca';
    END IF;
  END IF;

  -- The guideline must exist and belong to the same org.
  IF NOT EXISTS (
    SELECT 1 FROM public.brand_guidelines g
    WHERE g.id = _brand_guideline_id
      AND g.organization_id = _organization_id
  ) THEN
    RAISE EXCEPTION 'manual nao encontrado ou sem permissao';
  END IF;

  _token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.brand_share_tokens
    (token, brand_guideline_id, organization_id, created_by, expires_at)
  VALUES
    (_token, _brand_guideline_id, _organization_id, _created_by,
     now() + make_interval(days => _valid_days))
  RETURNING token INTO _token;

  RETURN _token;
END;
$$;

-- Public read: resolves a token and returns the brand guideline snapshot if
-- valid. Any other state returns the share status without the manual.
CREATE OR REPLACE FUNCTION public.get_brand_share_by_token(_token text)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = 'public'
AS $$
SELECT CASE
  WHEN t.revoked_at IS NOT NULL THEN
    jsonb_build_object(
      'status',     'revoked',
      'expires_at', t.expires_at,
      'client_name', c.name,
      'guideline',  NULL
    )
  WHEN t.expires_at <= now() THEN
    jsonb_build_object(
      'status',     'expired',
      'expires_at', t.expires_at,
      'client_name', c.name,
      'guideline',  NULL
    )
  ELSE
    jsonb_build_object(
      'status',     'active',
      'expires_at', t.expires_at,
      'client_name', c.name,
      'guideline', jsonb_build_object(
          'id',                 g.id,
          'client_id',          g.client_id,
          'primary_colors',     g.primary_colors,
          'secondary_colors',   g.secondary_colors,
          'fonts',              g.fonts,
          'do_rules',           g.do_rules,
          'dont_rules',         g.dont_rules,
          'logo_asset_id',      g.logo_asset_id,
          'notes',              g.notes,
          'updated_at',         g.updated_at
        )
    )
  END
  FROM public.brand_share_tokens t
  LEFT JOIN public.brand_guidelines g ON g.id = t.brand_guideline_id
  LEFT JOIN public.clients c ON c.id = g.client_id
  WHERE t.token = _token;
$$;

REVOKE ALL ON FUNCTION public.create_brand_share_token(uuid, uuid, uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_brand_share_by_token(text) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.create_brand_share_token(uuid, uuid, uuid, int) TO service_role;
GRANT ALL ON FUNCTION public.get_brand_share_by_token(text) TO service_role;