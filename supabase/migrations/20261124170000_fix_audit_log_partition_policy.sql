-- create_audit_log_partition() so fazia CREATE TABLE ... PARTITION OF. Nao criava
-- policy nem forcava RLS, entao cada particao nova nascia com relrowsecurity=true e
-- ZERO policies. Particao NAO herda policy do pai no Postgres: o resultado e que toda
-- linha que cai na particao nova fica invisivel para authenticated via public.audit_log.
--
-- Provado em producao (2026-11-24): linha inserida pelo pai com created_at em
-- 2026-12-15 foi para audit_log_y2026m12 e ficou legivel pelo owner (a leitura via
-- pai usa a policy do pai), mas o acesso DIRETO a particao devolve 0 linhas.
-- audit_log_y2026m12 (0 linhas) e audit_log_y2027m01 (0 linhas) estavam assim;
-- as particoes antigas tem a policy deny_direct_partition_access + FORCE RLS.
--
-- Correcao: reproduzir o comportamento das particoes antigas dentro da funcao.
--   - ENABLE + FORCE ROW LEVEL SECURITY
--   - policy deny_direct_partition_access (ALL, USING false, WITH CHECK false)
--   - revogar escrita direta de anon/authenticated (defesa em profundidade)
-- E tambem remendar as particoes ja existentes sem a policy.

CREATE OR REPLACE FUNCTION public.create_audit_log_partition(_month_start DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start   TIMESTAMPTZ := date_trunc('month', _month_start)::timestamptz;
  v_end     TIMESTAMPTZ := (date_trunc('month', _month_start) + interval '1 month')::timestamptz;
  v_name    TEXT        := format('audit_log_y%sm%s',
                                  to_char(v_start, 'YYYY'),
                                  to_char(v_start, 'MM'));
  v_exists  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = v_name
  ) INTO v_exists;

  IF NOT v_exists THEN
    EXECUTE format(
      'CREATE TABLE public.%I PARTITION OF public.audit_log FOR VALUES FROM (%L) TO (%L)',
      v_name, v_start, v_end
    );
  END IF;

  -- Idempotente: garante RLS forcado + policy deny mesmo em particao pre-existente.
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_name);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_name);

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = v_name
      AND p.polname = 'deny_direct_partition_access'
  ) THEN
    EXECUTE format(
      'CREATE POLICY deny_direct_partition_access ON public.%I FOR ALL USING (false) WITH CHECK (false)',
      v_name
    );
  END IF;

  -- Escrita direta na particao nunca deve passar: o caminho e sempre o pai.
  EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM PUBLIC, anon, authenticated', v_name);

  RETURN CASE WHEN v_exists THEN format('exists:%s', v_name) ELSE format('created:%s', v_name) END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_audit_log_partition(DATE) FROM PUBLIC, anon, authenticated;

-- Remenda as particoes que ja existem sem a policy.
DO $mig$
DECLARE
  v_name TEXT;
BEGIN
  FOR v_name IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_inherits i ON i.inhrelid = c.oid
    JOIN pg_class p ON p.oid = i.inhparent
    JOIN pg_namespace n ON n.oid = p.relnamespace
    WHERE n.nspname = 'public' AND p.relname = 'audit_log'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', v_name);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      WHERE c.relname = v_name AND pol.polname = 'deny_direct_partition_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY deny_direct_partition_access ON public.%I FOR ALL USING (false) WITH CHECK (false)',
        v_name
      );
    END IF;
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM PUBLIC, anon, authenticated', v_name);
  END LOOP;
END $mig$;