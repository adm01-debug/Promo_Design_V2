-- ---------------------------------------------------------------------------
-- Fecha o buraco de configuracao do dispatcher de webhooks ERP.
--
-- A versao anterior le a URL e o segredo de GUCs `app.net.*` gravados com
-- ALTER DATABASE/ALTER ROLE SET. Isso NAO funciona em projeto Supabase
-- hospedado: o role postgres nao e superuser e ambos falham com
--   42501: permission denied to set parameter "app.net.functions_base"
-- Resultado real medido em producao: current_setting() devolvia vazio, a
-- funcao retornava {"skipped":"cron not configured"} a cada minuto e a fila
-- os_webhook_queue nunca era drenada - o webhook ERP ficava morto sem erro.
--
-- Passa a ler do Vault, que e o cofre de segredos do proprio Supabase e o
-- unico caminho que funciona sem superuser. O fallback para os GUCs mantem
-- compatibilidade com quem ja configurou por ALTER ROLE em ambiente
-- self-hosted.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.os_webhook_config(_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v text;
BEGIN
  IF _name = 'cron_secret' THEN
    SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = 'os_webhook_cron_secret';
    IF v IS NULL THEN
      v := current_setting('app.net.os_webhook_cron_secret', true);
    END IF;
  ELSIF _name = 'functions_base' THEN
    SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = 'os_webhook_functions_base';
    IF v IS NULL THEN
      v := current_setting('app.net.functions_base', true);
    END IF;
  END IF;
  RETURN v;
END;
$$;

COMMENT ON FUNCTION public.os_webhook_config(text) IS
  'Le a configuracao do dispatcher do Vault (preferido) ou de GUC app.net.* (self-hosted).';
REVOKE EXECUTE ON FUNCTION public.os_webhook_config(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.run_os_webhook_dispatcher()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_base text := COALESCE(public.os_webhook_config('functions_base'), '');
  v_secret text := COALESCE(public.os_webhook_config('cron_secret'), '');
  v_url text;
  v_res bigint;
BEGIN
  IF v_base = '' OR v_secret = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'skipped', 'cron not configured',
      'hint', 'gravar os_webhook_functions_base e os_webhook_cron_secret no Vault'
    );
  END IF;

  v_url := rtrim(v_base, '/') || '/os-webhook-dispatcher';
  v_res := net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'::jsonb
  );
  RETURN jsonb_build_object('ok', true, 'request_id', v_res, 'url', v_url);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_os_webhook_dispatcher() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_os_webhook_dispatcher() TO service_role;