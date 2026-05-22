-- Fix SECURITY DEFINER function risks
-- Revoke all on all functions in public schema from public/anon
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public, anon;

-- Re-grant to authenticated and service_role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Ensure RLS on log tables
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Basic policies for usage logs (authenticated can insert, admins can view)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_log' AND policyname = 'Users can insert their own usage logs') THEN
        CREATE POLICY "Users can insert their own usage logs" ON public.ai_usage_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_usage_log' AND policyname = 'Admins can view usage logs') THEN
        CREATE POLICY "Admins can view usage logs" ON public.ai_usage_log FOR SELECT USING (EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));
    END IF;
END $$;
