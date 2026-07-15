import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getWarpedPreviewWorker as getWarpedPreview, clearWarpCache } from "@/features/mockup";
import type { SurfaceType } from "@/features/mockup";

interface UseMockupWarpEffectOptions {
  logoPreview: string | null;
  surfaceType: SurfaceType;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  scale: number;
  viewAreaW: number;
  viewAreaH: number;
}

interface UseMockupWarpEffectResult {
  warpedLogoUrl: string | null;
  setWarpedLogoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  isWarping: boolean;
}

/**
 * Encapsula toda a orquestração do mesh-warp preview do editor de mockups:
 * - Debounce de 150ms para amortecer sequências pesadas.
 * - Cancelamento seguro em unmount ou nova dependência (sem setState em componente desmontado).
 * - Revogação de object URLs anteriores para evitar leak de memória.
 * - Reset automático quando `logoPreview` muda ou quando a superfície volta para `flat`.
 * - Cleanup na desmontagem revoga o último URL ativo.
 *
 * Retorna também o setter para compatibilidade com fluxos legados
 * (ex.: hooks de IA que precisam limpar a preview após remover o BG).
 */
export function useMockupWarpEffect({
  logoPreview,
  surfaceType,
  rotation,
  flipH,
  flipV,
  scale,
  viewAreaW,
  viewAreaH,
}: UseMockupWarpEffectOptions): UseMockupWarpEffectResult {
  const [warpedLogoUrl, setWarpedLogoUrl] = useState<string | null>(null);
  const [isWarping, setIsWarping] = useState(false);

  // Reset ao trocar de logo — limpa cache e revoga URL anterior via setter funcional.
  useEffect(() => {
    clearWarpCache();
    setWarpedLogoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [logoPreview]);

  // Efeito principal do warp
  useEffect(() => {
    if (!logoPreview || surfaceType === "flat") {
      setWarpedLogoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setIsWarping(false);
      return;
    }

    let cancelled = false;
    setIsWarping(true);

    const safeScale = Math.max(0.01, scale);
    const warpW = Math.max(64, Math.min(2048, Math.round(viewAreaW * safeScale * 2)));
    const warpH = Math.max(64, Math.min(2048, Math.round(viewAreaH * safeScale * 2)));

    const requestWarp = async () => {
      try {
        const url = await getWarpedPreview(logoPreview, warpW, warpH, surfaceType, rotation, flipH, flipV);
        if (!cancelled) {
          setWarpedLogoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setIsWarping(false);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error("Warping error:", error);
        if (!cancelled) {
          setWarpedLogoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          setIsWarping(false);
          toast.error("Erro ao processar deformação da logo. Tente simplificar a escala.");
        }
      }
    };

    const timer = setTimeout(requestWarp, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [logoPreview, surfaceType, rotation, flipH, flipV, scale, viewAreaW, viewAreaH]);

  // Cleanup do último URL na desmontagem.
  useEffect(() => {
    return () => {
      setWarpedLogoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  return { warpedLogoUrl, setWarpedLogoUrl, isWarping };
}
