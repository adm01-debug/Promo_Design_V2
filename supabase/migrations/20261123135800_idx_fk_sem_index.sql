-- Migration: 20261123135800_idx_fk_sem_index
-- Adiciona índices nas colunas de FK que não tinham índice, eliminando
-- sequential scans em JOINs/DELETEs. CONCURRENTLY permite execução sem lock.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_usage_log_org_id
  ON ai_usage_log (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_approval_tokens_org_id
  ON approval_tokens (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_org_id
  ON assets (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_alert_rules_org_id
  ON audit_alert_rules (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_guidelines_history_guideline_id
  ON brand_guidelines_history (brand_guideline_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_guidelines_history_client_id
  ON brand_guidelines_history (client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_guidelines_history_org_id
  ON brand_guidelines_history (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_guidelines_infer_history_client_id
  ON brand_guidelines_infer_history (client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_guidelines_infer_history_org_id
  ON brand_guidelines_infer_history (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_share_tokens_org_id
  ON brand_share_tokens (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dam_collection_assets_collection_id
  ON dam_collection_assets (collection_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dam_collections_cover_asset_id
  ON dam_collections (cover_asset_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dam_collections_org_id
  ON dam_collections (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magic_up_jobs_org_id
  ON magic_up_jobs (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_magic_up_styles_org_id
  ON magic_up_styles (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_invites_org_id
  ON organization_invites (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_org_id
  ON organization_members (organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_org_id
  ON videos (organization_id);