
-- organization_members: drop 3 redundant indexes (UNIQUE covers org lookups; keep one user index)
DROP INDEX IF EXISTS public.idx_org_members_org;
DROP INDEX IF EXISTS public.idx_organization_members_org_id;
DROP INDEX IF EXISTS public.idx_org_members_user;
-- Keep idx_organization_members_user_id (needed: WHERE user_id = auth.uid())
-- Unique index (organization_id, user_id) covers all org-first lookups

-- videos: consolidate two single-column indexes into one composite matching the actual query
CREATE INDEX IF NOT EXISTS idx_videos_org_created
  ON public.videos (organization_id, created_at DESC);
DROP INDEX IF EXISTS public.idx_videos_org_id;
DROP INDEX IF EXISTS public.idx_videos_created_at;
