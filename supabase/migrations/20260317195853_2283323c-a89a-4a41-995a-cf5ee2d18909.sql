
-- Notifications table for OS status change history
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  os_id uuid REFERENCES public.service_orders(id) ON DELETE CASCADE,
  os_number text NOT NULL,
  product_name text NOT NULL DEFAULT '',
  old_status text,
  new_status text NOT NULL,
  event_type text NOT NULL DEFAULT 'status_change',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger to auto-create notification on OS status change
CREATE OR REPLACE FUNCTION public.notify_os_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, os_id, os_number, product_name, old_status, new_status, event_type)
    VALUES (NEW.user_id, NEW.id, NEW.os_number, NEW.product_name, OLD.status, NEW.status, 'status_change');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_os_status_change
  AFTER UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_status_change();

-- Also notify on new OS creation
CREATE OR REPLACE FUNCTION public.notify_os_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, os_id, os_number, product_name, old_status, new_status, event_type)
  VALUES (NEW.user_id, NEW.id, NEW.os_number, NEW.product_name, NULL, NEW.status, 'os_created');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_os_created
  AFTER INSERT ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_created();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
