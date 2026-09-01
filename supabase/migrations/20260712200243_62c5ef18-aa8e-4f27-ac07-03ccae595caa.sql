
-- Hot path: SLO baseline / duration_stats / consecutive error detection
-- Filtra por (source, status='success', created_at) e ordena por created_at DESC
CREATE INDEX IF NOT EXISTS idx_maintenance_runs_source_status_created
  ON public.maintenance_runs (source, status, created_at DESC);

-- Hot path: dedupe de notificações slo_regression (event_type + new_status + created_at)
CREATE INDEX IF NOT EXISTS idx_notifications_event_status_created
  ON public.notifications (event_type, new_status, created_at DESC)
  WHERE event_type IN ('slo_regression', 'maintenance_failure', 'maintenance_failure_critical', 'audit_alert');

-- Hot path: cleanup de notificações lidas antigas
CREATE INDEX IF NOT EXISTS idx_notifications_read_created
  ON public.notifications (created_at)
  WHERE read = true;

-- Hot path: cleanup por organização (audit_log)
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
  ON public.audit_log (organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

ANALYZE public.maintenance_runs;
ANALYZE public.notifications;
ANALYZE public.audit_log;
