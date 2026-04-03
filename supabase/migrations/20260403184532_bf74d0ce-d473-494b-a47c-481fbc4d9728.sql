-- Attach trigger for new OS creation notifications
CREATE TRIGGER trg_notify_os_created
  AFTER INSERT ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_created();

-- Attach trigger for OS status change notifications
CREATE TRIGGER trg_notify_os_status_change
  AFTER UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_os_status_change();