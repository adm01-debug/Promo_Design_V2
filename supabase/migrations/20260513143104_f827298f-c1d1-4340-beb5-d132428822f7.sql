-- Add lock_version column to assets
ALTER TABLE public.assets ADD COLUMN lock_version INTEGER NOT NULL DEFAULT 1;

-- Add lock_version column to service_orders
ALTER TABLE public.service_orders ADD COLUMN lock_version INTEGER NOT NULL DEFAULT 1;

-- Create function to increment lock_version
CREATE OR REPLACE FUNCTION public.increment_lock_version_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lock_version = OLD.lock_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for lock_version increment
CREATE TRIGGER increment_assets_lock_version
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.increment_lock_version_column();

CREATE TRIGGER increment_service_orders_lock_version
BEFORE UPDATE ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.increment_lock_version_column();
