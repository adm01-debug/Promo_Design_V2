
-- catalog_products: drop and recreate with authenticated role
DROP POLICY IF EXISTS "Users can create own products" ON public.catalog_products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.catalog_products;
DROP POLICY IF EXISTS "Users can update own products" ON public.catalog_products;
DROP POLICY IF EXISTS "Users can view own products" ON public.catalog_products;

CREATE POLICY "Users can view own products" ON public.catalog_products FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own products" ON public.catalog_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.catalog_products FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.catalog_products FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- magicup_history: drop and recreate with authenticated role
DROP POLICY IF EXISTS "Users can delete own magicup history" ON public.magicup_history;
DROP POLICY IF EXISTS "Users can insert own magicup history" ON public.magicup_history;
DROP POLICY IF EXISTS "Users can update own magicup history" ON public.magicup_history;
DROP POLICY IF EXISTS "Users can view own magicup history" ON public.magicup_history;

CREATE POLICY "Users can view own magicup history" ON public.magicup_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own magicup history" ON public.magicup_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own magicup history" ON public.magicup_history FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own magicup history" ON public.magicup_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- mockup_drafts: drop and recreate with authenticated role
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.mockup_drafts;
DROP POLICY IF EXISTS "Users can insert own drafts" ON public.mockup_drafts;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.mockup_drafts;
DROP POLICY IF EXISTS "Users can view own drafts" ON public.mockup_drafts;

CREATE POLICY "Users can view own drafts" ON public.mockup_drafts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drafts" ON public.mockup_drafts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drafts" ON public.mockup_drafts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drafts" ON public.mockup_drafts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- product_categories: drop and recreate with authenticated role
DROP POLICY IF EXISTS "Users can create own categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.product_categories;
DROP POLICY IF EXISTS "Users can view own categories" ON public.product_categories;

CREATE POLICY "Users can view own categories" ON public.product_categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own categories" ON public.product_categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.product_categories FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.product_categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Also fix service_orders (currently public role)
DROP POLICY IF EXISTS "Users can create their own service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Users can delete their own service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Users can update their own service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Users can view their own service orders" ON public.service_orders;

CREATE POLICY "Users can view their own service orders" ON public.service_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own service orders" ON public.service_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own service orders" ON public.service_orders FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own service orders" ON public.service_orders FOR DELETE TO authenticated USING (auth.uid() = user_id);
