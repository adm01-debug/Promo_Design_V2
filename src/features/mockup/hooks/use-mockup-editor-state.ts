import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

export type Placement = { x: number; y: number; scale: number; rotation: number; flipH: boolean; flipV: boolean };

const INITIAL_PLACEMENT: Placement = { x: 50, y: 50, scale: 0.6, rotation: 0, flipH: false, flipV: false };

interface EditorState {
  placements: Record<string, Placement>;
  history: Record<string, Placement[]>;
  historyIndex: Record<string, number>;
}

export function useMockupEditorState(views: { id: string }[]) {
  const initialPlacements = useMemo(() => {
    const p: Record<string, Placement> = {};
    views.forEach(v => { p[v.id] = { ...INITIAL_PLACEMENT }; });
    return p;
  }, [views]);

  const initialHistory = useMemo(() => {
    const h: Record<string, Placement[]> = {};
    views.forEach(v => { h[v.id] = [{ ...INITIAL_PLACEMENT }]; });
    return h;
  }, [views]);

  const initialHistoryIndex = useMemo(() => {
    const idx: Record<string, number> = {};
    views.forEach(v => { idx[v.id] = 0; });
    return idx;
  }, [views]);

  const [state, setState] = useState<EditorState>({
    placements: initialPlacements,
    history: initialHistory,
    historyIndex: initialHistoryIndex,
  });

  const updatePlacementWithHistory = useCallback((viewId: string, update: Partial<Placement>, commitToHistory = false) => {
    setState(prev => {
      const current = prev.placements[viewId] || INITIAL_PLACEMENT;
      const next = { ...current, ...update };
      
      let nextHistory = prev.history;
      let nextHistoryIndex = prev.historyIndex;

      if (commitToHistory) {
        const viewHistory = prev.history[viewId] || [];
        const currentIdx = prev.historyIndex[viewId];
        const newHistory = viewHistory.slice(0, currentIdx + 1);
        newHistory.push({ ...next });
        if (newHistory.length > 50) newHistory.shift();
        
        nextHistory = { ...prev.history, [viewId]: newHistory };
        nextHistoryIndex = { ...prev.historyIndex, [viewId]: Math.min(newHistory.length - 1, 49) };
      }

      return {
        ...prev,
        placements: { ...prev.placements, [viewId]: next },
        history: nextHistory,
        historyIndex: nextHistoryIndex
      };
    });
  }, []);

  const undo = useCallback((viewId: string) => {
    setState(prev => {
      const currentIdx = prev.historyIndex[viewId];
      if (currentIdx > 0) {
        const newIdx = currentIdx - 1;
        const prevPlacement = prev.history[viewId][newIdx];
        toast.info("Desfeito");
        return {
          ...prev,
          placements: { ...prev.placements, [viewId]: prevPlacement },
          historyIndex: { ...prev.historyIndex, [viewId]: newIdx }
        };
      }
      return prev;
    });
  }, []);

  const redo = useCallback((viewId: string) => {
    setState(prev => {
      const viewHistory = prev.history[viewId] || [];
      const currentIdx = prev.historyIndex[viewId];
      if (currentIdx < viewHistory.length - 1) {
        const newIdx = currentIdx + 1;
        const nextPlacement = viewHistory[newIdx];
        toast.info("Refeito");
        return {
          ...prev,
          placements: { ...prev.placements, [viewId]: nextPlacement },
          historyIndex: { ...prev.historyIndex, [viewId]: newIdx }
        };
      }
      return prev;
    });
  }, []);

  const setPlacements = useCallback((placements: Record<string, Placement>) => {
    setState(prev => ({
      ...prev,
      placements: { ...prev.placements, ...placements }
    }));
  }, []);

  return {
    placements: state.placements,
    history: state.history,
    historyIndex: state.historyIndex,
    updatePlacement: updatePlacementWithHistory,
    undo,
    redo,
    setPlacements
  };
}
