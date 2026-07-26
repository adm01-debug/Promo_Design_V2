import { supabase } from "@/integrations/supabase/client";
import type { InspirationRecipe } from "@/features/video/lib/inspiration-recipes";

/**
 * Origem do remix — permite distinguir descoberta orgânica no feed,
 * sugestão personalizada por cliente e abertura via link compartilhado.
 */
export type RemixOrigin = "feed" | "client_suggestion" | "deep_link";

export interface RemixTelemetryOptions {
  readonly origin?: RemixOrigin;
  /** Score de afinidade 0..1 quando a origem é sugestão por cliente. */
  readonly affinityScore?: number | null;
  readonly clientId?: string | null;
}

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
  options: RemixTelemetryOptions = {},
): Promise<void> {
  try {
    if (!organizationId) return;
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) return;

    const affinity =
      typeof options.affinityScore === "number" && Number.isFinite(options.affinityScore)
        ? Number(options.affinityScore.toFixed(4))
        : null;

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
        origin: options.origin ?? "feed",
        affinity_score: affinity,
        client_id: options.clientId ?? null,
      },
    });
  } catch {
    // telemetria não deve impactar a UX
  }
}

