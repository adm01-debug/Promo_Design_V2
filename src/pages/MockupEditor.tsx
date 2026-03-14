import { useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, FileText, ChevronLeft, Loader2, Upload,
  RotateCw, FlipHorizontal, FlipVertical, ZoomIn, ZoomOut,
  Eye, EyeOff, Trash2, GripVertical, Maximize, Check,
  Printer, Share2, Grid3X3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { loadImageWithFallback, countUniqueColors, calculateAutoFit, detectSurfaceType, PERSPECTIVE_PRESETS, type SurfaceType } from "@/lib/canvas-utils";
import { getWarpedPreview, clearWarpCache, applyMeshWarp } from "@/lib/mesh-warp";
import { generateApprovalPdf } from "@/lib/pdf-export";

// ──────────── View definitions ────────────
interface ViewDef {
  id: string;
  label: string;
  icon: string;
  areaPercent: { x: number; y: number; w: number; h: number };
  bgRotation?: number;
}

const VIEWS: ViewDef[] = [
  { id: "front", label: "Frente", icon: "🟦", areaPercent: { x: 30, y: 20, w: 40, h: 45 } },
  { id: "back", label: "Costas", icon: "🟧", areaPercent: { x: 25, y: 15, w: 50, h: 50 } },
  { id: "side-left", label: "Lateral Esq.", icon: "◀", areaPercent: { x: 35, y: 30, w: 30, h: 40 } },
  { id: "side-right", label: "Lateral Dir.", icon: "▶", areaPercent: { x: 35, y: 30, w: 30, h: 40 } },
];

type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";
type Placement = { x: number; y: number; scale: number; rotation: number; flipH: boolean; flipV: boolean };
const INITIAL_PLACEMENT: Placement = { x: 10, y: 10, scale: 0.6, rotation: 0, flipH: false, flipV: false };

const BLEND_MODES: { id: BlendMode; label: string; desc: string }[] = [
  { id: "normal", label: "Normal", desc: "Sem efeito" },
  { id: "multiply", label: "Multiply", desc: "Escurece, ideal para tecidos" },
  { id: "screen", label: "Screen", desc: "Clareia, ideal para fundos escuros" },
  { id: "overlay", label: "Overlay", desc: "Contraste, realça texturas" },
  { id: "darken", label: "Darken", desc: "Mantém tons escuros" },
  { id: "color-burn", label: "Color Burn", desc: "Saturação intensa" },
];

const MockupEditor = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const [approvedViews, setApprovedViews] = useState<Set<string>>(new Set());
  const [blendMode, setBlendMode] = useState<BlendMode>("normal");
  const [showTexture, setShowTexture] = useState(true);
  const [logoOpacity, setLogoOpacity] = useState(100);
  const [surfaceType, setSurfaceType] = useState<SurfaceType>("flat");
  const [warpedLogoUrl, setWarpedLogoUrl] = useState<string | null>(null);

  // Per-view placements
  const [placements, setPlacements] = useState<Record<string, Placement>>({
    front: { ...INITIAL_PLACEMENT },
    back: { ...INITIAL_PLACEMENT },
    "side-left": { ...INITIAL_PLACEMENT },
    "side-right": { ...INITIAL_PLACEMENT },
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const currentPlacement = placements[activeView] || INITIAL_PLACEMENT;
  const currentView = VIEWS.find(v => v.id === activeView)!;

  const CANVAS_SIZE = 460;
  const viewAreaW = (currentView.areaPercent.w / 100) * CANVAS_SIZE;
  const viewAreaH = (currentView.areaPercent.h / 100) * CANVAS_SIZE;

  const updatePlacement = (update: Partial<Placement>) => {
    setPlacements(prev => ({
      ...prev,
      [activeView]: { ...prev[activeView], ...update },
    }));
  };

  // ──────────────── Mesh Warp Effect ────────────────
  useEffect(() => {
    if (!logoPreview || surfaceType === "flat") {
      setWarpedLogoUrl(null);
      return;
    }
    clearWarpCache();
    const warpW = Math.max(64, Math.round(viewAreaW * currentPlacement.scale * 2));
    const warpH = Math.max(64, Math.round(viewAreaH * currentPlacement.scale * 2));
    getWarpedPreview(logoPreview, warpW, warpH, surfaceType, currentPlacement.rotation, currentPlacement.flipH, currentPlacement.flipV)
      .then(url => setWarpedLogoUrl(url))
      .catch(() => setWarpedLogoUrl(null));
  }, [logoPreview, surfaceType, currentPlacement.rotation, currentPlacement.flipH, currentPlacement.flipV, viewAreaW, viewAreaH, currentPlacement.scale]);

  const autoFitLogo = useCallback((dataUrl: string) => {
    const img = new window.Image();
    img.onload = () => {
      const fit = calculateAutoFit(img, viewAreaW, viewAreaH);
      updatePlacement({ x: fit.x, y: fit.y, scale: fit.scale });
      toast.success("Logo auto-encaixado");
    };
    img.src = dataUrl;
  }, [viewAreaW, viewAreaH]);

  const handleLogoUpload = useCallback((file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setLogoPreview(dataUrl);
      const img = new window.Image();
      img.onload = () => {
        setLogoColors(countUniqueColors(img));
        const fit = calculateAutoFit(img, viewAreaW, viewAreaH);
        updatePlacement({ x: fit.x, y: fit.y, scale: fit.scale });
        toast.success("Logo auto-encaixado na área de gravação");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [viewAreaW, viewAreaH]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleLogoUpload(file);
  }, [handleLogoUpload]);

  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - currentPlacement.x, y: e.clientY - currentPlacement.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    updatePlacement({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const centerLogo = () => {
    if (!areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    updatePlacement({ x: rect.width * 0.15, y: rect.height * 0.15 });
  };

  const toggleApproval = (viewId: string) => {
    setApprovedViews(prev => {
      const next = new Set(prev);
      if (next.has(viewId)) next.delete(viewId);
      else next.add(viewId);
      return next;
    });
  };

  const allApproved = VIEWS.every(v => approvedViews.has(v.id));

  // ──────────── Export ────────────
  const handleExportPng = useCallback(async () => {
    setIsExporting(true);
    try {
      const productImg = await loadImageWithFallback(productImage);
      const canvas = document.createElement("canvas");
      // 2x2 grid of views
      const size = 1200;
      canvas.width = size * 2;
      canvas.height = size * 2;
      const ctx = canvas.getContext("2d")!;

      for (let i = 0; i < VIEWS.length; i++) {
        const view = VIEWS[i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const ox = col * size;
        const oy = row * size;

        // White bg
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(ox, oy, size, size);

        // Product
        const scale = (size * 0.8) / Math.max(productImg.width, productImg.height);
        const dx = ox + (size - productImg.width * scale) / 2;
        const dy = oy + (size - productImg.height * scale) / 2;
        ctx.drawImage(productImg, dx, dy, productImg.width * scale, productImg.height * scale);

        // View label
        ctx.fillStyle = "#333333";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText(view.label, ox + 20, oy + 36);

        // Approval badge
        if (approvedViews.has(view.id)) {
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(ox + size - 30, oy + 30, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 16px sans-serif";
          ctx.fillText("✓", ox + size - 37, oy + 36);
        }

        // Separator lines
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 2;
        if (col === 0) { ctx.beginPath(); ctx.moveTo(size, oy); ctx.lineTo(size, oy + size); ctx.stroke(); }
        if (row === 0) { ctx.beginPath(); ctx.moveTo(ox, size); ctx.lineTo(ox + size, size); ctx.stroke(); }
      }

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mockup-multiview-${productSku}-HD.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PNG multivistas exportado (2400x2400px)");
      }, "image/png");
    } catch {
      toast.error("Erro ao exportar");
    } finally {
      setIsExporting(false);
    }
  }, [productImage, productSku, approvedViews]);

  const handleExportPdf = () => {
    const pdf = generateApprovalPdf({
      productName,
      technique: technique || "N/A",
      dimensions: { width: areaW, height: areaH },
      colors: logoColors.slice(0, 5),
      area: areaName,
      date: new Date().toLocaleDateString("pt-BR"),
      mockupImageDataUrl: "",
    });
    pdf.save(`mockup-editor-${productSku}-${Date.now()}.pdf`);
    toast.success("PDF de aprovação gerado");
  };


  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-3.5 h-3.5" /> Voltar
          </Button>
          <div className="w-px h-5 bg-border" />
          <h1 className="text-sm font-semibold text-foreground">Editor Multivistas</h1>
          <span className="text-xs text-muted-foreground font-mono">{productName}</span>
        </div>
        <div className="flex items-center gap-2">
          {allApproved && (
            <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-md flex items-center gap-1">
              <Check className="w-3 h-3" /> Todas as vistas aprovadas
            </span>
          )}
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={handleExportPdf}>
            <FileText className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button size="sm" className="text-xs gap-1.5 h-8" onClick={handleExportPng} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG HD
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* ═══════════ Left: View Thumbnails ═══════════ */}
        <div className="w-[100px] bg-card border-r border-border flex flex-col gap-1 p-2 overflow-y-auto">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`relative rounded-lg border-2 p-1 transition-all text-center ${
                activeView === view.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="aspect-square bg-muted rounded flex items-center justify-center relative overflow-hidden">
                <img
                  src={productImage}
                  alt={view.label}
                  className="w-full h-full object-contain opacity-60"
                  style={{ transform: view.bgRotation ? `rotate(${view.bgRotation}deg)` : undefined }}
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />
                {/* Mini area overlay */}
                <div
                  className="absolute border border-dashed border-primary/50 bg-primary/10 rounded-sm"
                  style={{
                    left: `${view.areaPercent.x}%`,
                    top: `${view.areaPercent.y}%`,
                    width: `${view.areaPercent.w}%`,
                    height: `${view.areaPercent.h}%`,
                  }}
                />
                {/* Approval badge */}
                {approvedViews.has(view.id) && (
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <span className="text-[9px] font-medium text-foreground mt-1 block">{view.label}</span>
            </button>
          ))}
        </div>

        {/* ═══════════ Center: Active View Canvas ═══════════ */}
        <div className="flex-1 flex flex-col">
          {/* Canvas toolbar */}
          <div className="h-10 bg-card border-b border-border flex items-center justify-between px-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded transition-colors ${showGrid ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                title="Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={centerLogo} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Centralizar">
                <Maximize className="w-4 h-4" />
              </button>
              <button onClick={() => updatePlacement({ flipH: !currentPlacement.flipH })} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Flip H">
                <FlipHorizontal className="w-4 h-4" />
              </button>
              <button onClick={() => updatePlacement({ flipV: !currentPlacement.flipV })} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Flip V">
                <FlipVertical className="w-4 h-4" />
              </button>
              <button onClick={() => updatePlacement({ rotation: currentPlacement.rotation + 15 })} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Rotacionar">
                <RotateCw className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <span className="text-[10px] font-mono text-primary">{currentView.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground ml-1">({areaW}×{areaH}cm)</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(Math.max(50, zoom - 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-muted-foreground w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(300, zoom + 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div
            className="flex-1 flex items-center justify-center overflow-auto relative"
            style={{ background: "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%) 50% / 20px 20px" }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="relative bg-white rounded-xl border border-border shadow-lg select-none"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
            >
              {/* Product image */}
              <img
                src={productImage}
                alt={productName}
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
                style={{ transform: currentView.bgRotation ? `rotate(${currentView.bgRotation}deg)` : undefined }}
                onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
              />

              {/* Grid */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none z-[5]" style={{
                  backgroundImage: "linear-gradient(hsl(var(--primary) / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.06) 1px, transparent 1px)",
                  backgroundSize: "25px 25px",
                }} />
              )}

              {/* Customization area */}
              <div
                ref={areaRef}
                className="absolute border-2 border-dashed border-primary/40 rounded bg-primary/5"
                style={{
                  left: `${currentView.areaPercent.x}%`,
                  top: `${currentView.areaPercent.y}%`,
                  width: `${currentView.areaPercent.w}%`,
                  height: `${currentView.areaPercent.h}%`,
                }}
              >
                <span className="absolute -top-5 left-0 text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                  {currentView.label}
                </span>
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground">
                  {areaW}cm
                </span>
                <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground rotate-90">
                  {areaH}cm
                </span>

                {logoPreview && showLogo && (
                  <div
                    className={`absolute cursor-move ${isDragging ? "opacity-80" : ""}`}
                    style={{
                      left: currentPlacement.x,
                      top: currentPlacement.y,
                      width: `${currentPlacement.scale * 100}%`,
                      ...(surfaceType !== "flat" ? PERSPECTIVE_PRESETS.find(p => p.id === surfaceType)?.css : {}),
                    }}
                    onMouseDown={handleLogoMouseDown}
                  >
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain pointer-events-none" draggable={false}
                      style={{
                        mixBlendMode: blendMode,
                        opacity: logoOpacity / 100,
                        transform: `rotate(${currentPlacement.rotation}deg) scaleX(${currentPlacement.flipH ? -1 : 1}) scaleY(${currentPlacement.flipV ? -1 : 1})`,
                      }}
                    />
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-sm cursor-se-resize flex items-center justify-center border border-primary-foreground"
                    >
                      <GripVertical className="w-2.5 h-2.5 text-primary-foreground rotate-[-45deg]" />
                    </div>
                    <div className="absolute inset-0 border border-primary/60 rounded-sm pointer-events-none" />
                  </div>
                )}

                {!logoPreview && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors rounded"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5 text-primary/60 mb-1" />
                    <span className="text-[9px] text-primary/60 font-mono">Soltar logo aqui</span>
                  </div>
                )}
              </div>

              {/* View label on canvas */}
              <div className="absolute top-2 left-2 bg-card/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-semibold text-foreground">
                {currentView.icon} {currentView.label}
              </div>
            </div>
          </div>

          {/* Bottom: All Views Strip */}
          <div className="h-[140px] bg-card border-t border-border flex items-center gap-3 px-4 overflow-x-auto shrink-0">
            {VIEWS.map((view) => (
              <motion.button
                key={view.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveView(view.id)}
                className={`relative shrink-0 w-[110px] rounded-lg border-2 transition-all overflow-hidden ${
                  activeView === view.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="aspect-square bg-white flex items-center justify-center relative">
                  <img
                    src={productImage}
                    alt={view.label}
                    className="w-full h-full object-contain p-1"
                    style={{ transform: view.bgRotation ? `rotate(${view.bgRotation}deg)` : undefined }}
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                  {/* Mini area */}
                  <div
                    className="absolute border border-dashed border-primary/30 bg-primary/5 rounded-sm"
                    style={{
                      left: `${view.areaPercent.x}%`,
                      top: `${view.areaPercent.y}%`,
                      width: `${view.areaPercent.w}%`,
                      height: `${view.areaPercent.h}%`,
                    }}
                  />
                  {approvedViews.has(view.id) && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="p-1.5 bg-card text-center">
                  <span className="text-[10px] font-semibold text-foreground">{view.label}</span>
                </div>
              </motion.button>
            ))}

            <div className="shrink-0 w-px h-20 bg-border mx-2" />

            {/* Approval summary */}
            <div className="shrink-0 flex flex-col items-center justify-center px-4">
              <div className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Aprovação</div>
              <div className="text-2xl font-bold text-foreground">
                {approvedViews.size}<span className="text-muted-foreground text-lg">/{VIEWS.length}</span>
              </div>
              {allApproved && (
                <span className="text-[9px] text-green-400 font-semibold mt-1">✓ Completo</span>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════ Right Panel ═══════════ */}
        <div className="w-64 bg-card border-l border-border flex flex-col overflow-y-auto">
          {/* Product info */}
          <div className="p-4 border-b border-border">
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Produto</h3>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center p-1 shrink-0">
                <img src={productImage} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{productName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{productSku}</p>
              </div>
            </div>
            {technique && (
              <span className="inline-block text-[10px] text-primary font-mono mt-2 bg-primary/10 px-1.5 py-0.5 rounded">{technique}</span>
            )}
          </div>

          {/* Logo */}
          <div className="p-4 border-b border-border">
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Logo</h3>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {logoFile ? logoFile.name.slice(0, 18) : "Upload Logo"}
            </Button>
            {logoPreview && (
              <div className="flex items-center gap-1 mt-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs flex-1 gap-1" onClick={() => setShowLogo(!showLogo)}>
                  {showLogo ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {showLogo ? "Ocultar" : "Mostrar"}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" onClick={() => { setLogoPreview(null); setLogoFile(null); setLogoColors([]); }}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
            {logoColors.length > 0 && (
              <div className="mt-3">
                <label className="text-[10px] font-mono text-muted-foreground uppercase">Cores Detectadas</label>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {logoColors.slice(0, 6).map((color, i) => (
                    <div key={i} className="w-5 h-5 rounded border border-border" style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Appearance panel (Recraft-inspired) */}
          <div className="p-4 border-b border-border">
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Aparência</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground mb-1.5 block">Blend Mode</label>
                <div className="grid grid-cols-2 gap-1">
                  {BLEND_MODES.map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => setBlendMode(bm.id)}
                      title={bm.desc}
                      className={`px-2 py-1.5 rounded text-[10px] transition-all ${
                        blendMode === bm.id
                          ? "bg-primary/20 text-primary border border-primary/40"
                          : "bg-surface-2 text-muted-foreground border border-border hover:border-primary/30"
                      }`}
                    >
                      {bm.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono text-muted-foreground">Opacidade</label>
                  <span className="text-[10px] font-mono text-primary">{logoOpacity}%</span>
                </div>
                <Slider
                  value={[logoOpacity]}
                  onValueChange={([v]) => setLogoOpacity(v)}
                  min={10} max={100} step={5}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-muted-foreground">Textura</label>
                <button
                  onClick={() => setShowTexture(!showTexture)}
                  className={`px-2 py-1 rounded text-[10px] border transition-all ${
                    showTexture
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-surface-2 text-muted-foreground border-border"
                  }`}
                >
                  {showTexture ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>
          {/* Auto-Fit & Surface */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Auto-Fit</h3>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1"
                disabled={!logoPreview}
                onClick={() => logoPreview && autoFitLogo(logoPreview)}
              >
                <Maximize className="w-3 h-3" /> Encaixar
              </Button>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground mb-1.5 block">Superfície</label>
              <div className="grid grid-cols-2 gap-1">
                {PERSPECTIVE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSurfaceType(preset.id)}
                    title={preset.description}
                    className={`px-2 py-1.5 rounded text-[10px] transition-all ${
                      surfaceType === preset.id
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "bg-muted text-muted-foreground border border-border hover:border-primary/30"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 border-b border-border">
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
              Posição — {currentView.label}
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono text-muted-foreground">Escala</label>
                  <span className="text-[10px] font-mono text-primary">{Math.round(currentPlacement.scale * 100)}%</span>
                </div>
                <Slider
                  value={[currentPlacement.scale * 100]}
                  onValueChange={([v]) => updatePlacement({ scale: v / 100 })}
                  min={10} max={200} step={5}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono text-muted-foreground">Rotação</label>
                  <span className="text-[10px] font-mono text-primary">{currentPlacement.rotation}°</span>
                </div>
                <Slider
                  value={[currentPlacement.rotation]}
                  onValueChange={([v]) => updatePlacement({ rotation: v })}
                  min={-180} max={180} step={5}
                />
              </div>
            </div>
          </div>

          {/* Per-view approval */}
          <div className="p-4 border-b border-border">
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Aprovação por Vista</h3>
            <div className="space-y-1.5">
              {VIEWS.map((view) => (
                <button
                  key={view.id}
                  onClick={() => toggleApproval(view.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs ${
                    approvedViews.has(view.id)
                      ? "border-green-500/40 bg-green-500/10 text-green-400"
                      : "border-border hover:border-primary/40 text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{view.icon}</span>
                    <span className="font-medium">{view.label}</span>
                  </span>
                  {approvedViews.has(view.id) ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-muted-foreground/40" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Export */}
          <div className="p-4 mt-auto space-y-2">
            <Button className="w-full gap-2 text-xs" onClick={handleExportPdf}>
              <Printer className="w-3.5 h-3.5" /> Layout Aprovação (PDF)
            </Button>
            <Button variant="outline" className="w-full gap-2 text-xs" onClick={handleExportPng} disabled={isExporting}>
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG Multivistas
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockupEditor;
