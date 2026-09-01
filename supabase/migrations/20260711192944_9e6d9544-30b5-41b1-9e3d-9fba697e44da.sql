
-- Formato de slug (URL-safe: lowercase alfanum + hífen, sem hífen inicial/final)
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_slug_format
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$')
  NOT VALID;
ALTER TABLE public.organizations VALIDATE CONSTRAINT organizations_slug_format;

-- Formato de e-mail em clients (permite NULL/vazio)
ALTER TABLE public.clients
  ADD CONSTRAINT clients_email_format
  CHECK (email IS NULL OR email = '' OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  NOT VALID;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_email_format;
