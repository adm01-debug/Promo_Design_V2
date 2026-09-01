-- Create a helper in public schema to check MFA status from auth.jwt()
CREATE OR REPLACE FUNCTION public.is_mfa_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  -- 'aal' (Authenticator Assurance Level) in JWT metadata:
  -- aal1 = single factor
  -- aal2 = multi factor
  RETURN (auth.jwt() ->> 'aal') = 'aal2';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
