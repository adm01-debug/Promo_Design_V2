
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS audit_retention_days integer NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS notifications_retention_days integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS status_audit_retention_days integer NOT NULL DEFAULT 365;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_audit_retention_range CHECK (audit_retention_days BETWEEN 30 AND 3650),
  ADD CONSTRAINT organizations_notifications_retention_range CHECK (notifications_retention_days BETWEEN 7 AND 3650),
  ADD CONSTRAINT organizations_status_audit_retention_range CHECK (status_audit_retention_days BETWEEN 30 AND 3650);
