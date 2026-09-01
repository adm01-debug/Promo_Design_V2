-- Remove índices duplicados na tabela assets para reduzir amplificação de escrita e uso de storage
DROP INDEX IF EXISTS public.idx_assets_tags_gin;
DROP INDEX IF EXISTS public.idx_assets_client_id;
DROP INDEX IF EXISTS public.assets_ocr_text_trgm_idx;
DROP INDEX IF EXISTS public.idx_assets_archived;
DROP INDEX IF EXISTS public.idx_assets_org_created;