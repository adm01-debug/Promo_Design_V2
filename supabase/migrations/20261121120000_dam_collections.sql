-- DAM collections: hierarchical folders to organize assets per organization.
--
-- Design (owner decision 2026-11-21):
--   * dam_collections holds folder rows (name + parent for nesting). Assets are
--     linked in dam_collection_assets (M2M), so one asset can live in multiple
--     collections. RLS follows the org pattern (is_member_of) and is_owner
--     columns mirror the assets table created_by/owner semantics.
--   * Deleting a collection removes only the link rows; assets themselves are
--     never deleted. A "favorite" collection is created per org lazily by the
--     app (is_system true) so /dam reuses standard list rendering.

CREATE TABLE IF NOT EXISTS public.dam_collections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  parent_id       uuid REFERENCES public.dam_collections(id) ON DELETE CASCADE,
  description     text,
  cover_asset_id  uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  is_system       boolean NOT NULL DEFAULT false,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dam_collection_assets (
  collection_id uuid NOT NULL REFERENCES public.dam_collections(id) ON DELETE CASCADE,
  asset_id      uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  added_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_dam_collections_org_created
  ON public.dam_collections (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dam_collections_parent
  ON public.dam_collections (parent_id);
CREATE INDEX IF NOT EXISTS idx_dam_collection_assets_asset
  ON public.dam_collection_assets (asset_id);

ALTER TABLE public.dam_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dam_collection_assets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.dam_collections FROM PUBLIC, anon;
REVOKE ALL ON public.dam_collection_assets FROM PUBLIC, anon;

-- Sem estes GRANT a RLS nunca chega a ser avaliada: o PostgREST responde
-- "permission denied for table" e as telas de colecoes ficam vazias para todos,
-- inclusive para os membros da organizacao.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dam_collections TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.dam_collection_assets TO authenticated;
GRANT ALL ON public.dam_collections TO service_role;
GRANT ALL ON public.dam_collection_assets TO service_role;

CREATE POLICY "Members select collections"
  ON public.dam_collections FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), organization_id));

CREATE POLICY "Editors insert collections"
  ON public.dam_collections FOR INSERT TO authenticated
  WITH CHECK (
    public.is_member_of(auth.uid(), organization_id)
    AND public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin','designer']::public.app_role[])
  );

CREATE POLICY "Editors update collections"
  ON public.dam_collections FOR UPDATE TO authenticated
  USING (
    public.is_member_of(auth.uid(), organization_id)
    AND public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin','designer']::public.app_role[])
  );

CREATE POLICY "Editors delete collections"
  ON public.dam_collections FOR DELETE TO authenticated
  USING (
    public.is_member_of(auth.uid(), organization_id)
    AND public.has_any_role(auth.uid(), organization_id, ARRAY['owner','admin','designer']::public.app_role[])
  );

CREATE POLICY "Members select collection assets"
  ON public.dam_collection_assets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dam_collections c
      WHERE c.id = collection_id
        AND public.is_member_of(auth.uid(), c.organization_id)
    )
  );

CREATE POLICY "Editors insert collection assets"
  ON public.dam_collection_assets FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dam_collections c
      WHERE c.id = collection_id
        AND public.is_member_of(auth.uid(), c.organization_id)
        AND public.has_any_role(auth.uid(), c.organization_id, ARRAY['owner','admin','designer']::public.app_role[])
    )
  );

CREATE POLICY "Editors delete collection assets"
  ON public.dam_collection_assets FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dam_collections c
      WHERE c.id = collection_id
        AND public.is_member_of(auth.uid(), c.organization_id)
        AND public.has_any_role(auth.uid(), c.organization_id, ARRAY['owner','admin','designer']::public.app_role[])
    )
  );

-- RPC: count assets per collection (used by collection list cards)
CREATE OR REPLACE FUNCTION public.count_collection_assets(_collection_id uuid)
RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*)
  FROM public.dam_collection_assets
  WHERE collection_id = _collection_id;
$$;

REVOKE ALL ON FUNCTION public.count_collection_assets FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_collection_assets TO authenticated;