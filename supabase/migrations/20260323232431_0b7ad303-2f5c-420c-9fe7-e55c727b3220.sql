
-- Re-create triggers that were dropped
CREATE OR REPLACE TRIGGER trg_os_status_change
  AFTER UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_status_change();

CREATE OR REPLACE TRIGGER trg_os_created
  AFTER INSERT ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_created();
