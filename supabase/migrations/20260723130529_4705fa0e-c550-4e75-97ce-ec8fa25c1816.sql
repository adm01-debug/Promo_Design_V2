
-- ============================================================
-- FASE 1 · Inteligência de Padrões de Design por Cliente
-- ============================================================

-- 1) TABELA
CREATE TABLE public.client_design_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  logo_scale_p50 numeric(6,4) NULL,
  logo_scale_p90 numeric(6,4) NULL,
  logo_x_percent_p50 numeric(6,2) NULL,
  logo_y_percent_p50 numeric(6,2) NULL,
  opacity_p50 numeric(5,2) NULL,
  preferred_blend_modes jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferred_surface_types jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_size integer NOT NULL DEFAULT 0,
  confidence numeric(4,3) NOT NULL DEFAULT 0,
  last_computed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_design_patterns_confidence_range CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT client_design_patterns_sample_nonneg CHECK (sample_size >= 0)
);

-- Unicidade: uma linha por (org, client). Trata NULL como "padrão da organização".
CREATE UNIQUE INDEX client_design_patterns_org_client_key
  ON public.client_design_patterns (organization_id, client_id)
  WHERE client_id IS NOT NULL;

CREATE UNIQUE INDEX client_design_patterns_org_only_key
  ON public.client_design_patterns (organization_id)
  WHERE client_id IS NULL;

CREATE INDEX client_design_patterns_client_idx
  ON public.client_design_patterns (client_id)
  WHERE client_id IS NOT NULL;

-- 2) GRANTS (obrigatório antes de RLS)
GRANT SELECT ON public.client_design_patterns TO authenticated;
GRANT ALL   ON public.client_design_patterns TO service_role;

-- 3) RLS
ALTER TABLE public.client_design_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read org patterns"
  ON public.client_design_patterns
  FOR SELECT
  TO authenticated
  USING (public.is_member_of(auth.uid(), organization_id));

-- Escrita apenas via service_role (edge functions / RPC SECDEF).
-- Nenhuma policy INSERT/UPDATE/DELETE para authenticated — bloqueado por padrão.

-- 4) TRIGGER updated_at
CREATE OR REPLACE FUNCTION public.tg_client_design_patterns_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tg_client_design_patterns_updated_at() FROM PUBLIC;

CREATE TRIGGER trg_client_design_patterns_updated_at
  BEFORE UPDATE ON public.client_design_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_client_design_patterns_updated_at();

-- 5) RPC — recomputa padrões a partir de mockup_drafts
CREATE OR REPLACE FUNCTION public.recompute_client_design_patterns(
  p_organization_id uuid,
  p_client_id uuid DEFAULT NULL
)
RETURNS public.client_design_patterns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.client_design_patterns;
  v_scale_p50 numeric;
  v_scale_p90 numeric;
  v_x_p50 numeric;
  v_y_p50 numeric;
  v_op_p50 numeric;
  v_blends jsonb;
  v_surfaces jsonb;
  v_sample int;
  v_confidence numeric;
BEGIN
  -- Auth: service_role sempre passa; usuário precisa ser membro da org.
  IF auth.role() <> 'service_role'
     AND NOT public.is_member_of(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  -- Agrega editor_state dos rascunhos da organização.
  -- (Filtro por client_id via product_sku entrará quando houver linkagem mockup↔cliente.)
  WITH src AS (
    SELECT
      NULLIF((editor_state->'placement'->>'scale'), '')::numeric      AS scale,
      NULLIF((editor_state->'placement'->>'x'), '')::numeric          AS x_px,
      NULLIF((editor_state->'placement'->>'y'), '')::numeric          AS y_px,
      NULLIF((editor_state->>'logoOpacity'), '')::numeric             AS opacity,
      NULLIF((editor_state->>'blendMode'), '')                        AS blend_mode,
      NULLIF((editor_state->>'surfaceType'), '')                      AS surface_type
    FROM public.mockup_drafts
    WHERE organization_id = p_organization_id
      AND editor_state IS NOT NULL
  ),
  stats AS (
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY scale)  FILTER (WHERE scale IS NOT NULL)   AS scale_p50,
      percentile_cont(0.9) WITHIN GROUP (ORDER BY scale)  FILTER (WHERE scale IS NOT NULL)   AS scale_p90,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY x_px)   FILTER (WHERE x_px IS NOT NULL)    AS x_p50,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY y_px)   FILTER (WHERE y_px IS NOT NULL)    AS y_p50,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY opacity) FILTER (WHERE opacity IS NOT NULL) AS opacity_p50,
      count(*) FILTER (WHERE scale IS NOT NULL OR blend_mode IS NOT NULL) AS sample_size
    FROM src
  ),
  blend_counts AS (
    SELECT COALESCE(jsonb_object_agg(blend_mode, freq), '{}'::jsonb) AS blends
    FROM (
      SELECT blend_mode,
             ROUND((count(*)::numeric / NULLIF(sum(count(*)) OVER (), 0))::numeric, 3) AS freq
      FROM src
      WHERE blend_mode IS NOT NULL
      GROUP BY blend_mode
    ) b
  ),
  surface_counts AS (
    SELECT COALESCE(jsonb_object_agg(surface_type, freq), '{}'::jsonb) AS surfaces
    FROM (
      SELECT surface_type,
             ROUND((count(*)::numeric / NULLIF(sum(count(*)) OVER (), 0))::numeric, 3) AS freq
      FROM src
      WHERE surface_type IS NOT NULL
      GROUP BY surface_type
    ) s
  )
  SELECT stats.scale_p50, stats.scale_p90, stats.x_p50, stats.y_p50, stats.opacity_p50,
         blend_counts.blends, surface_counts.surfaces, COALESCE(stats.sample_size, 0)
    INTO v_scale_p50, v_scale_p90, v_x_p50, v_y_p50, v_op_p50, v_blends, v_surfaces, v_sample
  FROM stats CROSS JOIN blend_counts CROSS JOIN surface_counts;

  -- x/y em px do canvas virtual (1000). Convertemos para percentual.
  v_x_p50 := CASE WHEN v_x_p50 IS NULL THEN NULL ELSE ROUND((v_x_p50 / 1000.0) * 100, 2) END;
  v_y_p50 := CASE WHEN v_y_p50 IS NULL THEN NULL ELSE ROUND((v_y_p50 / 1000.0) * 100, 2) END;

  -- Confiança: cresce assintoticamente com o tamanho da amostra (30 = ~1.0).
  v_confidence := LEAST(1.0, (v_sample::numeric / 30.0));

  -- UPSERT respeitando o par (org, client) — client NULL = padrão da organização.
  IF p_client_id IS NULL THEN
    INSERT INTO public.client_design_patterns AS t (
      organization_id, client_id,
      logo_scale_p50, logo_scale_p90, logo_x_percent_p50, logo_y_percent_p50, opacity_p50,
      preferred_blend_modes, preferred_surface_types, sample_size, confidence, last_computed_at
    )
    SELECT p_organization_id, NULL,
           v_scale_p50, v_scale_p90, v_x_p50, v_y_p50, v_op_p50,
           v_blends, v_surfaces, v_sample, v_confidence, now()
    ON CONFLICT (organization_id) WHERE client_id IS NULL
    DO UPDATE SET
      logo_scale_p50 = EXCLUDED.logo_scale_p50,
      logo_scale_p90 = EXCLUDED.logo_scale_p90,
      logo_x_percent_p50 = EXCLUDED.logo_x_percent_p50,
      logo_y_percent_p50 = EXCLUDED.logo_y_percent_p50,
      opacity_p50 = EXCLUDED.opacity_p50,
      preferred_blend_modes = EXCLUDED.preferred_blend_modes,
      preferred_surface_types = EXCLUDED.preferred_surface_types,
      sample_size = EXCLUDED.sample_size,
      confidence = EXCLUDED.confidence,
      last_computed_at = EXCLUDED.last_computed_at
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.client_design_patterns AS t (
      organization_id, client_id,
      logo_scale_p50, logo_scale_p90, logo_x_percent_p50, logo_y_percent_p50, opacity_p50,
      preferred_blend_modes, preferred_surface_types, sample_size, confidence, last_computed_at
    )
    SELECT p_organization_id, p_client_id,
           v_scale_p50, v_scale_p90, v_x_p50, v_y_p50, v_op_p50,
           v_blends, v_surfaces, v_sample, v_confidence, now()
    ON CONFLICT (organization_id, client_id) WHERE client_id IS NOT NULL
    DO UPDATE SET
      logo_scale_p50 = EXCLUDED.logo_scale_p50,
      logo_scale_p90 = EXCLUDED.logo_scale_p90,
      logo_x_percent_p50 = EXCLUDED.logo_x_percent_p50,
      logo_y_percent_p50 = EXCLUDED.logo_y_percent_p50,
      opacity_p50 = EXCLUDED.opacity_p50,
      preferred_blend_modes = EXCLUDED.preferred_blend_modes,
      preferred_surface_types = EXCLUDED.preferred_surface_types,
      sample_size = EXCLUDED.sample_size,
      confidence = EXCLUDED.confidence,
      last_computed_at = EXCLUDED.last_computed_at
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recompute_client_design_patterns(uuid, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.recompute_client_design_patterns(uuid, uuid) TO authenticated, service_role;

COMMENT ON TABLE public.client_design_patterns IS
  'Padrões de design agregados por organização/cliente (percentis de escala, posição, blend, superfície).';
COMMENT ON FUNCTION public.recompute_client_design_patterns(uuid, uuid) IS
  'Recomputa padrões de design da organização (client_id opcional). Verifica membership; escrita via SECDEF.';
