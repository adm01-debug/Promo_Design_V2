-- Migration: 20261126183500_fix_ambiguidade_search_assets_e_hardening
-- Correções descobertas na auditoria de produção (management API, 26/11/2026).
--
-- 1) `search_assets_ranked` tinha dois overloads que colidiam: o de 9 argumentos
--    (anterior) e o de 11 (que acrescenta `_min_size`/`_max_size`). Como os dois têm
--    DEFAULT nos parâmetros opcionais, qualquer chamada que não passasse os dois
--    filtros de tamanho falhava com 42725 "function ... is not unique" — era
--    exatamente o caso da busca por relevância do DAM no app
--    (src/features/dam/hooks/use-assets.ts:128). O corpo do overload de 11 é
--    idêntico ao de 9 mais os dois filtros de tamanho, então ele atende todas as
--    chamadas antigas (os parâmetros novos são DEFAULT NULL). Nenhum objeto do
--    banco dependia do overload removido (checado em pg_depend).
--
-- 2) `search_path` fixo nas três funções SECURITY DEFINER que ficaram sem ele —
--    as outras 87 funções definer do schema já o tinham. Todas usam nomes
--    qualificados, então o pin não altera resultado; só impede que o search_path
--    de quem chama sequestre a resolução de nomes.
--
-- 3) Índices nas 6 colunas de FK para `auth.users` sem índice de apoio. A migration
--    20261123135800 cobriu as FKs de organization_id/client_id, mas não as de
--    created_by / changed_by / added_by / user_id.
--
-- Sem CONCURRENTLY de propósito: `supabase db push` executa o arquivo dentro de uma
-- transação (CONCURRENTLY falharia) e as tabelas envolvidas têm 24 kB a 80 kB, então
-- o lock de escrita dura milissegundos.

-- 1) fim da ambiguidade de overload
DROP FUNCTION IF EXISTS public.search_assets_ranked(
  uuid, text, uuid, asset_type[], text[], text, boolean, integer, integer
);

-- 2) search_path fixo nas funções SECURITY DEFINER
ALTER FUNCTION public.has_role(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.user_belongs_to_org(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_index_bloat_estimate(bigint, integer) SET search_path = public, pg_temp;

-- 3) índices das FKs para auth.users
CREATE INDEX IF NOT EXISTS idx_approval_tokens_created_by
  ON public.approval_tokens (created_by);

CREATE INDEX IF NOT EXISTS idx_brand_guidelines_history_changed_by
  ON public.brand_guidelines_history (changed_by);

CREATE INDEX IF NOT EXISTS idx_brand_share_tokens_created_by
  ON public.brand_share_tokens (created_by);

CREATE INDEX IF NOT EXISTS idx_dam_collection_assets_added_by
  ON public.dam_collection_assets (added_by);

CREATE INDEX IF NOT EXISTS idx_dam_collections_created_by
  ON public.dam_collections (created_by);

CREATE INDEX IF NOT EXISTS idx_magic_up_jobs_user_id
  ON public.magic_up_jobs (user_id);