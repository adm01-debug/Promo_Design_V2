
-- assets
DROP POLICY IF EXISTS "Designers+ can update assets" ON public.assets;
CREATE POLICY "Designers+ can update assets" ON public.assets FOR UPDATE
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

-- audit_alert_rules
DROP POLICY IF EXISTS "Owners can update their alert rules" ON public.audit_alert_rules;
CREATE POLICY "Owners can update their alert rules" ON public.audit_alert_rules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_member_of(auth.uid(), organization_id));

-- audit_saved_views
DROP POLICY IF EXISTS "Users update own audit views" ON public.audit_saved_views;
CREATE POLICY "Users update own audit views" ON public.audit_saved_views FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_member_of(auth.uid(), organization_id));

-- brand_guidelines
DROP POLICY IF EXISTS "Designers+ can update brand guidelines" ON public.brand_guidelines;
CREATE POLICY "Designers+ can update brand guidelines" ON public.brand_guidelines FOR UPDATE
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

-- catalog_products
DROP POLICY IF EXISTS "Org admins+ can manage products" ON public.catalog_products;
CREATE POLICY "Org admins+ can manage products" ON public.catalog_products FOR ALL
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));
DROP POLICY IF EXISTS "Users can update own products" ON public.catalog_products;
CREATE POLICY "Users can update own products" ON public.catalog_products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_member_of(auth.uid(), organization_id));

-- client_contacts
DROP POLICY IF EXISTS "Designers+ can update contacts" ON public.client_contacts;
CREATE POLICY "Designers+ can update contacts" ON public.client_contacts FOR UPDATE
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

-- clients
DROP POLICY IF EXISTS "Designers+ can update clients" ON public.clients;
CREATE POLICY "Designers+ can update clients" ON public.clients FOR UPDATE
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));

-- magicup_history
DROP POLICY IF EXISTS "Users can update own magicup history" ON public.magicup_history;
CREATE POLICY "Users can update own magicup history" ON public.magicup_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_member_of(auth.uid(), organization_id));

-- mockup_drafts
DROP POLICY IF EXISTS "Org members can manage mockup drafts" ON public.mockup_drafts;
CREATE POLICY "Org members can manage mockup drafts" ON public.mockup_drafts FOR ALL
  USING (is_member_of(auth.uid(), organization_id))
  WITH CHECK (is_member_of(auth.uid(), organization_id));
DROP POLICY IF EXISTS "Users can update own drafts" ON public.mockup_drafts;
CREATE POLICY "Users can update own drafts" ON public.mockup_drafts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_member_of(auth.uid(), organization_id));

-- notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- organizations
DROP POLICY IF EXISTS "Owners and admins can update org" ON public.organizations;
CREATE POLICY "Owners and admins can update org" ON public.organizations FOR UPDATE
  USING (has_any_role(auth.uid(), id, ARRAY['owner'::app_role, 'admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), id, ARRAY['owner'::app_role, 'admin'::app_role]));
DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
CREATE POLICY "Owners can update their organizations" ON public.organizations FOR UPDATE
  USING (has_role(auth.uid(), id, 'owner'::app_role))
  WITH CHECK (has_role(auth.uid(), id, 'owner'::app_role));

-- product_categories
DROP POLICY IF EXISTS "Org admins+ can manage categories" ON public.product_categories;
CREATE POLICY "Org admins+ can manage categories" ON public.product_categories FOR ALL
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));
DROP POLICY IF EXISTS "Users can update own categories" ON public.product_categories;
CREATE POLICY "Users can update own categories" ON public.product_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_member_of(auth.uid(), organization_id));

-- service_orders
DROP POLICY IF EXISTS "Org designers+ can update service orders" ON public.service_orders;
CREATE POLICY "Org designers+ can update service orders" ON public.service_orders FOR UPDATE
  USING (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role, 'designer'::app_role]));
DROP POLICY IF EXISTS "Users can update their own service orders" ON public.service_orders;
CREATE POLICY "Users can update their own service orders" ON public.service_orders FOR UPDATE
  USING ((auth.uid() = user_id) AND (deleted_at IS NULL))
  WITH CHECK (auth.uid() = user_id AND is_member_of(auth.uid(), organization_id));

-- videos
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
CREATE POLICY "Users can update their own videos" ON public.videos FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid() AND is_member_of(auth.uid(), organization_id));
