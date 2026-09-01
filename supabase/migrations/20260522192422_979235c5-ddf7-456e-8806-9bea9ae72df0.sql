-- Create videos table
CREATE TABLE public.videos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) NOT NULL,
    client_id UUID REFERENCES public.clients(id),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    
    name TEXT NOT NULL,
    product_name TEXT,
    product_sku TEXT,
    
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    aspect_ratio TEXT NOT NULL,
    duration INTEGER NOT NULL, -- in seconds
    style TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view videos in their organization"
ON public.videos FOR SELECT
USING (
    public.is_member_of(auth.uid(), organization_id)
);

CREATE POLICY "Users can create videos in their organization"
ON public.videos FOR INSERT
WITH CHECK (
    public.is_member_of(auth.uid(), organization_id)
);

CREATE POLICY "Users can update their own videos"
ON public.videos FOR UPDATE
USING (
    created_by = auth.uid()
);

CREATE POLICY "Users can delete their own videos"
ON public.videos FOR DELETE
USING (
    created_by = auth.uid()
);

-- Triggers for updated_at
CREATE TRIGGER update_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_videos_org_id ON public.videos(organization_id);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX idx_videos_product_sku ON public.videos(product_sku);
