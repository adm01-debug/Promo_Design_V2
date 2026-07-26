-- 1) Enum de status da fila de geração
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'video_job_status') THEN
    CREATE TYPE public.video_job_status AS ENUM ('queued', 'generating', 'ready', 'failed', 'cancelled');
  END IF;
END
$$;

-- 2) Novas colunas
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS status public.video_job_status NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS prompt text,
  ADD COLUMN IF NOT EXISTS motion_presets text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_job_id text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 3) video_url deixa de ser obrigatório enquanto o job não termina
ALTER TABLE public.videos ALTER COLUMN video_url DROP NOT NULL;

-- 4) Consistência de estado via trigger (CHECK deve ser imutável; aqui a regra é puramente
--    dependente da própria linha, mas mantemos em trigger para permitir evolução segura)
CREATE OR REPLACE FUNCTION public.tg_videos_validate_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ready' AND (NEW.video_url IS NULL OR length(btrim(NEW.video_url)) = 0) THEN
    RAISE EXCEPTION 'ERR_VIDEO_STATUS: status "ready" exige video_url preenchido'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'failed' AND (NEW.error_message IS NULL OR length(btrim(NEW.error_message)) = 0) THEN
    RAISE EXCEPTION 'ERR_VIDEO_STATUS: status "failed" exige error_message preenchido'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'generating' AND NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;
    IF NEW.status IN ('ready', 'failed', 'cancelled') AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_videos_validate_status ON public.videos;
CREATE TRIGGER trg_videos_validate_status
  BEFORE INSERT OR UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.tg_videos_validate_status();

-- 5) Índice parcial para polling de jobs ativos
CREATE INDEX IF NOT EXISTS idx_videos_active_jobs
  ON public.videos (organization_id, created_at DESC)
  WHERE status IN ('queued', 'generating');

-- 6) Grants (reafirmação explícita — políticas existentes permanecem inalteradas)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;