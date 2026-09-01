CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_assets_tags_gin
  ON public.assets USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_assets_name_trgm
  ON public.assets USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_assets_description_trgm
  ON public.assets USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_assets_org_created
  ON public.assets (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assets_org_client
  ON public.assets (organization_id, client_id);

CREATE INDEX IF NOT EXISTS idx_assets_org_type
  ON public.assets (organization_id, asset_type);

CREATE INDEX IF NOT EXISTS idx_assets_archived
  ON public.assets (organization_id, is_archived);