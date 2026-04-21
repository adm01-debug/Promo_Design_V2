import { supabase } from "@/integrations/supabase/client";

export async function getAssetSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from("assets").createSignedUrl(filePath, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function downloadAssetAsFile(filePath: string, name: string, mimeType?: string | null): Promise<File | null> {
  const url = await getAssetSignedUrl(filePath);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const blob = await res.blob();
  return new File([blob], name, { type: mimeType ?? blob.type });
}
