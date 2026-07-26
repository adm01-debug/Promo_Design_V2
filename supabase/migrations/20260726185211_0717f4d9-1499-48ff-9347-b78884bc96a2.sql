ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS start_frame_url text,
  ADD COLUMN IF NOT EXISTS end_frame_url text,
  ADD COLUMN IF NOT EXISTS character_ref jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.videos.start_frame_url IS 'URL da imagem usada como primeiro frame (âncora inicial) da geração.';
COMMENT ON COLUMN public.videos.end_frame_url IS 'URL da imagem usada como último frame (âncora final) da geração.';
COMMENT ON COLUMN public.videos.character_ref IS 'Soul ID: referência de personagem (id, label, descrição) para consistência entre gerações.';

CREATE OR REPLACE FUNCTION public.tg_videos_validate_frames()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.start_frame_url IS NOT NULL AND NEW.start_frame_url !~ '^https?://' THEN
    RAISE EXCEPTION 'start_frame_url deve ser uma URL http(s) válida';
  END IF;
  IF NEW.end_frame_url IS NOT NULL AND NEW.end_frame_url !~ '^https?://' THEN
    RAISE EXCEPTION 'end_frame_url deve ser uma URL http(s) válida';
  END IF;
  IF NEW.character_ref IS NULL THEN
    NEW.character_ref := '{}'::jsonb;
  END IF;
  IF jsonb_typeof(NEW.character_ref) <> 'object' THEN
    RAISE EXCEPTION 'character_ref deve ser um objeto JSON';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_videos_validate_frames ON public.videos;
CREATE TRIGGER trg_videos_validate_frames
BEFORE INSERT OR UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.tg_videos_validate_frames();