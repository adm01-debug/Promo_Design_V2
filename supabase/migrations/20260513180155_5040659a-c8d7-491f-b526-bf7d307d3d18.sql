-- Add lock_version and deleted_at to service_orders
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS lock_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create function to handle optimistic locking
CREATE OR REPLACE FUNCTION public.handle_optimistic_locking()
RETURNS TRIGGER AS $$
BEGIN
  -- If lock_version is provided, it must match the current one
  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.lock_version IS DISTINCT FROM OLD.lock_version) THEN
      RAISE EXCEPTION 'Concurrency conflict: current version is %, but client provided %', OLD.lock_version, NEW.lock_version;
    END IF;
    
    -- Increment version automatically
    NEW.lock_version = OLD.lock_version + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to service_orders
DROP TRIGGER IF EXISTS tr_service_orders_optimistic_locking ON public.service_orders;
CREATE TRIGGER tr_service_orders_optimistic_locking
BEFORE UPDATE ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_optimistic_locking();

-- Update existing records to have a version if they don't
UPDATE public.service_orders SET lock_version = 1 WHERE lock_version IS NULL;

-- Update RLS to hide soft-deleted records
-- First, list existing policies to ensure we don't duplicate or conflict
-- (Usually we'd just replace them)

DROP POLICY IF EXISTS "Users can view their own service orders" ON public.service_orders;
CREATE POLICY "Users can view their own service orders" 
ON public.service_orders 
FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update their own service orders" ON public.service_orders;
CREATE POLICY "Users can update their own service orders" 
ON public.service_orders 
FOR UPDATE 
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Index for performance on queries filtering by deleted_at
CREATE INDEX IF NOT EXISTS idx_service_orders_active ON public.service_orders (user_id) WHERE deleted_at IS NULL;
