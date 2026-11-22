import { supabase } from "@/integrations/supabase/client";

/**
 * Bucket privado onde a edge function `video-generate` arquiva o MP4 final.
 * As URLs do provedor expiram (`expires_at`), então `videos.video_url` guarda o
 * CAMINHO no bucket e é trocado por uma signed URL na hora de abrir/baixar.
 */
export const VIDEO_BUCKET = "videos";

/** Signed URL válida por 1h — suficiente para assistir/baixar. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Valores gravados antes desta mudança (e o fallback da edge quando o upload
 * falha) são URLs http(s) completas. Essas continuam funcionando como estão.
 */
export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Converte `videos.video_url` em uma URL utilizável pelo browser.
 * Caminho no bucket -> signed URL. URL http(s) -> devolvida sem alteração.
 * Devolve null quando não há valor ou a assinatura falha.
 */
export async function resolveVideoUrl(videoUrl: string | null | undefined): Promise<string | null> {
  if (!videoUrl) return null;
  if (isAbsoluteUrl(videoUrl)) return videoUrl;

  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(videoUrl, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
