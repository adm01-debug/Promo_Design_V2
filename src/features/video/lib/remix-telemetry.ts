import { supabase } from "@/integrations/supabase/client";
import type { InspirationRecipe } from "@/features/video/lib/inspiration-recipes";

/**
 * Registra a aplicação de um remix do Feed de Inspiração no audit_log.
 *
 * Contrato deliberado:
 * - Fire-and-forget: telemetria NUNCA pode bloquear ou quebrar a navegação.
 * - Sem dados sensíveis: apenas identificadores do catálogo estático.
 * - Silencioso em falha (offline, RLS, sessão expirada).
 */
export async function logRemixApplied(
  recipe: InspirationRecipe,
  organizationId: string | null | undefined,
): Promise<void> {
  try {
    if (!organizationId) return;
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return;

    await supabase.from("audit_log").insert({
      user_id: userId,
      organization_id: organizationId,
      table_name: "videos",
      action: "video.remix_applied",
      new_values: {
        recipe_id: recipe.id,
        category: recipe.category,
        aspect_ratio: recipe.aspectRatio,
        video_style: recipe.videoStyle,
        duration_seconds: recipe.durationSeconds,
        template_id: recipe.templateId,
        motion_preset_ids: [...recipe.motionPresetIds],
      },
    });
  } catch {
    // telemetria não deve impactar a UX
  }
}
