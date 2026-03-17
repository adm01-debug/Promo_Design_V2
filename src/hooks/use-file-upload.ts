import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useFileUpload() {
  const { user } = useAuth();

  const uploadFile = useCallback(
    async (file: File, folder?: string): Promise<string | null> => {
      if (!user) return null;

      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${folder ? folder + "/" : ""}${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("art-uploads")
        .upload(path, file, { upsert: true });

      if (error) {
        console.error("Upload error:", error);
        return null;
      }

      const { data } = supabase.storage
        .from("art-uploads")
        .getPublicUrl(path);

      return data.publicUrl;
    },
    [user]
  );

  return { uploadFile };
}
