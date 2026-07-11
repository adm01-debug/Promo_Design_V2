
-- Assets
ALTER TABLE public.assets
  ADD CONSTRAINT assets_name_length CHECK (char_length(name) BETWEEN 1 AND 300) NOT VALID,
  ADD CONSTRAINT assets_description_length CHECK (description IS NULL OR char_length(description) <= 2000) NOT VALID,
  ADD CONSTRAINT assets_file_path_length CHECK (char_length(file_path) BETWEEN 1 AND 1000) NOT VALID;

-- Clients
ALTER TABLE public.clients
  ADD CONSTRAINT clients_name_length CHECK (char_length(name) BETWEEN 1 AND 300) NOT VALID,
  ADD CONSTRAINT clients_company_length CHECK (company IS NULL OR char_length(company) <= 300) NOT VALID,
  ADD CONSTRAINT clients_email_length CHECK (email IS NULL OR char_length(email) <= 320) NOT VALID,
  ADD CONSTRAINT clients_phone_length CHECK (phone IS NULL OR char_length(phone) <= 40) NOT VALID,
  ADD CONSTRAINT clients_document_length CHECK (document IS NULL OR char_length(document) <= 40) NOT VALID,
  ADD CONSTRAINT clients_address_length CHECK (address IS NULL OR char_length(address) <= 500) NOT VALID,
  ADD CONSTRAINT clients_city_length CHECK (city IS NULL OR char_length(city) <= 120) NOT VALID,
  ADD CONSTRAINT clients_state_length CHECK (state IS NULL OR char_length(state) <= 120) NOT VALID,
  ADD CONSTRAINT clients_zip_length CHECK (zip IS NULL OR char_length(zip) <= 20) NOT VALID,
  ADD CONSTRAINT clients_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000) NOT VALID;

-- Catalog products
ALTER TABLE public.catalog_products
  ADD CONSTRAINT catalog_products_name_length CHECK (char_length(name) BETWEEN 1 AND 300) NOT VALID,
  ADD CONSTRAINT catalog_products_sku_length CHECK (sku IS NULL OR char_length(sku) <= 100) NOT VALID,
  ADD CONSTRAINT catalog_products_material_length CHECK (material IS NULL OR char_length(material) <= 200) NOT VALID;

-- Organizations
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_name_length CHECK (char_length(name) BETWEEN 1 AND 200) NOT VALID,
  ADD CONSTRAINT organizations_slug_length CHECK (slug IS NULL OR char_length(slug) <= 100) NOT VALID;
