-- Create AI Usage Log table
CREATE TABLE public.ai_usage_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    feature_name TEXT NOT NULL, -- e.g., 'mockup-ai', 'asset-ocr'
    model_name TEXT NOT NULL,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    cost_estimate NUMERIC(10, 6) DEFAULT 0, -- Estimated cost in USD
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add quota to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS ai_monthly_quota NUMERIC(10, 2) DEFAULT 10.00; -- Default $10 quota

-- Enable RLS
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Policies for ai_usage_log
CREATE POLICY "Admins can view their organization AI usage" 
ON public.ai_usage_log 
FOR SELECT 
USING (public.has_any_role(auth.uid(), organization_id, ARRAY['owner'::app_role, 'admin'::app_role]));

-- Index for performance
CREATE INDEX idx_ai_usage_org_date ON public.ai_usage_log (organization_id, created_at DESC);

-- Function to check AI quota
CREATE OR REPLACE FUNCTION public.check_ai_quota(_org_id UUID, _required_cost NUMERIC DEFAULT 0)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quota NUMERIC;
    v_spent NUMERIC;
BEGIN
    SELECT ai_monthly_quota INTO v_quota FROM public.organizations WHERE id = _org_id;
    
    SELECT COALESCE(SUM(cost_estimate), 0) INTO v_spent 
    FROM public.ai_usage_log 
    WHERE organization_id = _org_id 
      AND created_at >= date_trunc('month', now());

    RETURN (v_spent + _required_cost) <= v_quota;
END;
$$;
