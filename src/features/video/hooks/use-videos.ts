import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/use-organization";
import { toast } from "sonner";

export interface VideoEntry {
  id: string;
  organization_id: string;
  client_id?: string;
  created_by: string;
  name: string;
  product_name?: string;
  product_sku?: string;
  video_url: string;
  thumbnail_url?: string;
  aspect_ratio: string;
  duration: number;
  style?: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useVideos(options: { search?: string } = {}) {
  const { currentOrgId } = useOrganizations();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["videos", currentOrgId, options.search],
    queryFn: async () => {
      if (!currentOrgId) return [];

      let q = supabase
        .from("videos")
        .select("*")
        .eq("organization_id", currentOrgId)
        .order("created_at", { ascending: false });

      if (options.search) {
        q = q.or(
          `name.ilike.%${options.search}%,product_name.ilike.%${options.search}%,product_sku.ilike.%${options.search}%`,
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as VideoEntry[];
    },
    enabled: !!currentOrgId,
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Vídeo removido com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao remover vídeo: " + error.message);
    },
  });

  return {
    videos: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    deleteVideo,
  };
}
