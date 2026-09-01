-- ai_usage_log: is_member_of já cobre admins (admin é membro)
DROP POLICY IF EXISTS "Admins can view their organization AI usage" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Admins can view usage logs" ON public.ai_usage_log;

-- audit_log: a policy "Org members can view audit log" é superset (cobre org_id NULL + membros)
DROP POLICY IF EXISTS "Users can view audit logs for their organization" ON public.audit_log;