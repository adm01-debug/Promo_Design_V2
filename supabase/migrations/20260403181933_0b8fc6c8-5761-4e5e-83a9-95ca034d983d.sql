
-- Product categories
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON public.product_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own categories" ON public.product_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.product_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.product_categories FOR DELETE USING (auth.uid() = user_id);

-- Catalog products
CREATE TABLE public.catalog_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  material TEXT,
  colors TEXT,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.catalog_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own products" ON public.catalog_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.catalog_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.catalog_products FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_catalog_products_user ON public.catalog_products(user_id);
CREATE INDEX idx_catalog_products_category ON public.catalog_products(category_id);
CREATE INDEX idx_catalog_products_name ON public.catalog_products USING gin(to_tsvector('portuguese', name));

-- Trigger for updated_at
CREATE TRIGGER update_catalog_products_updated_at
  BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
