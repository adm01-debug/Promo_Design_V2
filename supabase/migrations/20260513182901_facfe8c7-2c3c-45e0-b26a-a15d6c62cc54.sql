-- Fix security warnings for the audit function
ALTER FUNCTION public.audit_trigger_func() SET search_path = public;

-- Revoke public execution of the trigger function for security
REVOKE EXECUTE ON FUNCTION public.audit_trigger_func() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_trigger_func() TO postgres, authenticated, service_role;