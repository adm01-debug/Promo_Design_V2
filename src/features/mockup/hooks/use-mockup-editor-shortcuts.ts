import { useEffect } from "react";
import type { Placement } from "./use-mockup-editor-state";

interface UseMockupEditorShortcutsOptions {
  undo: () => void;
  redo: () => void;
  logoPreview: string | null;
  showLogo: boolean;
  currentPlacement: Placement;
  updatePlacement: (update: Partial<Placement>) => void;
  centerLogo: () => void;
}

/**
 * Keyboard shortcuts do editor de mockups.
 *
 * - Ctrl/Cmd+Z: undo | Ctrl/Cmd+Shift+Z ou Ctrl/Cmd+Y: redo
 * - Setas: nudge do logo (Shift = passo maior)
 * - Ctrl/Cmd+C (sem seleção de input): center logo
 *
 * Ignorado quando o foco está em input/textarea/contenteditable/combobox/cmdk.
 * Usa `capture: true` para preemptar outros listeners globais (ex.: CommandPalette).
 */
export function useMockupEditorShortcuts({
  undo,
  redo,
  logoPreview,
  showLogo,
  currentPlacement,
  updatePlacement,
  centerLogo,
}: UseMockupEditorShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable ||
        target?.closest('[role="combobox"]') ||
        target?.closest(".cmdk-input");

      if (isInput) return;

      const step = e.shiftKey ? 10 : 2;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }

      if (logoPreview && showLogo) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          updatePlacement({ x: currentPlacement.x - step });
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          updatePlacement({ x: currentPlacement.x + step });
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          updatePlacement({ x: currentPlacement.y - step });
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          updatePlacement({ x: currentPlacement.y + step });
        }
        if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          centerLogo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
    // centerLogo é estável via useCallback nos consumers; incluí-la aqui geraria
    // re-registro desnecessário do listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, logoPreview, showLogo, currentPlacement, updatePlacement]);
}
