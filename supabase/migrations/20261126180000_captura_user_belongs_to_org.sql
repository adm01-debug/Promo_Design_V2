-- user_belongs_to_org nunca teve migration: foi criada direto no banco (projeto
-- fygxlswpkjtjpcefjfty) e passou a ser consumida por 20260723162840, 20260723163010 e
-- 20260723164823 (RPCs de aprovação/brand share) e endurecida depois em
-- 20261126183500 (ALTER FUNCTION ... SET search_path) e 20261126190000
-- (REVOKE ... FROM PUBLIC, anon).
--
-- Consequência de não existir aqui: um banco criado do zero por
-- `supabase db push --include-all` falha no ALTER FUNCTION e no REVOKE EXECUTE
-- (function does not exist), ou seja, o histórico não era reaplicável.
-- Posição deliberada: antes de 20261126183500 para respeitar essa ordem.
--
-- Semântica idêntica a is_member_of: existe membership do usuário na organização.

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  );
$function$;

REVOKE ALL ON FUNCTION public.user_belongs_to_org(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_org(uuid, uuid) TO authenticated, service_role;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'user_belongs_to_org'
  ) THEN
    RAISE EXCEPTION 'user_belongs_to_org nao foi criada';
  END IF;
  IF has_function_privilege('anon', 'public.user_belongs_to_org(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'user_belongs_to_org ainda executavel por anon';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.user_belongs_to_org(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated perdeu user_belongs_to_org';
  END IF;
END;
$do$;
