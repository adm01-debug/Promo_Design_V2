-- Magic Up — fila de gerações em lote (Feature #4).
-- Batch jobs: permite enfileirar N estilos de uma vez e acompanhar o
-- progresso real na página /magicup/jobs, em vez de esperar 2s simulados.
--
-- Design:
--   * magic_up_jobs (1 linha por job enfileirado) com status
--     queued/processing/done/failed/cancelled + result_image_url.
--   * RLS fechado: membros da organização (via is_member_of) enxergam/criam
--     jobs da própria org; service_role gerencia via SECURITY DEFINER.
--   * Nenhum provedor de imagem é invocado aqui; a edge function magic-up-jobs
--     processa (gateway Lovable quando LOVABLE_API_KEY existe, senão fallback
--     determinístico) e só então grava o resultado.

CREATE TABLE IF NOT EXISTS public.magic_up_jobs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt         text NOT NULL CHECK (char_length(prompt) BETWEEN 5 AND 4000),
  product_name   text,
  product_sku    text,
  style          text NOT NULL DEFAULT 'premium',
  status         text NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued','processing','done','failed','cancelled')),
  result_image_url text,
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  started_at     timestamptz,
  completed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_magic_up_jobs_org_status
  ON public.magic_up_jobs (organization_id, status, created_at DESC);

ALTER TABLE public.magic_up_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.magic_up_jobs FROM PUBLIC, anon;
GRANT ALL ON TABLE public.magic_up_jobs TO authenticated;
GRANT ALL ON TABLE public.magic_up_jobs TO service_role;

CREATE POLICY "Members can view own org magic up jobs"
  ON public.magic_up_jobs FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), organization_id));

CREATE POLICY "Members can insert own org magic up jobs"
  ON public.magic_up_jobs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_member_of(auth.uid(), organization_id)
  );

CREATE OR REPLACE FUNCTION public.enqueue_magic_up_jobs(
  _organization_id uuid,
  _user_id uuid,
  _prompt text,
  _product_name text DEFAULT NULL,
  _product_sku text DEFAULT NULL,
  _styles text[] DEFAULT ARRAY['premium']::text[]
) RETURNS SETOF public.magic_up_jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _job public.magic_up_jobs;
  _style text;
  _authorized boolean;
BEGIN
  IF _styles IS NULL OR array_length(_styles, 1) IS NULL THEN
    RAISE EXCEPTION 'ERR_NO_STYLES: informe ao menos um estilo';
  END IF;
  IF array_length(_styles, 1) > 8 THEN
    RAISE EXCEPTION 'ERR_TOO_MANY_STYLES: máximo de 8 estilos por batch';
  END IF;
  IF _prompt IS NULL OR char_length(_prompt) < 5 THEN
    RAISE EXCEPTION 'ERR_SHORT_PROMPT: prompt muito curto';
  END IF;

  SELECT public.is_member_of(_user_id, _organization_id) INTO _authorized;
  IF NOT COALESCE(_authorized, false) THEN
    RAISE EXCEPTION 'ERR_NOT_MEMBER: usuário não pertence à organização';
  END IF;

  FOREACH _style IN ARRAY _styles LOOP
    INSERT INTO public.magic_up_jobs
      (organization_id, user_id, prompt, product_name, product_sku, style)
    VALUES
      (_organization_id, _user_id, _prompt, _product_name, _product_sku, _style)
    RETURNING * INTO _job;
    RETURN NEXT _job;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_magic_up_jobs(uuid, uuid, text, text, text, text[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_magic_up_jobs(uuid, uuid, text, text, text, text[])
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_magic_up_job(
  _job_id uuid,
  _user_id uuid
) RETURNS public.magic_up_jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _job public.magic_up_jobs;
BEGIN
  SELECT * INTO _job
    FROM public.magic_up_jobs
    WHERE id = _job_id;

  IF _job IS NULL THEN
    RAISE EXCEPTION 'ERR_JOB_NOT_FOUND: job não encontrado';
  END IF;
  IF _job.user_id <> _user_id
     AND NOT public.is_member_of(_user_id, _job.organization_id) THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN: sem permissão para cancelar este job';
  END IF;
  IF _job.status IN ('done','failed','cancelled') THEN
    RAISE EXCEPTION 'ERR_JOB_FINAL: job já finalizado';
  END IF;

  UPDATE public.magic_up_jobs
     SET status = 'cancelled', completed_at = now()
   WHERE id = _job_id
   RETURNING * INTO _job;

  RETURN _job;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_magic_up_job(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_magic_up_job(uuid, uuid)
  TO authenticated, service_role;
