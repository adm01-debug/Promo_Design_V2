import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Placement } from "./use-mockup-editor-state";
import type { SurfaceType } from "@/features/mockup";

type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";

interface UseMockupEditorAIOptions {
  logoPreview: string | null;
  productName: string;
  productSku: string;
  areaW: number;
  areaH: number;
  virtualCanvasSize: number;
  pushLogoToHistory: (dataUrl: string) => void;
  pushAISuggestion: (suggestion: {
    type: "placement" | "remove-bg";
    data: Record<string, unknown>;
  }) => void;
  setBlendMode: (m: BlendMode) => void;
  setSurfaceType: (s: SurfaceType) => void;
  setLogoOpacity: (o: number) => void;
}

/**
 * Encapsula ações de IA (sugerir posicionamento, remover fundo, cancelamento).
 * Compartilha um AbortController único entre operações concorrentes.
 */
export function useMockupEditorAI(opts: UseMockupEditorAIOptions) {
  const {
    logoPreview,
    productName,
    productSku,
    areaW,
    areaH,
    virtualCanvasSize,
    pushLogoToHistory,
    pushAISuggestion,
    setBlendMode,
    setSurfaceType,
    setLogoOpacity,
  } = opts;

  const [isSuggestingPlacement, setIsSuggestingPlacement] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [suggestedPlacement, setSuggestedPlacement] = useState<{
    placement: Placement;
    reasoning: string;
  } | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSuggestPlacement = useCallback(async () => {
    if (!logoPreview) return;
    setIsSuggestingPlacement(true);
    const rid = crypto.randomUUID();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { data, error } = await supabase.functions.invoke("mockup-ai", {
        body: {
          action: "suggest-placement",
          productName,
          templateId: productSku || "custom",
          areaWidth: areaW,
          areaHeight: areaH,
        },
        headers: { "X-Request-Id": rid },
      });

      if (error) {
        if (error.name === "AbortError") return;
        throw error;
      }

      const suggested: Placement = {
        scale: data.scale,
        x: (data.xPercent / 100) * virtualCanvasSize,
        y: (data.yPercent / 100) * virtualCanvasSize,
        rotation: data.rotation || 0,
        flipH: false,
        flipV: false,
      };

      setSuggestedPlacement({
        placement: suggested,
        reasoning: data.reasoning || "Sugerido com base na geometria do produto.",
      });
      pushAISuggestion({
        type: "placement",
        data: { placement: suggested, reasoning: data.reasoning },
      });
      if (data.blendMode) setBlendMode(data.blendMode);
      if (data.surfaceType) setSurfaceType(data.surfaceType);
      if (data.opacity) setLogoOpacity(data.opacity);
      toast.info("Sugestão de IA recebida.");
    } catch (err) {
      console.error("AI Suggestion failed:", err);
      toast.error("IA: Falha ao obter sugestão.");
    } finally {
      setIsSuggestingPlacement(false);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [
    logoPreview,
    productName,
    productSku,
    areaW,
    areaH,
    virtualCanvasSize,
    pushAISuggestion,
    setBlendMode,
    setSurfaceType,
    setLogoOpacity,
  ]);

  const handleRemoveBg = useCallback(async () => {
    if (!logoPreview) return;
    setIsRemovingBg(true);
    const rid = crypto.randomUUID();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { data, error } = await supabase.functions.invoke("mockup-ai", {
        body: { action: "remove-bg", imageBase64: logoPreview },
        headers: { "X-Request-Id": rid },
      });
      if (error) {
        if (error.name === "AbortError") return;
        throw error;
      }
      pushLogoToHistory(data.imageBase64);
      pushAISuggestion({
        type: "remove-bg",
        data: {
          logoPreview: data.imageBase64,
          reasoning: "Fundo removido automaticamente via IA.",
        },
      });
      toast.success("IA: Fundo removido!");
    } catch (err) {
      console.error("AI BG Removal failed:", err);
      toast.error("IA: Falha ao remover fundo.");
    } finally {
      setIsRemovingBg(false);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [logoPreview, pushLogoToHistory, pushAISuggestion]);

  const cancelAIRequest = useCallback(() => setIsCancelConfirmOpen(true), []);

  const confirmCancelAIRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsRemovingBg(false);
      setIsSuggestingPlacement(false);
      toast.info("Operação cancelada.");
    }
    setIsCancelConfirmOpen(false);
  }, []);

  return {
    isSuggestingPlacement,
    isRemovingBg,
    suggestedPlacement,
    setSuggestedPlacement,
    isCancelConfirmOpen,
    setIsCancelConfirmOpen,
    handleSuggestPlacement,
    handleRemoveBg,
    cancelAIRequest,
    confirmCancelAIRequest,
  };
}
