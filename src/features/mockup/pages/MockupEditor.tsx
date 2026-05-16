import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload, GripVertical, Grid3X3, Maximize,
  FlipHorizontal, FlipVertical, RotateCw, ZoomIn, ZoomOut, Check, Undo2, Redo2,
} from "lucide-react";
import { toast } from "sonner";
import { loadImageWithFallback, countUniqueColors, calculateAutoFit, type SurfaceType } from "@/features/mockup";
import { getWarpedPreviewWorker as getWarpedPreview, clearWarpCache } from "@/features/mockup";
import { generateApprovalPdf } from "@/features/mockup";
import EditorTopBar from "@/features/mockup/components/EditorTopBar";
import EditorViewThumbnails from "@/features/mockup/components/EditorViewThumbnails";
import EditorRightPanel from "@/features/mockup/components/EditorRightPanel";
import { Skeleton } from "@/components/ui/skeleton";

const VIEWS: { id: string; label: string; icon: string; areaPercent: { x: number; y: number; w: number; h: number }; bgRotation?: number }[] = [
  { id: "front", label: "Frente", icon: "🟦", areaPercent: { x: 30, y: 20, w: 40, h: 45 } },
  { id: "back", label: "Costas", icon: "🟧", areaPercent: { x: 25, y: 15, w: 50, h: 50 } },
  { id: "side-left", label: "Lateral Esq.", icon: "◀", areaPercent: { x: 35, y: 30, w: 30, h: 40 } },
  { id: "side-right", label: "Lateral Dir.", icon: "▶", areaPercent: { x: 35, y: 30, w: 30, h: 40 } },
];

type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";
type Placement = { x: number; y: number; scale: number; rotation: number; flipH: boolean; flipV: boolean };
type ExportFormat = "png" | "jpeg" | "webp";
const INITIAL_PLACEMENT: Placement = { x: 10, y: 10, scale: 0.6, rotation: 0, flipH: false, flipV: false };
const CANVAS_SIZE = 460;

const MockupEditor = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"logo" | "settings">("logo");
  console.log("MockupEditor activeTab:", activeTab); // Use variable to avoid TS error


  const productName = searchParams.get("product") || "Produto";
  const productSku = searchParams.get("sku") || "";
  const productImage = searchParams.get("image") || "/placeholder.svg";
  const areaName = searchParams.get("area") || "Área";
  const areaW = Number(searchParams.get("aw")) || 15;
  const areaH = Number(searchParams.get("ah")) || 15;
  const technique = searchParams.get("technique") || "";

  const [activeView, setActiveView] = useState("front");
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoColors, setLogoColors] = useState<string[]>([]);
  const [showLogo, setShowLogo] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isWarping, setIsWarping] = useState(false);
  const [approvedViews, setApprovedViews] = useState<Set<string>>(new Set());
  const [blendMode, setBlendMode] = useState<BlendMode>("normal");
  const [showTexture, setShowTexture] = useState(true);
  const [logoOpacity, setLogoOpacity] = useState(100);
  const [surfaceType, setSurfaceType] = useState<SurfaceType>("flat");
  const [warpedLogoUrl, setWarpedLogoUrl] = useState<string | null>(null);
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowIntensity, setShadowIntensity] = useState(40);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [placements, setPlacements] = useState<Record<string, Placement>>({
    front: { ...INITIAL_PLACEMENT }, back: { ...INITIAL_PLACEMENT },
    "side-left": { ...INITIAL_PLACEMENT }, "side-right": { ...INITIAL_PLACEMENT },
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<Record<string, Placement[]>>({
    front: [{ ...INITIAL_PLACEMENT }],
    back: [{ ...INITIAL_PLACEMENT }],
    "side-left": [{ ...INITIAL_PLACEMENT }],
    "side-right": [{ ...INITIAL_PLACEMENT }],
  });
  const [historyIndex, setHistoryIndex] = useState<Record<string, number>>({
    front: 0, back: 0, "side-left": 0, "side-right": 0
  });

  const [containerSize, setContainerSize] = useState({ width: CANVAS_SIZE, height: CANVAS_SIZE });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry.contentRect) {
        const size = Math.min(entry.contentRect.width - 40, CANVAS_SIZE);
        if (size > 0) {
          setContainerSize({ width: size, height: size });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const currentPlacement = placements[activeView] || INITIAL_PLACEMENT;
  const currentView = VIEWS.find(v => v.id === activeView)!;
  const viewAreaW = (currentView.areaPercent.w / 100) * containerSize.width;
  const viewAreaH = (currentView.areaPercent.h / 100) * containerSize.height;

  const addToHistory = useCallback((viewId: string, placement: Placement) => {
    setHistory(prev => {
      const viewHistory = prev[viewId] || [];
      const currentIdx = historyIndex[viewId];
      const newHistory = viewHistory.slice(0, currentIdx + 1);
      newHistory.push({ ...placement });
      if (newHistory.length > 50) newHistory.shift();
      return { ...prev, [viewId]: newHistory };
    });
    setHistoryIndex(prev => ({ ...prev, [viewId]: Math.min((prev[viewId] || 0) + 1, 49) }));
  }, [historyIndex]);

  const undo = useCallback(() => {
    const currentIdx = historyIndex[activeView];
    if (currentIdx > 0) {
      const newIdx = currentIdx - 1;
      const prevPlacement = history[activeView][newIdx];
      setPlacements(prev => ({ ...prev, [activeView]: prevPlacement }));
      setHistoryIndex(prev => ({ ...prev, [activeView]: newIdx }));
      toast.info("Desfeito");
    }
  }, [activeView, history, historyIndex]);

  const redo = useCallback(() => {
    const viewHistory = history[activeView] || [];
    const currentIdx = historyIndex[activeView];
    if (currentIdx < viewHistory.length - 1) {
      const newIdx = currentIdx + 1;
      const nextPlacement = viewHistory[newIdx];
      setPlacements(prev => ({ ...prev, [activeView]: nextPlacement }));
      setHistoryIndex(prev => ({ ...prev, [activeView]: newIdx }));
      toast.info("Refeito");
    }
  }, [activeView, history, historyIndex]);

  const updatePlacement = (update: Partial<Placement>) => {
    const newPlacement = { ...placements[activeView], ...update };
    setPlacements(prev => ({ ...prev, [activeView]: newPlacement }));
    if (Object.keys(update).some(k => ["rotation", "flipH", "flipV"].includes(k))) {
      addToHistory(activeView, newPlacement);
    }
  };

  useEffect(() => {
    if (warpedLogoUrl) {
      URL.revokeObjectURL(warpedLogoUrl);
    }
    clearWarpCache();
    setWarpedLogoUrl(null);
  }, [logoPreview]);

  useEffect(() => {
    if (!logoPreview || surfaceType === "flat") { 
      if (warpedLogoUrl) URL.revokeObjectURL(warpedLogoUrl);
      setWarpedLogoUrl(null); 
      setIsWarping(false);
      return; 
    }
    let cancelled = false;
    setIsWarping(true);
    const warpW = Math.max(64, Math.round(viewAreaW * currentPlacement.scale * 2));
    const warpH = Math.max(64, Math.round(viewAreaH * currentPlacement.scale * 2));
    getWarpedPreview(logoPreview, warpW, warpH, surfaceType, currentPlacement.rotation, currentPlacement.flipH, currentPlacement.flipV)
      .then((url: string) => { 
        if (!cancelled) {
          if (warpedLogoUrl) URL.revokeObjectURL(warpedLogoUrl);
          setWarpedLogoUrl(url); 
          setIsWarping(false);
        } else {
          URL.revokeObjectURL(url);
        }
      })
      .catch(() => { 
        if (!cancelled) {
          if (warpedLogoUrl) URL.revokeObjectURL(warpedLogoUrl);
          setWarpedLogoUrl(null);
          setIsWarping(false);
        }
      });
    return () => { cancelled = true; };
  }, [logoPreview, surfaceType, currentPlacement.rotation, currentPlacement.flipH, currentPlacement.flipV, viewAreaW, viewAreaH, currentPlacement.scale]);

  const autoFitLogo = useCallback((dataUrl: string) => {
    const img = new window.Image();
    img.onload = () => { const fit = calculateAutoFit(img, viewAreaW, viewAreaH); updatePlacement({ x: fit.x, y: fit.y, scale: fit.scale }); toast.success("Logo auto-encaixado"); };
    img.src = dataUrl;
  }, [viewAreaW, viewAreaH]);

  const handleLogoUpload = useCallback((file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      clearWarpCache(); setWarpedLogoUrl(null); setLogoPreview(dataUrl);
      const img = new window.Image();
      img.onload = () => { setLogoColors(countUniqueColors(img)); const fit = calculateAutoFit(img, viewAreaW, viewAreaH); updatePlacement({ x: fit.x, y: fit.y, scale: fit.scale }); toast.success("Logo auto-encaixado na área de gravação"); };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [viewAreaW, viewAreaH]);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file?.type.startsWith("image/")) handleLogoUpload(file); }, [handleLogoUpload]);
  const handleLogoMouseDown = (e: React.MouseEvent) => { e.stopPropagation(); setIsDragging(true); setDragStart({ x: e.clientX - currentPlacement.x, y: e.clientY - currentPlacement.y }); };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; updatePlacement({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleMouseUp = () => setIsDragging(false);
  const centerLogo = () => { if (!areaRef.current) return; const rect = areaRef.current.getBoundingClientRect(); updatePlacement({ x: rect.width * 0.15, y: rect.height * 0.15 }); };
  const toggleApproval = (viewId: string) => { setApprovedViews(prev => { const next = new Set(prev); if (next.has(viewId)) next.delete(viewId); else next.add(viewId); return next; }); };
  const allApproved = VIEWS.every(v => approvedViews.has(v.id));

  const handleExportImage = useCallback(async (format: ExportFormat = "png") => {
    setIsExporting(true);
    try {
      const productImg = await loadImageWithFallback(productImage);
      const logoImg = logoPreview ? await loadImageWithFallback(logoPreview) : null;
      const canvas = document.createElement("canvas");
      const size = 1200; canvas.width = size * 2; canvas.height = size * 2;
      const ctx = canvas.getContext("2d")!;
      for (let i = 0; i < VIEWS.length; i++) {
        const view = VIEWS[i]; const col = i % 2; const row = Math.floor(i / 2);
        const ox = col * size; const oy = row * size;
        ctx.fillStyle = "#ffffff"; ctx.fillRect(ox, oy, size, size);
        const scale = (size * 0.8) / Math.max(productImg.width, productImg.height);
        const dx = ox + (size - productImg.width * scale) / 2;
        const dy = oy + (size - productImg.height * scale) / 2;
        ctx.drawImage(productImg, dx, dy, productImg.width * scale, productImg.height * scale);
        if (logoImg && showLogo) {
          const vp = placements[view.id] || INITIAL_PLACEMENT;
          const vAreaW = (view.areaPercent.w / 100) * size * 0.8;
          const vAreaH = (view.areaPercent.h / 100) * size * 0.8;
          const vAreaX = dx + (view.areaPercent.x / 100) * (productImg.width * scale);
          const vAreaY = dy + (view.areaPercent.y / 100) * (productImg.height * scale);
          const logoScale = vp.scale; const logoW = vAreaW * logoScale; const logoH = logoW / (logoImg.width / logoImg.height);
          ctx.save(); ctx.globalAlpha = logoOpacity / 100; ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
          ctx.translate(vAreaX + vp.x * (vAreaW / viewAreaW) + logoW / 2, vAreaY + vp.y * (vAreaH / viewAreaH) + logoH / 2);
          ctx.rotate((vp.rotation * Math.PI) / 180); if (vp.flipH) ctx.scale(-1, 1); if (vp.flipV) ctx.scale(1, -1);
          if (shadowEnabled) { ctx.shadowColor = `rgba(0, 0, 0, ${shadowIntensity / 100})`; ctx.shadowBlur = 12; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3; }
          ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH); ctx.restore();
        }
        ctx.fillStyle = "#333333"; ctx.font = "bold 24px sans-serif"; ctx.fillText(view.label, ox + 20, oy + 36);
        if (approvedViews.has(view.id)) { ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(ox + size - 30, oy + 30, 14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.font = "bold 16px sans-serif"; ctx.fillText("✓", ox + size - 37, oy + 36); }
        ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 2;
        if (col === 0) { ctx.beginPath(); ctx.moveTo(size, oy); ctx.lineTo(size, oy + size); ctx.stroke(); }
        if (row === 0) { ctx.beginPath(); ctx.moveTo(ox, size); ctx.lineTo(ox + size, size); ctx.stroke(); }
      }
      const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
      canvas.toBlob((blob) => { 
        if (!blob) return; 
        const url = URL.createObjectURL(blob); 
        const a = document.createElement("a"); 
        a.href = url; 
        a.download = `mockup-multiview-${productSku}-HD.${format}`; 
        a.click(); 
        setTimeout(() => URL.revokeObjectURL(url), 100);
        toast.success(`${format.toUpperCase()} multivistas exportado`); 
      }, mimeType, format === "png" ? undefined : 0.92);
    } catch { toast.error("Erro ao exportar"); } finally { setIsExporting(false); }
  }, [productImage, productSku, approvedViews, logoPreview, showLogo, placements, logoOpacity, blendMode, shadowEnabled, shadowIntensity, viewAreaW, viewAreaH]);

  const handleExportPng = useCallback(() => handleExportImage(exportFormat), [handleExportImage, exportFormat]);
  const handleExportPdf = () => {
    const pdf = generateApprovalPdf({ productName, technique: technique || "N/A", dimensions: { width: areaW, height: areaH }, colors: logoColors.slice(0, 5), area: areaName, date: new Date().toLocaleDateString("pt-BR"), mockupImageDataUrl: "" });
    pdf.save(`mockup-editor-${productSku}-${Date.now()}.pdf`); toast.success("PDF de aprovação gerado");
  };

  return (
    <div className="h-screen flex flex-col">
      <EditorTopBar productName={productName} allApproved={allApproved} onExportPdf={handleExportPdf} onExportPng={handleExportPng} isExporting={isExporting} />
      <div className="flex-1 flex overflow-hidden">
        <EditorViewThumbnails views={VIEWS} activeView={activeView} setActiveView={setActiveView} productImage={productImage} approvedViews={approvedViews} />

        <div className="flex-1 flex flex-col">
          <div className="h-10 bg-card border-b border-border flex items-center justify-between px-3" role="toolbar" aria-label="Ferramentas de Edição">
            <div className="flex items-center gap-1.5">
              <button onClick={undo} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Desfazer" aria-label="Desfazer"><Undo2 className="w-4 h-4" /></button>
              <button onClick={redo} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Refazer" aria-label="Refazer"><Redo2 className="w-4 h-4" /></button>
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded transition-colors ${showGrid ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} title="Grid" aria-pressed={showGrid} aria-label="Alternar grade"><Grid3X3 className="w-4 h-4" aria-hidden="true" /></button>
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={centerLogo} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Centralizar" aria-label="Centralizar logo"><Maximize className="w-4 h-4" aria-hidden="true" /></button>
              <button onClick={() => updatePlacement({ flipH: !currentPlacement.flipH })} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Flip H" aria-label="Espelhar horizontal"><FlipHorizontal className="w-4 h-4" aria-hidden="true" /></button>
              <button onClick={() => updatePlacement({ flipV: !currentPlacement.flipV })} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Flip V" aria-label="Espelhar vertical"><FlipVertical className="w-4 h-4" aria-hidden="true" /></button>
              <button onClick={() => updatePlacement({ rotation: currentPlacement.rotation + 15 })} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Rotacionar" aria-label="Rotacionar logo"><RotateCw className="w-4 h-4" aria-hidden="true" /></button>
              <div className="w-px h-5 bg-border mx-1" />
              <span className="text-[10px] font-mono text-primary">{currentView.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground ml-1">({areaW}×{areaH}cm)</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(Math.max(50, zoom - 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Diminuir zoom"><ZoomOut className="w-4 h-4" aria-hidden="true" /></button>
              <span className="text-xs font-mono text-muted-foreground w-12 text-center" aria-live="polite">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(300, zoom + 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Aumentar zoom"><ZoomIn className="w-4 h-4" aria-hidden="true" /></button>
            </div>
          </div>

          <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto relative p-4" style={{ background: "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%) 50% / 20px 20px" }} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="relative bg-white rounded-xl border border-border shadow-lg select-none" style={{ width: containerSize.width, height: containerSize.height, transform: `scale(${zoom / 100})`, transformOrigin: "center" }}>
              <img src={productImage} alt={productName} className="w-full h-full object-contain pointer-events-none" draggable={false} style={{ transform: currentView.bgRotation ? `rotate(${currentView.bgRotation}deg)` : undefined }} onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
              {showGrid && <div className="absolute inset-0 pointer-events-none z-[5]" style={{ backgroundImage: "linear-gradient(hsl(var(--primary) / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.06) 1px, transparent 1px)", backgroundSize: "25px 25px" }} />}
              <div ref={areaRef} className="absolute border-2 border-dashed border-primary/40 rounded bg-primary/5" style={{ left: `${currentView.areaPercent.x}%`, top: `${currentView.areaPercent.y}%`, width: `${currentView.areaPercent.w}%`, height: `${currentView.areaPercent.h}%` }}>
                <span className="absolute -top-5 left-0 text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{currentView.label}</span>
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground">{areaW}cm</span>
                <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground rotate-90">{areaH}cm</span>
                {logoPreview && showLogo && (
                  <div className={`absolute cursor-move ${isDragging ? "opacity-80" : ""}`} style={{ left: currentPlacement.x, top: currentPlacement.y, width: `${currentPlacement.scale * 100}%` }} onMouseDown={handleLogoMouseDown} role="button" aria-label="Ajustar posição da logo" tabIndex={0}>
                    {isWarping ? (
                      <Skeleton className="w-full aspect-square rounded-sm bg-primary/10 animate-pulse" />
                    ) : (
                      <img src={warpedLogoUrl && surfaceType !== "flat" ? warpedLogoUrl : logoPreview} alt="Logo aplicada" className="w-full h-full object-contain pointer-events-none" draggable={false} style={{ mixBlendMode: blendMode, opacity: logoOpacity / 100, filter: shadowEnabled ? `drop-shadow(3px 3px ${Math.round(shadowIntensity / 5)}px rgba(0,0,0,${shadowIntensity / 100}))` : undefined, ...(surfaceType === "flat" ? { transform: `rotate(${currentPlacement.rotation}deg) scaleX(${currentPlacement.flipH ? -1 : 1}) scaleY(${currentPlacement.flipV ? -1 : 1})` } : {}) }} />
                    )}
                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-sm cursor-se-resize flex items-center justify-center border border-primary-foreground" role="button" aria-label="Redimensionar logo"><GripVertical className="w-2.5 h-2.5 text-primary-foreground rotate-[-45deg]" aria-hidden="true" /></div>
                    <div className="absolute inset-0 border border-primary/60 rounded-sm pointer-events-none" aria-hidden="true" />
                  </div>
                )}
                {!logoPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors rounded" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-5 h-5 text-primary/60 mb-1" /><span className="text-[9px] text-primary/60 font-mono">Soltar logo aqui</span>
                  </div>
                )}
              </div>
              <div className="absolute top-2 left-2 bg-card/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-semibold text-foreground">{currentView.icon} {currentView.label}</div>
            </div>
          </div>

          <section className="h-[140px] bg-card border-t border-border flex items-center gap-3 px-4 overflow-x-auto shrink-0" aria-label="Navegação rápida de vistas">
            <nav className="flex items-center gap-3">
              {VIEWS.map((view) => (
                <motion.button key={view.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setActiveView(view.id)} className={`relative shrink-0 w-[110px] rounded-lg border-2 transition-all overflow-hidden ${activeView === view.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`} aria-label={`Mudar para vista ${view.label}`} aria-current={activeView === view.id ? "page" : undefined}>
                  <div className="aspect-square bg-white flex items-center justify-center relative">
                    <img src={productImage} alt={`Miniatura da vista ${view.label}`} className="w-full h-full object-contain p-1" style={{ transform: view.bgRotation ? `rotate(${view.bgRotation}deg)` : undefined }} onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                    <div className="absolute border border-dashed border-primary/30 bg-primary/5 rounded-sm" style={{ left: `${view.areaPercent.x}%`, top: `${view.areaPercent.y}%`, width: `${view.areaPercent.w}%`, height: `${view.areaPercent.h}%` }} aria-hidden="true" />
                    {approvedViews.has(view.id) && <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow" title="Aprovado"><Check className="w-3 h-3 text-white" /></div>}
                  </div>
                  <div className="p-1.5 bg-card text-center"><span className="text-[10px] font-semibold text-foreground">{view.label}</span></div>
                </motion.button>
              ))}
            </nav>
            <div className="shrink-0 w-px h-20 bg-border mx-2" role="separator" />
            <div className="shrink-0 flex flex-col items-center justify-center px-4" role="status" aria-label="Progresso de aprovação">
              <div className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Aprovação</div>
              <div className="text-2xl font-bold text-foreground" aria-live="polite">{approvedViews.size}<span className="text-muted-foreground text-lg">/{VIEWS.length}</span></div>
              {allApproved && <span className="text-[9px] text-green-400 font-semibold mt-1">✓ Completo</span>}
            </div>
          </section>
        </div>

        <EditorRightPanel
          productName={productName} productSku={productSku} productImage={productImage} technique={technique}
          logoFile={logoFile} logoPreview={logoPreview} logoColors={logoColors} showLogo={showLogo} setShowLogo={setShowLogo}
          fileInputRef={fileInputRef} handleLogoUpload={handleLogoUpload}
          setLogoPreview={setLogoPreview} setLogoFile={setLogoFile} setLogoColors={setLogoColors} setWarpedLogoUrl={setWarpedLogoUrl}
          blendMode={blendMode} setBlendMode={setBlendMode} logoOpacity={logoOpacity} setLogoOpacity={setLogoOpacity}
          showTexture={showTexture} setShowTexture={setShowTexture}
          shadowEnabled={shadowEnabled} setShadowEnabled={setShadowEnabled} shadowIntensity={shadowIntensity} setShadowIntensity={setShadowIntensity}
          autoFitLogo={autoFitLogo} surfaceType={surfaceType} setSurfaceType={setSurfaceType}
          currentPlacement={currentPlacement} updatePlacement={updatePlacement} currentViewLabel={currentView.label}
          views={VIEWS} approvedViews={approvedViews} toggleApproval={toggleApproval}
          exportFormat={exportFormat} setExportFormat={setExportFormat}
          handleExportPdf={handleExportPdf} handleExportPng={handleExportPng} isExporting={isExporting}
        />
      </div>
    </div>
  );
};

export default MockupEditor;
