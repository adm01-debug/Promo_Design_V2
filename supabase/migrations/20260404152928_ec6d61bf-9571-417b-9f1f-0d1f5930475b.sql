
-- UNIQUE constraint on os_number per user (allows same number across different users)
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_user_os_number_unique UNIQUE (user_id, os_number);

-- Performance indices
CREATE INDEX IF NOT EXISTS idx_service_orders_user_status ON public.service_orders (user_id, status);
CREATE INDEX IF NOT EXISTS idx_service_orders_user_created ON public.service_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_products_user_category ON public.catalog_products (user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_magicup_history_user_created ON public.magicup_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mockup_drafts_user_updated ON public.mockup_drafts (user_id, updated_at DESC);
