-- Service orders indexes
CREATE INDEX IF NOT EXISTS idx_service_orders_os_number ON public.service_orders (os_number);
CREATE INDEX IF NOT EXISTS idx_service_orders_client_name ON public.service_orders (client_name);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders (status);
CREATE INDEX IF NOT EXISTS idx_service_orders_user_created ON public.service_orders (user_id, created_at DESC);

-- Catalog products indexes
CREATE INDEX IF NOT EXISTS idx_catalog_products_user ON public.catalog_products (user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_name ON public.catalog_products (name);
CREATE INDEX IF NOT EXISTS idx_catalog_products_category ON public.catalog_products (category_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read);

-- Mockup drafts indexes
CREATE INDEX IF NOT EXISTS idx_mockup_drafts_user ON public.mockup_drafts (user_id, updated_at DESC);

-- MagicUp history indexes
CREATE INDEX IF NOT EXISTS idx_magicup_history_user ON public.magicup_history (user_id, created_at DESC);