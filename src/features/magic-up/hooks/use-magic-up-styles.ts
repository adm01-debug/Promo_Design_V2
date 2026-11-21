import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganizations } from "@/hooks/use-organization";

export const MAGIC_UP_STYLE_LIMIT = 50;

export interface MagicUpStyle {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  emoji: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

export const STYLE_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function useMagicUpStyles() {
  const qc = useQueryClient();
  const { currentOrgId } = useOrganizations();
  const queryKey = ["magic-up-styles", currentOrgId] as const;
  const enabled = Boolean(currentOrgId);

  const list = useQuery({
    queryKey,
    enabled,
    queryFn: async (): Promise<MagicUpStyle[]> => {
      const { data, error } = await supabase
        .from("magic_up_styles")
        .select("*")
        .eq("organization_id", currentOrgId!)
        .order("name", { ascending: true })
        .limit(MAGIC_UP_STYLE_LIMIT);
      if (error) throw error;
      return (data ?? []) as MagicUpStyle[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { slug: string; name: string; emoji?: string; prompt: string }) => {
      if (!currentOrgId) throw new Error("Organização ausente");
      const slug = input.slug.trim().toLowerCase();
      if (!STYLE_SLUG_RE.test(slug)) {
        throw new Error("Slug inválido: use letras minúsculas, números e hifens (máx. 40)");
      }
      if (input.prompt.trim().length < 3) {
        throw new Error("Prompt muito curto (mínimo de 3 caracteres)");
      }
      const { data, error } = await supabase
        .from("magic_up_styles")
        .insert({
          organization_id: currentOrgId,
          slug,
          name: input.name.trim(),
          emoji: input.emoji?.trim() || "🎨",
          prompt: input.prompt.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      return data as MagicUpStyle;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<Pick<MagicUpStyle, "slug" | "name" | "emoji" | "prompt">>;
    }) => {
      const payload: Partial<Pick<MagicUpStyle, "slug" | "name" | "emoji" | "prompt">> = {};
      if (input.patch.slug !== undefined) {
        const slug = input.patch.slug.trim().toLowerCase();
        if (!STYLE_SLUG_RE.test(slug)) {
          throw new Error("Slug inválido: use letras minúsculas, números e hifens (máx. 40)");
        }
        payload.slug = slug;
      }
      if (input.patch.name !== undefined) payload.name = input.patch.name.trim();
      if (input.patch.emoji !== undefined) payload.emoji = input.patch.emoji.trim() || "🎨";
      if (input.patch.prompt !== undefined) {
        if (input.patch.prompt.trim().length < 3) {
          throw new Error("Prompt muito curto (mínimo de 3 caracteres)");
        }
        payload.prompt = input.patch.prompt.trim();
      }
      const { error } = await supabase.from("magic_up_styles").update(payload).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("magic_up_styles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return {
    styles: list.data ?? [],
    isLoading: list.isLoading,
    create,
    update,
    remove,
  };
}
