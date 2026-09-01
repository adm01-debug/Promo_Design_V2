
CREATE OR REPLACE FUNCTION public.notify_maintenance_failure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin RECORD;
  v_msg TEXT;
  v_prev_status TEXT;
  v_consecutive_count INT := 1;
  v_event_type TEXT;
  v_prefix TEXT;
BEGIN
  IF NEW.status <> 'error' THEN
    RETURN NEW;
  END IF;

  -- Count consecutive errors (including current) from same source, most recent runs
  SELECT COUNT(*) INTO v_consecutive_count
  FROM (
    SELECT status
    FROM public.maintenance_runs
    WHERE source = NEW.source
      AND id <> NEW.id
    ORDER BY created_at DESC
    LIMIT 5
  ) recent
  WHERE status = 'error';
  v_consecutive_count := v_consecutive_count + 1;

  -- Escalate if 2+ consecutive failures
  IF v_consecutive_count >= 2 THEN
    v_event_type := 'maintenance_failure_critical';
    v_prefix := '[CRÍTICO ' || v_consecutive_count || 'x] ';
  ELSE
    v_event_type := 'maintenance_failure';
    v_prefix := '';
  END IF;

  v_msg := v_prefix || left(COALESCE(NEW.error_message, 'Erro desconhecido'), 180);

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
      CASE WHEN v_consecutive_count >= 2
        THEN 'Falha CONSECUTIVA na manutenção (' || v_consecutive_count || 'x)'
        ELSE 'Falha na limpeza automática'
      END,
      NEW.source,
      v_msg,
      v_event_type
    );
  END LOOP;

  RETURN NEW;
END;
$function$;
