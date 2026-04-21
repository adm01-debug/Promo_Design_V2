ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS art_asset_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_service_orders_art_asset_id ON public.service_orders (art_asset_id);