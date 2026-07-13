-- Dropping the parent partitioned index cascades to all attached partition indexes
DROP INDEX IF EXISTS public.idx_audit_log_org_created;

-- Exact duplicate on notifications
DROP INDEX IF EXISTS public.idx_notifications_user_unread_created;