CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_assets_name_trgm ON public.assets USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assets_description_trgm ON public.assets USING gin (description gin_trgm_ops);