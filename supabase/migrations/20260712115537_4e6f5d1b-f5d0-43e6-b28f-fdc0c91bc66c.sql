
CREATE OR REPLACE FUNCTION public.notify_maintenance_failure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_msg TEXT;
BEGIN
  IF NEW.status <> 'error' THEN
    RETURN NEW;
  END IF;

  v_msg := left(COALESCE(NEW.error_message, 'Erro desconhecido'), 200);

  FOR v_admin IN
    SELECT DISTINCT user_id
    FROM public.organization_members
    WHERE role IN ('owner','admin')
  LOOP
    INSERT INTO public.notifications (
      user_id, os_id, os_number, product_name, old_status, new_status, event_type
    ) VALUES (
      v_admin.user_id,
      NULL,
      'MAINT-' || substr(NEW.id::text, 1, 8),
      'Falha na limpeza automática',
      NEW.source,
      v_msg,
      'maintenance_failure'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintenance_failure_notify ON public.maintenance_runs;
CREATE TRIGGER trg_maintenance_failure_notify
AFTER INSERT ON public.maintenance_runs
FOR EACH ROW
EXECUTE FUNCTION public.notify_maintenance_failure();
