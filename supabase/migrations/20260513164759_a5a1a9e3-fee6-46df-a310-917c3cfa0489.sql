-- Ensure ai_usage_log exists
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  feature_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_estimate NUMERIC(10, 6) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on usage log
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Only members can view their org's usage
CREATE POLICY "Members can view their org's ai usage"
ON public.ai_usage_log
FOR SELECT
USING (is_member_of(auth.uid(), organization_id));

-- Function to check if an organization has monthly quota
-- For now, we set a hard limit of 1000 calls per month per org
CREATE OR REPLACE FUNCTION public.check_ai_quota(_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_limit INTEGER := 1000; -- Default monthly limit
BEGIN
  SELECT count(*) INTO v_count
  FROM public.ai_usage_log
  WHERE organization_id = _org_id
    AND created_at >= date_trunc('month', now());
    
  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
