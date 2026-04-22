import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, RotateCcw, Minimize2, Maximize2, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAssetSignedUrl, type Asset } from "../hooks/use-assets";

interface Props {
  assets: Asset[];
  onRemove: (id: string) => void;
}

interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

const INITIAL: Transform = { scale: 1, tx: 0, ty: 0 };

function gridClasses(n: number): string {
  if (n === 2) return "grid-cols-2 grid-rows-1";
  if (n === 3) return "grid-cols-3 grid-rows-1";
  return "grid-cols-2 grid-rows-2";
}

export function CompareGrid({ assets, onRemove }: Props) {
  const [transform, setTransform] = useState<Transform>(INITIAL);
  const [mode, setMode] = useState<"fit" | "actual">("fit");

  // Reset transform when set of assets changes
  useEffect(() => {
    setTransform(INITIAL);
    setMode("fit");
  }, [assets.map((a) => a.id).join(",")]);

  const reset = useCallback(() => {
    setTransform(INITIAL);
    setMode("fit");
  }, []);

  const setActual = useCallback(() => {
    setTransform({ scale: 1, tx: 0, ty: 0 });
    setMode("actual");
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setTransform((t) => {
      const next = Math.min(8, Math.max(0.2, t.scale * (1 + delta)));
      return { ...t, scale: next };
    });
  }, []);

  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, tx: transform.tx, ty: transform.ty };
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      setTransform((t) => ({ ...t, tx: dragRef.current!.tx + dx, ty: dragRef.current!.ty + dy }));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ---- Touch gestures: 1 finger = pan; 2 fingers = pinch zoom + pan (synchronized) ----
  // We track pointers globally so a gesture started in one cell pans/zooms ALL cells in sync.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{
    mode: "pan" | "pinch";
    startTx: number;
    startTy: number;
    startScale: number;
    // pan
    startX?: number;
    startY?: number;
    // pinch
    startDist?: number;
    startMidX?: number;
    startMidY?: number;
  } | null>(null);

  const onTouchPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 1) {
      gestureRef.current = {
        mode: "pan",
        startTx: transform.tx,
        startTy: transform.ty,
        startScale: transform.scale,
        startX: pts[0].x,
        startY: pts[0].y,
      };
    } else if (pts.length === 2) {
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      gestureRef.current = {
        mode: "pinch",
        startTx: transform.tx,
        startTy: transform.ty,
        startScale: transform.scale,
        startDist: Math.hypot(dx, dy) || 1,
        startMidX: (pts[0].x + pts[1].x) / 2,
        startMidY: (pts[0].y + pts[1].y) / 2,
      };
    }
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gestureRef.current;
      if (!g) return;
      const pts = Array.from(pointersRef.current.values());
      if (g.mode === "pan" && pts.length === 1 && g.startX != null && g.startY != null) {
        const dx = pts[0].x - g.startX;
        const dy = pts[0].y - g.startY;
        setTransform({ scale: g.startScale, tx: g.startTx + dx, ty: g.startTy + dy });
      } else if (g.mode === "pinch" && pts.length >= 2 && g.startDist && g.startMidX != null && g.startMidY != null) {
        const ax = pts[0].x;
        const ay = pts[0].y;
        const bx = pts[1].x;
        const by = pts[1].y;
        const dist = Math.hypot(bx - ax, by - ay) || 1;
        const ratio = dist / g.startDist;
        const nextScale = Math.min(8, Math.max(0.2, g.startScale * ratio));
        const midX = (ax + bx) / 2;
        const midY = (ay + by) / 2;
        const dx = midX - g.startMidX;
        const dy = midY - g.startMidY;
        setTransform({ scale: nextScale, tx: g.startTx + dx, ty: g.startTy + dy });
      }
    };
    const onUpOrCancel = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      pointersRef.current.delete(e.pointerId);
      const remaining = Array.from(pointersRef.current.values());
      if (remaining.length === 0) {
        gestureRef.current = null;
      } else if (remaining.length === 1) {
        // Switched from pinch → pan; rebase from current transform.
        setTransform((t) => {
          gestureRef.current = {
            mode: "pan",
            startTx: t.tx,
            startTy: t.ty,
            startScale: t.scale,
            startX: remaining[0].x,
            startY: remaining[0].y,
          };
          return t;
        });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUpOrCancel);
    window.addEventListener("pointercancel", onUpOrCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUpOrCancel);
      window.removeEventListener("pointercancel", onUpOrCancel);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-muted/10 min-w-0">
      <div className="border-b border-border px-3 py-2 flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground mr-auto">
          Zoom/pan sincronizado · scroll para zoom · arraste para mover
        </span>
        <Button variant="ghost" size="sm" onClick={reset} className="h-8 px-2 text-xs gap-1">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
        <Button
          variant={mode === "fit" ? "default" : "ghost"}
          size="sm"
          onClick={reset}
          className="h-8 px-2 text-xs gap-1"
        >
          <Minimize2 className="w-3.5 h-3.5" /> Ajustar
        </Button>
        <Button
          variant={mode === "actual" ? "default" : "ghost"}
          size="sm"
          onClick={setActual}
          className="h-8 px-2 text-xs gap-1"
        >
          <Maximize2 className="w-3.5 h-3.5" /> 100%
        </Button>
      </div>

      <div className={cn("flex-1 grid gap-2 p-2 min-h-0", gridClasses(assets.length))}>
        {assets.map((a) => (
          <CompareCell
            key={a.id}
            asset={a}
            transform={transform}
            onRemove={() => onRemove(a.id)}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onPointerDown={onTouchPointerDown}
          />
        ))}
      </div>
    </div>
  );
}

interface CellProps {
  asset: Asset;
  transform: Transform;
  onRemove: () => void;
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onPointerDown: (e: React.PointerEvent) => void;
}

function CompareCell({ asset, transform, onRemove, onWheel, onMouseDown, onPointerDown }: CellProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isImage = (asset.mime_type ?? "").startsWith("image/");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setUrl(null);
    getAssetSignedUrl(asset.file_path, 3600).then((u) => {
      if (active) {
        setUrl(u);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [asset.file_path]);

  return (
    <div className="relative bg-background border border-border rounded-md overflow-hidden flex flex-col min-h-0 min-w-0">
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border bg-card/50 shrink-0">
        <span className="text-xs font-medium truncate flex-1" title={asset.name}>
          {asset.name}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-6 w-6 shrink-0"
          aria-label={`Remover ${asset.name} da comparação`}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div
        className="flex-1 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onPointerDown={onPointerDown}
      >
        {loading ? (
          <Skeleton className="w-3/4 h-3/4" />
        ) : !isImage ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <FileText className="w-12 h-12" />
            <span className="text-xs">Pré-visualização indisponível</span>
          </div>
        ) : url ? (
          <img
            src={url}
            alt={asset.name}
            draggable={false}
            style={{
              transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
              transformOrigin: "center center",
              transition: "transform 0.05s linear",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        )}
      </div>
    </div>
  );
}