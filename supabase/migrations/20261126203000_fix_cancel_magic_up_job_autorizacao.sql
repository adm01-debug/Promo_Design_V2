-- cancel_magic_up_job recebia o uid do chamador como parametro (_user_id) e
-- usava esse valor na autorizacao. Como a funcao e SECURITY DEFINER e tem
-- EXECUTE para authenticated, qualquer usuario logado podia cancelar o job de
-- outra pessoa passando o uuid da vitima. Agora o uid do token manda: em
-- chamadas authenticated o parametro precisa ser igual a auth.uid(); chamadas
-- de service_role (auth.uid() nulo) seguem usando o parametro informado.
CREATE OR REPLACE FUNCTION public.cancel_magic_up_job(_job_id uuid, _user_id uuid)
 RETURNS public.magic_up_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _job public.magic_up_jobs;
  _actor uuid := COALESCE(auth.uid(), _user_id);
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN: usuario do token diferente do informado';
  END IF;

  SELECT * INTO _job
    FROM public.magic_up_jobs
    WHERE id = _job_id;

  IF _job IS NULL THEN
    RAISE EXCEPTION 'ERR_JOB_NOT_FOUND: job nao encontrado';
  END IF;
  IF _job.user_id <> _actor
     AND NOT public.is_member_of(_actor, _job.organization_id) THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN: sem permissao para cancelar este job';
  END IF;
  IF _job.status IN ('done','failed','cancelled') THEN
    RAISE EXCEPTION 'ERR_JOB_FINAL: job ja finalizado';
  END IF;

  UPDATE public.magic_up_jobs
     SET status = 'cancelled', completed_at = now()
   WHERE id = _job_id
   RETURNING * INTO _job;

  RETURN _job;
END;
$function$;