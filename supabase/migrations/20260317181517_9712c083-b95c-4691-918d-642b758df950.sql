-- Create service_orders table
CREATE TABLE public.service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  os_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  client_name TEXT NOT NULL,
  client_company TEXT,
  client_phone TEXT,
  client_email TEXT,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_material TEXT,
  product_colors TEXT,
  technique TEXT NOT NULL,
  area_name TEXT,
  area_width TEXT,
  area_height TEXT,
  area_shape TEXT,
  art_colors TEXT,
  art_dpi TEXT,
  art_file TEXT,
  art_file_data_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  observations TEXT,
  mockup_image_url TEXT,
  identificacao_caixa TEXT,
  material_evento BOOLEAN DEFAULT FALSE,
  aprovar_primeira_peca BOOLEAN DEFAULT FALSE,
  qtd_compra TEXT,
  qtd_liberada TEXT,
  faz_parte_kit BOOLEAN DEFAULT FALSE,
  gravacao_detalhe TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own service orders"
  ON public.service_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own service orders"
  ON public.service_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service orders"
  ON public.service_orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service orders"
  ON public.service_orders FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();