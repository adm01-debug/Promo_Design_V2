-- Magic Up — estilos/presets gerenciáveis por organização (Item 8 do backlog).
-- Cada organização pode criar seus próprios presets de estilo visual para o
-- gerador de imagens e para a fila de batch jobs. Os 8 estilos padrão continuam
-- no código (STYLE_PROMPT na edge magic-up-jobs) e são mesclados com estes na UI.
--
-- Design:
--   * magic_up_styles (1 linha por preset da org) com slug único por organização
--     (o slug é o valor salvo em magic_up_jobs.style quando o job usa um preset
--     customizado) + prompt técnico usado pela edge ao gerar a imagem.
--   * RLS fechado: membros da organização (is_member_of) gerenciam os presets
--     da própria org; service_role via policy autenticada normal.

CREATE TABLE IF NOT EXISTS public.magic_up_styles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug           text NOT NULL CHECK (
    slug ~ '^[a-z0-9][a-z0-9-]*$' AND char_length(slug) BETWEEN 1 AND 40
  ),
  name           text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  emoji          text NOT NULL DEFAULT '🎨',
  prompt         text NOT NULL CHECK (char_length(prompt) BETWEEN 3 AND 1000),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_magic_up_styles_org_slug UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_magic_up_styles_org_name
  ON public.magic_up_styles (organization_id, name);

ALTER TABLE public.magic_up_styles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.magic_up_styles FROM PUBLIC, anon;
GRANT ALL ON TABLE public.magic_up_styles TO authenticated;
GRANT ALL ON TABLE public.magic_up_styles TO service_role;

CREATE POLICY "Members can view own org magic up styles"
  ON public.magic_up_styles FOR SELECT TO authenticated
  USING (public.is_member_of(auth.uid(), organization_id));

CREATE POLICY "Members can insert own org magic up styles"
  ON public.magic_up_styles FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of(auth.uid(), organization_id));

CREATE POLICY "Members can update own org magic up styles"
  ON public.magic_up_styles FOR UPDATE TO authenticated
  USING (public.is_member_of(auth.uid(), organization_id))
  WITH CHECK (public.is_member_of(auth.uid(), organization_id));

CREATE POLICY "Members can delete own org magic up styles"
  ON public.magic_up_styles FOR DELETE TO authenticated
  USING (public.is_member_of(auth.uid(), organization_id));

CREATE TRIGGER trg_magic_up_styles_updated_at
  BEFORE UPDATE ON public.magic_up_styles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();