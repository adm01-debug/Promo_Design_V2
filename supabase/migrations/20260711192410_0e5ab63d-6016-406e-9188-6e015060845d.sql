
-- Validar as 18 CHECK constraints NOT VALID (zero violações confirmadas)
ALTER TABLE public.assets VALIDATE CONSTRAINT assets_name_length;
ALTER TABLE public.assets VALIDATE CONSTRAINT assets_description_length;
ALTER TABLE public.assets VALIDATE CONSTRAINT assets_file_path_length;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_name_length;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_company_length;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_email_length;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_phone_length;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_document_length;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_address_length;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_city_length;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_state_length;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_zip_length;
ALTER TABLE public.clients VALIDATE CONSTRAINT clients_notes_length;
ALTER TABLE public.catalog_products VALIDATE CONSTRAINT catalog_products_name_length;
ALTER TABLE public.catalog_products VALIDATE CONSTRAINT catalog_products_sku_length;
ALTER TABLE public.catalog_products VALIDATE CONSTRAINT catalog_products_material_length;
ALTER TABLE public.organizations VALIDATE CONSTRAINT organizations_name_length;
ALTER TABLE public.organizations VALIDATE CONSTRAINT organizations_slug_length;

-- Remover índices redundantes em service_orders:
-- idx_service_orders_status coberto por idx_service_orders_user_status
-- idx_service_orders_created_at coberto por idx_service_orders_user_created
DROP INDEX IF EXISTS public.idx_service_orders_status;
DROP INDEX IF EXISTS public.idx_service_orders_created_at;
