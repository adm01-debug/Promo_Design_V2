-- Magic Up history table
CREATE TABLE public.magicup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  product_name TEXT,
  product_sku TEXT,
  style TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.magicup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own magicup history" ON public.magicup_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own magicup history" ON public.magicup_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own magicup history" ON public.magicup_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own magicup history" ON public.magicup_history FOR DELETE USING (auth.uid() = user_id);

-- Mockup drafts table
CREATE TABLE public.mockup_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_name TEXT,
  product_sku TEXT,
  thumbnail_url TEXT,
  editor_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mockup_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts" ON public.mockup_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own drafts" ON public.mockup_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drafts" ON public.mockup_drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drafts" ON public.mockup_drafts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_mockup_drafts_updated_at
  BEFORE UPDATE ON public.mockup_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for art uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('art-uploads', 'art-uploads', true);

CREATE POLICY "Users can upload art files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'art-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view art files" ON storage.objects FOR SELECT USING (bucket_id = 'art-uploads');
CREATE POLICY "Users can update own art files" ON storage.objects FOR UPDATE USING (bucket_id = 'art-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own art files" ON storage.objects FOR DELETE USING (bucket_id = 'art-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);