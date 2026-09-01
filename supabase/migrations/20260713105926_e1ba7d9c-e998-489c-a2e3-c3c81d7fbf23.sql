-- catalog_products
DROP POLICY IF EXISTS "Users can create own products" ON public.catalog_products;
CREATE POLICY "Users can create own products"
  ON public.catalog_products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (organization_id IS NULL OR is_member_of(auth.uid(), organization_id))
  );

-- product_categories
DROP POLICY IF EXISTS "Users can create own categories" ON public.product_categories;
CREATE POLICY "Users can create own categories"
  ON public.product_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (organization_id IS NULL OR is_member_of(auth.uid(), organization_id))
  );

-- magicup_history
DROP POLICY IF EXISTS "Users can insert own magicup history" ON public.magicup_history;
CREATE POLICY "Users can insert own magicup history"
  ON public.magicup_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (organization_id IS NULL OR is_member_of(auth.uid(), organization_id))
  );

-- mockup_drafts
DROP POLICY IF EXISTS "Users can insert own drafts" ON public.mockup_drafts;
CREATE POLICY "Users can insert own drafts"
  ON public.mockup_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (organization_id IS NULL OR is_member_of(auth.uid(), organization_id))
  );

-- audit_log
DROP POLICY IF EXISTS "Authenticated can insert audit entries" ON public.audit_log;
CREATE POLICY "Authenticated can insert audit entries"
  ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (organization_id IS NULL OR is_member_of(auth.uid(), organization_id))
  );