import { useCallback, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { clearWarpCache } from "@/features/mockup";
import type { DbProduct, DbPrintAreaTechnique } from "@/features/mockup";
import type { Placement, BlendMode } from "./use-mockup-editor-types";
import type { SurfaceType } from "@/features/mockup";

interface UseMockupAIActionsOptions {
  selectedProduct: DbProduct | null;
  selectedArea: DbPrintAreaTechnique | null;
  selectedTemplate: string | null;
  logoPreview: string | null;
  placement: Placement;
  areaW: number;
  areaH: number;
  pushHistory: (p: Placement, logo: string | null) => void;
  setLogoPreview: (v: string | null) => void;
  setWarpedLogoUrl: (v: string | null) => void;
  setPlacement: (p: Placement) => void;
  setBlendMode: (m: BlendMode) => void;
  setSurfaceType: (s: SurfaceType) => void;
  setLogoOpacity: (v: number) => void;
}

/**
 * Encapsula todas as chamadas à edge function `mockup-ai`:
 * remove-bg e suggest-placement. Gerencia um único AbortController
 * compartilhado para permitir cancelamento manual do usuário.
 */
export function useMockupAIActions(opts: UseMockupAIActionsOptions) {
  const {
    selectedProduct,
    selectedArea,
    selectedTemplate,
    logoPreview,
    placement,
    areaW,
    areaH,
    pushHistory,
    setLogoPreview,
    setWarpedLogoUrl,
    setPlacement,
    setBlendMode,
    setSurfaceType,
    setLogoOpacity,
  } = opts;

  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isSuggestingPlacement, setIsSuggestingPlacement] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [suggestedPlacement, setSuggestedPlacement] = useState<{
    placement: Placement;
    reasoning: string;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleRemoveBg = useCallback(async () => {
    if (!logoPreview) return;
    setIsRemovingBg(true);
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { data, error } = await supabase.functions.invoke("mockup-ai", {
        body: { action: "remove-bg", imageBase64: logoPreview },
        headers: { "X-Request-Id": requestId },
        signal: controller.signal,
      });
      if (error) {
        if (error.name === "AbortError") return;
        throw error;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.imageBase64) {
        clearWarpCache();
        setWarpedLogoUrl(null);
        setLogoPreview(data.imageBase64);
        pushHistory(placement, data.imageBase64);
        toast.success("Fundo removido com IA!");
      }
    } catch (e: unknown) {
      toast.error("Erro ao remover fundo: " + (e instanceof Error ? e.message : "Tente novamente"));
    } finally {
      setIsRemovingBg(false);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [logoPreview, placement, pushHistory, setLogoPreview, setWarpedLogoUrl]);

  const handleSuggestPlacement = useCallback(async () => {
    if (!selectedProduct) return;
    setIsSuggestingPlacement(true);
    setAiReasoning(null);
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { data, error } = await supabase.functions.invoke("mockup-ai", {
        body: {
          action: "suggest-placement",
          productName: selectedProduct.name,
          templateId: selectedTemplate || "",
          areaWidth: selectedArea?.max_width || 15,
          areaHeight: selectedArea?.max_height || 15,
        },
        headers: { "X-Request-Id": requestId },
        signal: controller.signal,
      });
      if (error) {
        if (error.name === "AbortError") return;
        throw error;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const newPlacement: Placement = {
        x: (data.xPercent / 100) * areaW,
        y: (data.yPercent / 100) * areaH,
        scale: Math.max(0.1, Math.min(1.5, data.scale)),
        rotation: data.rotation || 0,
        flipH: false,
        flipV: false,
      };

      setSuggestedPlacement({
        placement: newPlacement,
        reasoning: data.reasoning || "Sugerido com base no tipo de produto.",
      });

      if (data.blendMode) setBlendMode(data.blendMode);
      if (data.surfaceType) setSurfaceType(data.surfaceType);
      if (data.opacity) setLogoOpacity(data.opacity);
      if (data.reasoning) setAiReasoning(data.reasoning);

      toast.info("Sugestão de IA recebida. Revise antes de aplicar.");
    } catch (e: unknown) {
      toast.error(
        "Erro na sugestão de IA: " + (e instanceof Error ? e.message : "Tente novamente"),
      );
    } finally {
      setIsSuggestingPlacement(false);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [
    selectedProduct,
    selectedTemplate,
    selectedArea,
    areaW,
    areaH,
    setBlendMode,
    setSurfaceType,
    setLogoOpacity,
  ]);

  const applySuggestedPlacement = useCallback(() => {
    if (!suggestedPlacement) return;
    setPlacement(suggestedPlacement.placement);
    pushHistory(suggestedPlacement.placement, logoPreview);
    setSuggestedPlacement(null);
    toast.success("Posicionamento aplicado!");
  }, [suggestedPlacement, logoPreview, pushHistory, setPlacement]);

  const cancelAIRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRemovingBg(false);
    setIsSuggestingPlacement(false);
    setSuggestedPlacement(null);
    toast.info("Ação cancelada pelo usuário.");
  }, []);

  return {
    isRemovingBg,
    isSuggestingPlacement,
    aiReasoning,
    suggestedPlacement,
    handleRemoveBg,
    handleSuggestPlacement,
    applySuggestedPlacement,
    cancelAIRequest,
  };
}
