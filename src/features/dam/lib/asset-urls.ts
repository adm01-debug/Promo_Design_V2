import { supabase } from "@/integrations/supabase/client";

/**
 * In-memory cache for signed URLs. Reuses URL while >5min of validity remain.
 * Avoids round-trips when reopening the picker repeatedly.
 */
const SAFETY_WINDOW_MS = 5 * 60 * 1000;
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Returns a signed URL for a private bucket asset.
 * Throws on failure (no silent null).
 */
export async function getAssetSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
  const cached = signedUrlCache.get(filePath);
  if (cached && cached.expiresAt - Date.now() > SAFETY_WINDOW_MS) {
    return cached.url;
  }
  const { data, error } = await supabase.storage
    .from("assets")
    .createSignedUrl(filePath, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error("Asset não encontrado ou sem permissão");
  }
  signedUrlCache.set(filePath, {
    url: data.signedUrl,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return data.signedUrl;
}

/**
 * Downloads a private bucket asset as a File. Throws with a translated message
 * distinguishing not-found/permission, HTTP, and network errors.
 */
export async function downloadAssetAsFile(
  filePath: string,
  name: string,
  mimeType?: string | null,
): Promise<File> {
  const url = await getAssetSignedUrl(filePath);
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    // Invalidate cache in case URL went stale mid-flight
    signedUrlCache.delete(filePath);
    throw new Error("Sem conexão para baixar o asset");
  }
  if (!res.ok) {
    if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404) {
      signedUrlCache.delete(filePath);
    }
    throw new Error(`Falha ao baixar arquivo (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  return new File([blob], name, { type: mimeType ?? blob.type });
}
