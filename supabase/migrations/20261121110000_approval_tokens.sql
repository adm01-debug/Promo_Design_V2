-- Client approval flow: share a public link so the client can
-- approve/reject a finished mockup without logging in.
--
-- Design (owner decision 2026-11-21):
--   * approval_tokens holds one row per shared mockup. The token itself is the
--     sign-in: a high-entropy random string kept in the share URL. RLS is
--     closed: only service_role / SECURITY DEFINER RPCs can touch the table,
--     the public page goes through the mockup-approval edge function.
--   * Tokens are valid for the configured window (7 days) and are single-shot
--     for the decision: once decided, the link shows the result instead of
--     re-opening the form.
--   * The snapshot of the mockup (thumbnail, product, placement) is read from
--     mockup_drafts at request time, so the client always sees the latest art.

CREATE TABLE IF NOT EXISTS public.approval_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token         text NOT NULL UNIQUE,
  mockup_id     uuid NOT NULL REFERENCES public.mockup_drafts(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name   text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','expired')),
  decision_note text,
  expires_at    timestamptz NOT NULL,
  decided_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.approval_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.approval_tokens TO service_role;

CREATE INDEX IF NOT EXISTS idx_approval_tokens_status_expiry
  ON public.approval_tokens (status, expires_at, created_at);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_mockup
  ON public.approval_tokens (mockup_id);

-- ---------------------------------------------------------------------------
-- RPCs (SECURITY DEFINER, invoked by the edge function with service_role).
-- ---------------------------------------------------------------------------

-- Create a share token for a draft. Valid 7 days by default.
CREATE OR REPLACE FUNCTION public.create_approval_token(
  _mockup_id uuid,
  _organization_id uuid,
  _created_by uuid,
  _client_name text DEFAULT NULL,
  _valid_days int DEFAULT 7
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

  -- Only the draft owner (or a service account) may mint a share link.
  IF _created_by IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.mockup_drafts d
      WHERE d.id = _mockup_id AND d.user_id = _created_by
    ) THEN
      RAISE EXCEPTION 'mockup nao encontrado ou sem permissao';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.mockup_drafts WHERE id = _mockup_id) THEN
    RAISE EXCEPTION 'mockup nao encontrado';
  END IF;

  _token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.approval_tokens
    (token, mockup_id, organization_id, created_by, client_name, expires_at)
  VALUES
    (_token, _mockup_id, _organization_id, _created_by, _client_name,
     now() + make_interval(days => _valid_days))
  RETURNING token INTO _token;

  RETURN _token;
END;
$$;

-- Public read: resolves a token and returns the mockup snapshot if valid.
-- Returns a row only for a known token. A pending, unexpired token exposes
-- the mockup; any other state returns the token status without the art.
CREATE OR REPLACE FUNCTION public.get_approval_by_token(_token text)
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = 'public'
AS $$
SELECT CASE
  WHEN t.status = 'pending' AND t.expires_at > now() THEN
    jsonb_build_object(
      'status',        'pending',
      'expires_at',    t.expires_at,
      'decision_note', NULL,
      'client_name',   t.client_name,
      'mockup', jsonb_build_object(
          'id',            d.id,
          'name',          d.name,
          'product_name',  d.product_name,
          'product_sku',   d.product_sku,
          'thumbnail_url', d.thumbnail_url,
          'editor_state',  d.editor_state
        )
    )
  WHEN t.status = 'pending' AND t.expires_at <= now() THEN
    jsonb_build_object(
      'status',        'expired',
      'expires_at',    t.expires_at,
      'decided_at',    NULL,
      'decision_note', NULL,
      'client_name',   t.client_name,
      'mockup',        NULL
    )
  ELSE
    jsonb_build_object(
      'status',        t.status,
      'expires_at',    t.expires_at,
      'decided_at',    t.decided_at,
      'decision_note', t.decision_note,
      'client_name',   t.client_name,
      'mockup',        NULL
    )
  END
  FROM public.approval_tokens t
  LEFT JOIN public.mockup_drafts d ON d.id = t.mockup_id
  WHERE t.token = _token;
$$;

-- Record the client decision. Single-shot: an already-decided token keeps the
-- first decision (the link is meant to be shared once per round).
CREATE OR REPLACE FUNCTION public.decide_approval(
  _token text,
  _status text,
  _note text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _affected int;
BEGIN
  IF _status NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'status invalido: deve ser approved ou rejected';
  END IF;

  UPDATE public.approval_tokens t
     SET status = _status,
         decision_note = COALESCE(_note, t.decision_note),
         decided_at = now()
   WHERE t.token = _token
     AND t.status = 'pending'
     AND t.expires_at > now();
  GET DIAGNOSTICS _affected = ROW_COUNT;

  RETURN _affected = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.create_approval_token(uuid, uuid, uuid, text, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_approval_by_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decide_approval(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.create_approval_token(uuid, uuid, uuid, text, int) TO service_role;
GRANT ALL ON FUNCTION public.get_approval_by_token(text) TO service_role;
GRANT ALL ON FUNCTION public.decide_approval(text, text, text) TO service_role;
