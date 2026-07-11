import React, { useEffect, useState } from "react";
import {
  Grid3X3, Ruler, AlignCenter, Maximize, FlipHorizontal, FlipVertical,
  RotateCw, ZoomOut, ZoomIn, Upload, GripVertical, Sparkles,
} from "lucide-react";
import type { DbProduct, DbPrintAreaTechnique } from "@/features/mockup";
import type { Placement } from "@/features/mockup/hooks/use-mockup-editor";

interface MockupCanvasProps {
  selectedProduct: DbProduct;
  selectedProductImage: string | null;
  selectedArea: DbPrintAreaTechnique;
  placement: Placement;
  setPlacement: React.Dispatch<React.SetStateAction<Placement>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  showRulers: boolean;
  setShowRulers: React.Dispatch<React.SetStateAction<boolean>>;
  showGuides: boolean;
  setShowGuides: React.Dispatch<React.SetStateAction<boolean>>;
  showLogo: boolean;
  logoPreview: string | null;
  warpedLogoUrl: string | null;
  surfaceType: string;
  blendMode: string;
  logoOpacity: number;
  shadowEnabled: boolean;
  shadowIntensity: number;
  isDragging: boolean;
  isWarping: boolean;
  isResizing: boolean;
  areaW: number;
  areaH: number;
  centerLogo: () => void;
  handleLogoMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleDrop: (e: React.DragEvent) => void;
  setIsResizing: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  areaRef: React.RefObject<HTMLDivElement>;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  suggestedPlacement: { placement: Placement; reasoning: string } | null;
}

const CANVAS_SIZE = 500;

const MockupCanvas = ({
  selectedProduct, selectedProductImage, selectedArea, placement, setPlacement,
  zoom, setZoom, showGrid, setShowGrid, showRulers, setShowRulers,
  showGuides, setShowGuides, showLogo, logoPreview, warpedLogoUrl,
  surfaceType, blendMode, logoOpacity, shadowEnabled, shadowIntensity,
  isDragging, isWarping, areaW, areaH,
  centerLogo, handleLogoMouseDown, handleMouseMove, handleMouseUp, handleDrop,
  setIsResizing, fileInputRef, areaRef, canvasContainerRef, suggestedPlacement,
}: MockupCanvasProps) => {
  // Responsive display scaling: fits the fixed virtual canvas inside the container.
  const [displayScale, setDisplayScale] = useState(1);
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const compute = () => {
      const rect = el.getBoundingClientRect();
      const pad = 48;
      const available = Math.max(200, Math.min(rect.width - pad, rect.height - pad));
      setDisplayScale(Math.min(1, available / CANVAS_SIZE));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasContainerRef]);

  return (
  <div className="flex-1 flex flex-col">
    {/* Toolbar */}
    <div className="h-10 bg-card border-b border-border flex items-center justify-between px-3" role="toolbar" aria-label="Ferramentas de edição de mockup">
      <div className="flex items-center gap-1">
        <button 
          onClick={() => setShowGrid(!showGrid)} 
          className={`p-1.5 rounded transition-colors ${showGrid ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} 
          title="Grid (G)"
          aria-label={showGrid ? "Esconder grade" : "Mostrar grade"}
          aria-pressed={showGrid}
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setShowRulers(!showRulers)} 
          className={`p-1.5 rounded transition-colors ${showRulers ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} 
          title="Réguas (R)"
          aria-label={showRulers ? "Esconder réguas" : "Mostrar réguas"}
          aria-pressed={showRulers}
        >
          <Ruler className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setShowGuides(!showGuides)} 
          className={`p-1.5 rounded transition-colors ${showGuides ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} 
          title="Guias"
          aria-label={showGuides ? "Esconder guias" : "Mostrar guias"}
          aria-pressed={showGuides}
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-border mx-1" role="separator" />
        <button onClick={centerLogo} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Centralizar logo" aria-label="Centralizar logo">
          <Maximize className="w-4 h-4" />
        </button>
        <button onClick={() => setPlacement(p => ({ ...p, flipH: !p.flipH }))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Espelhar Horizontal" aria-label="Espelhar Horizontal">
          <FlipHorizontal className="w-4 h-4" />
        </button>
        <button onClick={() => setPlacement(p => ({ ...p, flipV: !p.flipV }))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Espelhar Vertical" aria-label="Espelhar Vertical">
          <FlipVertical className="w-4 h-4" />
        </button>
        <button onClick={() => setPlacement(p => ({ ...p, rotation: p.rotation + 15 }))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Rotacionar" aria-label="Rotacionar 15 graus">
          <RotateCw className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-border mx-1" role="separator" />
        <span className="text-[10px] font-mono text-muted-foreground" aria-label={`Área de impressão: ${selectedArea.location_name}`}>
          {selectedArea.location_name} ({selectedArea.max_width}×{selectedArea.max_height}cm)
        </span>
      </div>
      <div className="flex items-center gap-2" role="group" aria-label="Controle de Zoom">
        <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Diminuir zoom"><ZoomOut className="w-4 h-4" /></button>
        <span className="text-xs font-mono text-muted-foreground w-12 text-center" aria-live="polite" aria-label={`Zoom atual: ${zoom}%`}>{zoom}%</span>
        <button onClick={() => setZoom(Math.min(400, zoom + 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Aumentar zoom"><ZoomIn className="w-4 h-4" /></button>
      </div>
    </div>

    {/* Canvas area */}
    <div
      ref={canvasContainerRef}
      className="flex-1 flex items-center justify-center overflow-auto relative"
      style={{ background: "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%) 50% / 20px 20px" }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {showRulers && (
        <>
          <div className="absolute top-0 left-8 right-0 h-6 bg-card/90 border-b border-border z-20 flex items-end overflow-hidden">
            {Array.from({ length: Math.ceil(CANVAS_SIZE * (zoom / 100) / 20) + 1 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center" style={{ position: "absolute", left: i * 20 }}>
                <span className="text-[7px] font-mono text-muted-foreground">{i}</span>
                <div className="w-px h-2 bg-border" />
              </div>
            ))}
          </div>
          <div className="absolute top-6 left-0 bottom-0 w-6 bg-card/90 border-r border-border z-20 flex flex-col items-end overflow-hidden">
            {Array.from({ length: Math.ceil(CANVAS_SIZE * (zoom / 100) / 20) + 1 }).map((_, i) => (
              <div key={i} className="flex items-center" style={{ position: "absolute", top: i * 20 }}>
                <span className="text-[7px] font-mono text-muted-foreground mr-1">{i}</span>
                <div className="h-px w-2 bg-border" />
              </div>
            ))}
          </div>
        </>
      )}

      <div
        className="relative bg-white rounded-xl border border-border shadow-lg select-none"
        style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, transform: `scale(${(zoom / 100) * displayScale})`, transformOrigin: "center" }}
      >
        {selectedProductImage && (
          <img src={selectedProductImage} alt={selectedProduct.name} className="w-full h-full object-contain pointer-events-none" draggable={false} onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
        )}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-5" style={{
            backgroundImage: "linear-gradient(hsl(var(--primary) / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.06) 1px, transparent 1px)",
            backgroundSize: "25px 25px",
          }} />
        )}
        {showGuides && (
          <>
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-primary/20 pointer-events-none z-5" />
            <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/20 pointer-events-none z-5" />
          </>
        )}

        <div
          ref={areaRef}
          className="absolute border-2 border-dashed border-primary/40 rounded bg-primary/5"
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: areaW, height: areaH }}
        >
          <span className="absolute -top-5 left-0 text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{selectedArea.location_name}</span>
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground">{selectedArea.max_width}cm</span>
          <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground rotate-90">{selectedArea.max_height}cm</span>

          {logoPreview && showLogo && (
            <div
              className={`absolute cursor-move focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${isDragging ? "opacity-80" : ""} ${isWarping ? "animate-pulse" : ""}`}
              style={{ left: placement.x, top: placement.y, width: `${placement.scale * 100}%` }}
              onMouseDown={handleLogoMouseDown}
              role="img"
              aria-label="Logo posicionada no produto"
              tabIndex={0}
            >
              <img
                src={warpedLogoUrl && surfaceType !== "flat" ? warpedLogoUrl : logoPreview}
                alt="Logo preview"
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
                style={{
                  mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"],
                  opacity: logoOpacity / 100,
                  filter: shadowEnabled ? `drop-shadow(3px 3px ${Math.round(shadowIntensity / 5)}px rgba(0,0,0,${shadowIntensity / 100}))` : undefined,
                  ...(surfaceType === "flat" ? { transform: `rotate(${placement.rotation}deg) scaleX(${placement.flipH ? -1 : 1}) scaleY(${placement.flipV ? -1 : 1})` } : {}),
                }}
              />
              <button
                className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-sm cursor-se-resize flex items-center justify-center border border-primary-foreground"
                onMouseDown={(e) => { e.stopPropagation(); setIsResizing(true); }}
                aria-label="Redimensionar logo"
              >
                <GripVertical className="w-2.5 h-2.5 text-primary-foreground rotate-[-45deg]" aria-hidden="true" />
              </button>
              <div className="absolute inset-0 border border-primary/60 rounded-sm pointer-events-none" aria-hidden="true" />
            </div>
          )}
          
          {logoPreview && showLogo && suggestedPlacement && (
            <div
              className="absolute pointer-events-none opacity-40 border border-primary border-dashed rounded-sm"
              style={{ left: suggestedPlacement.placement.x, top: suggestedPlacement.placement.y, width: `${suggestedPlacement.placement.scale * 100}%` }}
            >
              <img
                src={logoPreview}
                alt="AI Suggestion"
                className="w-full h-full object-contain grayscale brightness-110"
                style={{
                  mixBlendMode: blendMode as React.CSSProperties["mixBlendMode"],
                  ...(surfaceType === "flat" ? { transform: `rotate(${suggestedPlacement.placement.rotation}deg)` } : {}),
                }}
              />
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[8px] px-1 rounded flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Sugestão IA
              </div>
            </div>
          )}

          {!logoPreview && (
            <button
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset focus-visible:outline-none"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload de logo"
            >
              <Upload className="w-6 h-6 text-primary/60 mb-1" aria-hidden="true" />
              <span className="text-[10px] text-primary/60 font-mono">Soltar logo aqui</span>
              <span className="text-[8px] text-muted-foreground mt-1">ou clique para upload</span>
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default MockupCanvas;
