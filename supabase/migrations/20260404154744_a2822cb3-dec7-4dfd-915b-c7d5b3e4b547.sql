
-- Create audit log table
CREATE TABLE public.status_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_log_service_order ON public.status_audit_log(service_order_id);
CREATE INDEX idx_audit_log_user ON public.status_audit_log(user_id);
CREATE INDEX idx_audit_log_changed_at ON public.status_audit_log(changed_at DESC);

-- Enable RLS
ALTER TABLE public.status_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.status_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System inserts via trigger (SECURITY DEFINER), so allow insert for authenticated
CREATE POLICY "System can insert audit logs"
  ON public.status_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger function to log status changes
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log on INSERT (new order created)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.status_audit_log (service_order_id, user_id, old_status, new_status)
    VALUES (NEW.id, NEW.user_id, NULL, NEW.status);
    RETURN NEW;
  END IF;

  -- Log on UPDATE only if status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.status_audit_log (service_order_id, user_id, old_status, new_status)
    VALUES (NEW.id, NEW.user_id, OLD.status, NEW.status);
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_log_status_change
  AFTER INSERT OR UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_status_change();
