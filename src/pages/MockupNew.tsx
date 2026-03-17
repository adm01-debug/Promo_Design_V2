import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, ZoomIn, ZoomOut, RotateCw, Download, Save,
  ChevronDown, Move, FileText, Palette, GripVertical,
  Search, Loader2, Package, ChevronLeft, Undo2, Redo2,
  Grid3X3, Ruler, AlignCenter, Lock, Unlock, Eye, EyeOff,
  Copy, Trash2, FlipHorizontal, FlipVertical, Maximize, Layers,
  Sparkles, Wand2, ImageOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useProducts, useProductImages, useProductVariants, usePrintAreaTechniques, getProductImageUrl } from "@/hooks/use-products";
import type { DbProduct, DbPrintAreaTechnique, DbProductVariant } from "@/lib/db-types";
import { countUniqueColors, composeMockup, loadImageWithFallback, calculateAutoFit, detectSurfaceType, PERSPECTIVE_PRESETS, type SurfaceType } from "@/lib/canvas-utils";
import { getWarpedPreview, clearWarpCache, applyMeshWarp } from "@/lib/mesh-warp";
import { generateApprovalPdf } from "@/lib/pdf-export";
import { toast } from "sonner";
import { useMockupDrafts } from "@/hooks/use-mockup-drafts";
import { supabase } from "@/integrations/supabase/client";

// ──────────────── Templates ────────────────
const MOCKUP_TEMPLATES = [
  { id: "camiseta-frente", name: "Camiseta - Frente", category: "Vestuário", area: { x: 35, y: 20, w: 30, h: 35 }, aspectHint: "portrait" },
  { id: "camiseta-costas", name: "Camiseta - Costas", category: "Vestuário", area: { x: 30, y: 15, w: 40, h: 40 }, aspectHint: "portrait" },
  { id: "caneca-lateral", name: "Caneca - Lateral", category: "Drinkware", area: { x: 20, y: 25, w: 60, h: 50 }, aspectHint: "landscape" },
  { id: "caderno-capa", name: "Caderno - Capa", category: "Papelaria", area: { x: 15, y: 10, w: 70, h: 80 }, aspectHint: "portrait" },
  { id: "sacola-frente", name: "Sacola - Frente", category: "Embalagem", area: { x: 25, y: 20, w: 50, h: 40 }, aspectHint: "portrait" },
  { id: "squeeze-corpo", name: "Squeeze - Corpo", category: "Drinkware", area: { x: 25, y: 20, w: 50, h: 60 }, aspectHint: "portrait" },
  { id: "bone-frente", name: "Boné - Frente", category: "Vestuário", area: { x: 30, y: 30, w: 40, h: 25 }, aspectHint: "landscape" },
  { id: "pen-drive", name: "Pen Drive", category: "Tech", area: { x: 20, y: 35, w: 60, h: 30 }, aspectHint: "landscape" },
];

type Placement = { x: number; y: number; scale: number; rotation: number; flipH: boolean; flipV: boolean };
type HistoryEntry = { placement: Placement; logoPreview: string | null };
type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";
type ExportFormat = "png" | "jpeg" | "webp";

const BLEND_MODES: { id: BlendMode; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
  { id: "darken", label: "Darken" },
  { id: "color-burn", label: "Color Burn" },
];

const INITIAL_PLACEMENT: Placement = { x: 10, y: 10, scale: 0.8, rotation: 0, flipH: false, flipV: false };

const MockupNew = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { saveDraft, getDraft, isSaving } = useMockupDrafts();
  const [draftId, setDraftId] = useState<string | null>(searchParams.get("draft"));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(null);
  const [selectedArea, setSelectedArea] = useState<DbPrintAreaTechnique | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<DbProductVariant | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoColors, setLogoColors] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [placement, setPlacement] = useState<Placement>(INITIAL_PLACEMENT);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [step, setStep] = useState<"product" | "area" | "canvas">("product");
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [lockAspect, setLockAspect] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [surfaceType, setSurfaceType] = useState<SurfaceType>("flat");
  const [warpedLogoUrl, setWarpedLogoUrl] = useState<string | null>(null);
  const [isWarping, setIsWarping] = useState(false);
  const [blendMode, setBlendMode] = useState<BlendMode>("normal");
  const [logoOpacity, setLogoOpacity] = useState(100);
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowIntensity, setShadowIntensity] = useState(40);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isSuggestingPlacement, setIsSuggestingPlacement] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  // Undo/Redo
  const [history, setHistory] = useState<HistoryEntry[]>([{ placement: INITIAL_PLACEMENT, logoPreview: null }]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Data from external Supabase
  const { data: productsData, isLoading: productsLoading } = useProducts({
    search, page, pageSize: 24, onlyWithImages: false,
  });
  const { data: productImages } = useProductImages(selectedProduct?.id || null);
  const { data: printAreas } = usePrintAreaTechniques(selectedProduct?.id || null);
  const { data: variants } = useProductVariants(selectedProduct?.id || null);

  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = Math.ceil(totalProducts / 24);

  const selectedProductImage = selectedProduct
    ? (
        selectedVariant?.selected_thumbnail ||
        productImages?.find(i => selectedVariant?.id && i.variant_id === selectedVariant.id)?.url_cdn ||
        productImages?.find(i => selectedVariant?.color_name && i.applies_to_color && i.color_id === selectedVariant.id)?.url_cdn ||
        productImages?.find(i => i.is_primary)?.url_cdn ||
        getProductImageUrl(selectedProduct)
      )
    : null;

  const colorVariants = (variants || []).filter(v => v.color_hex);

  // Area dimensions (used by auto-fit and canvas)
  const areaW = selectedArea ? Math.min(selectedArea.max_width * 20, 400) : 200;
  const areaH = selectedArea ? Math.min(selectedArea.max_height * 20, 400) : 200;

  // ──────────────── History helpers ────────────────
  const pushHistory = useCallback((p: Placement, logo: string | null) => {
    setHistory(prev => [...prev.slice(0, historyIdx + 1), { placement: p, logoPreview: logo }]);
    setHistoryIdx(prev => prev + 1);
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const entry = history[historyIdx - 1];
    setPlacement(entry.placement);
    setLogoPreview(entry.logoPreview);
    setHistoryIdx(prev => prev - 1);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const entry = history[historyIdx + 1];
    setPlacement(entry.placement);
    setLogoPreview(entry.logoPreview);
    setHistoryIdx(prev => prev + 1);
  }, [history, historyIdx]);

  // ──────────────── Keyboard shortcuts ────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (step !== "canvas") return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === "g" && !ctrl) setShowGrid(prev => !prev);
      if (e.key === "r" && !ctrl) setShowRulers(prev => !prev);
      if (e.key === "+" || e.key === "=") setZoom(prev => Math.min(400, prev + 25));
      if (e.key === "-") setZoom(prev => Math.max(25, prev - 25));
      if (e.key === "Delete" || e.key === "Backspace") { setLogoPreview(null); setLogoFile(null); setWarpedLogoUrl(null); clearWarpCache(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [step, undo, redo]);

  // ──────────────── Mesh Warp Cache Reset ────────────────
  useEffect(() => {
    clearWarpCache();
    setWarpedLogoUrl(null);
  }, [logoPreview]);

  // ──────────────── Mesh Warp Effect ────────────────
  useEffect(() => {
    if (!logoPreview || surfaceType === "flat") {
      setWarpedLogoUrl(null);
      setIsWarping(false);
      return;
    }

    let cancelled = false;
    setIsWarping(true);
    const logoDisplayW = areaW * placement.scale;
    const logoDisplayH = areaH * placement.scale;
    const warpW = Math.max(64, Math.round(logoDisplayW * 2));
    const warpH = Math.max(64, Math.round(logoDisplayH * 2));

    getWarpedPreview(logoPreview, warpW, warpH, surfaceType, placement.rotation, placement.flipH, placement.flipV)
      .then((url) => {
        if (cancelled) return;
        setWarpedLogoUrl(url);
        setIsWarping(false);
      })
      .catch(() => {
        if (cancelled) return;
        setWarpedLogoUrl(null);
        setIsWarping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [logoPreview, surfaceType, placement.rotation, placement.flipH, placement.flipV, areaW, areaH, placement.scale]);

  const autoFitLogo = useCallback((dataUrl: string) => {
    const img = new window.Image();
    img.onload = () => {
      const fit = calculateAutoFit(img, areaW, areaH);
      const newPlacement = { ...placement, x: fit.x, y: fit.y, scale: fit.scale };
      setPlacement(newPlacement);
      pushHistory(newPlacement, dataUrl);
      toast.success("Logo ajustado automaticamente à área");
    };
    img.src = dataUrl;
  }, [areaW, areaH, placement, pushHistory]);

  const handleLogoUpload = useCallback((file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      clearWarpCache();
      setWarpedLogoUrl(null);
      setLogoPreview(dataUrl);
      // Auto-detect surface type from template
      if (selectedTemplate) {
        const tpl = MOCKUP_TEMPLATES.find(t => t.id === selectedTemplate);
        if (tpl) setSurfaceType(detectSurfaceType(tpl.category, tpl.id));
      }
      // Auto-fit
      const img = new window.Image();
      img.onload = () => {
        setLogoColors(countUniqueColors(img));
        const fit = calculateAutoFit(img, areaW, areaH);
        const newPlacement = { ...placement, x: fit.x, y: fit.y, scale: fit.scale };
        setPlacement(newPlacement);
        pushHistory(newPlacement, dataUrl);
        toast.success("Logo auto-encaixado na área de gravação");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [placement, pushHistory, areaW, areaH, selectedTemplate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleLogoUpload(file);
  }, [handleLogoUpload]);

  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - placement.x, y: e.clientY - placement.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;
      // Snap to center guides
      if (showGuides && areaRef.current) {
        const rect = areaRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        if (Math.abs(newX - centerX + 50) < 8) newX = centerX - 50;
        if (Math.abs(newY - centerY + 50) < 8) newY = centerY - 50;
      }
      setPlacement((p) => ({ ...p, x: newX, y: newY }));
    }
    if (isResizing) {
      const rect = areaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = e.clientX - rect.left;
      setPlacement((p) => ({ ...p, scale: Math.max(0.1, Math.min(2, relX / (rect.width * 0.5))) }));
    }
  };

  const handleMouseUp = () => {
    if (isDragging || isResizing) {
      pushHistory(placement, logoPreview);
    }
    setIsDragging(false);
    setIsResizing(false);
  };

  // ──────────────── Export ────────────────
  const handleExportImage = useCallback(async (format: ExportFormat = "png") => {
    if (!selectedProduct || !selectedProductImage) return;
    setIsExporting(true);
    try {
      const productImg = await loadImageWithFallback(selectedProductImage);
      const canvas = document.createElement("canvas");
      canvas.width = 2400;
      canvas.height = 2400;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 2400, 2400);
      const scale = 2400 / Math.max(productImg.width, productImg.height);
      const dx = (2400 - productImg.width * scale) / 2;
      const dy = (2400 - productImg.height * scale) / 2;
      ctx.drawImage(productImg, dx, dy, productImg.width * scale, productImg.height * scale);

      if (logoPreview) {
        const logoImg = await loadImageWithFallback(logoPreview);
        const exportAreaW = selectedArea ? Math.min(selectedArea.max_width * 20, 400) : 200;
        const exportAreaH = selectedArea ? Math.min(selectedArea.max_height * 20, 400) : 200;
        const logoScale = (exportAreaW * placement.scale * scale) / 500;
        const logoW = Math.round(logoImg.width * logoScale);
        const logoH = Math.round(logoImg.height * logoScale);

        let drawSource: HTMLImageElement | HTMLCanvasElement = logoImg;
        if (surfaceType !== "flat") {
          drawSource = applyMeshWarp(logoImg, logoW, logoH, surfaceType);
        }

        ctx.save();
        ctx.globalAlpha = logoOpacity / 100;
        ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
        ctx.translate(
          dx + (250 - exportAreaW / 2 + placement.x) * scale,
          dy + (250 - exportAreaH / 2 + placement.y) * scale
        );
        if (surfaceType === "flat") {
          ctx.rotate((placement.rotation * Math.PI) / 180);
          if (placement.flipH) ctx.scale(-1, 1);
          if (placement.flipV) ctx.scale(1, -1);
        }

        if (shadowEnabled) {
          ctx.shadowColor = `rgba(0, 0, 0, ${shadowIntensity / 100})`;
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
        }

        ctx.drawImage(drawSource, 0, 0, logoW, logoH);
        ctx.restore();
      }

      const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
      const quality = format === "png" ? undefined : 0.92;

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mockup-${selectedProduct.sku}-HD.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${format.toUpperCase()} exportado em alta resolução (2400px)`);
      }, mimeType, quality);
    } catch {
      toast.error("Erro ao exportar");
    } finally {
      setIsExporting(false);
    }
  }, [selectedProduct, selectedProductImage, logoPreview, placement, selectedArea, surfaceType, blendMode, logoOpacity, shadowEnabled, shadowIntensity]);

  const handleExportPng = useCallback(() => handleExportImage(exportFormat), [handleExportImage, exportFormat]);

  const handleExportPdf = () => {
    if (!selectedProduct || !selectedArea) return;
    const pdf = generateApprovalPdf({
      productName: selectedProduct.name,
      technique: selectedProduct.engraving_type || "N/A",
      dimensions: { width: selectedArea.max_width, height: selectedArea.max_height },
      colors: logoColors.slice(0, 5),
      area: selectedArea.location_name,
      date: new Date().toLocaleDateString("pt-BR"),
      mockupImageDataUrl: "",
    });
    pdf.save(`mockup-${selectedProduct.sku}-${Date.now()}.pdf`);
    toast.success("PDF de aprovação gerado");
  };

  const centerLogo = () => {
    if (!areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const newPlacement = { ...placement, x: rect.width * 0.15, y: rect.height * 0.15 };
    setPlacement(newPlacement);
    pushHistory(newPlacement, logoPreview);
  };

  // ──────────────── Draft save/restore ────────────────
  const autoSaveRef = useRef(false);

  const handleSaveDraft = useCallback(async (silent = false) => {
    const editorState: Record<string, unknown> = {
      placement,
      logoPreview,
      logoColors,
      step,
      zoom,
      showGrid,
      showRulers,
      showGuides,
      lockAspect,
      showLogo,
      surfaceType,
      selectedTemplate,
      blendMode,
      logoOpacity,
      shadowEnabled,
      shadowIntensity,
      selectedProductId: selectedProduct?.id ?? null,
      selectedAreaId: selectedArea?.id ?? null,
      selectedVariantId: selectedVariant?.id ?? null,
    };

    try {
      const name = selectedProduct
        ? `${selectedProduct.name}${selectedArea ? ` – ${selectedArea.location_name}` : ""}`
        : "Rascunho sem produto";

      const result = await saveDraft({
        id: draftId ?? undefined,
        name,
        productName: selectedProduct?.name ?? null,
        productSku: selectedProduct?.sku ?? null,
        thumbnailUrl: selectedProductImage ?? null,
        editorState,
      });

      if (!draftId) {
        setDraftId(result.id);
        setSearchParams({ draft: result.id }, { replace: true });
      }
      if (!silent) toast.success("Rascunho salvo na nuvem!");
    } catch {
      if (!silent) toast.error("Erro ao salvar rascunho.");
    }
  }, [placement, logoPreview, logoColors, step, zoom, showGrid, showRulers, showGuides, lockAspect, showLogo, surfaceType, selectedTemplate, blendMode, logoOpacity, shadowEnabled, shadowIntensity, selectedProduct, selectedArea, selectedVariant, selectedProductImage, draftId, saveDraft, setSearchParams]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!selectedProduct && !logoPreview) return;
    const interval = setInterval(() => {
      autoSaveRef.current = true;
      handleSaveDraft(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [handleSaveDraft, selectedProduct, logoPreview]);

  // Restore draft when drafts finish loading
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (draftRestoredRef.current) return;
    const draftParam = searchParams.get("draft");
    if (!draftParam) return;
    const draft = getDraft(draftParam);
    if (!draft?.editorState) return;
    draftRestoredRef.current = true;
    setDraftId(draftParam);
    const s = draft.editorState as Record<string, any>;
    if (s.placement) setPlacement(s.placement as Placement);
    if (s.logoPreview) setLogoPreview(s.logoPreview as string);
    if (s.logoColors) setLogoColors(s.logoColors as string[]);
    if (s.zoom) setZoom(s.zoom as number);
    if (s.showGrid !== undefined) setShowGrid(s.showGrid as boolean);
    if (s.showRulers !== undefined) setShowRulers(s.showRulers as boolean);
    if (s.showGuides !== undefined) setShowGuides(s.showGuides as boolean);
    if (s.lockAspect !== undefined) setLockAspect(s.lockAspect as boolean);
    if (s.showLogo !== undefined) setShowLogo(s.showLogo as boolean);
    if (s.surfaceType) setSurfaceType(s.surfaceType as SurfaceType);
    if (s.selectedTemplate) setSelectedTemplate(s.selectedTemplate as string);
    if (s.blendMode) setBlendMode(s.blendMode as BlendMode);
    if (s.logoOpacity !== undefined) setLogoOpacity(s.logoOpacity as number);
    if (s.shadowEnabled !== undefined) setShadowEnabled(s.shadowEnabled as boolean);
    if (s.shadowIntensity !== undefined) setShadowIntensity(s.shadowIntensity as number);
    if (s.step === "canvas" && s.logoPreview) setStep("canvas");
  }, [getDraft, searchParams]);

  // Canvas size
  const CANVAS_SIZE = 500;

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-foreground">Mockup Studio</h1>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {(["product", "area", "canvas"] as const).map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                {i > 0 && <ChevronDown className="w-3 h-3 rotate-[-90deg]" />}
                <button
                  onClick={() => {
                    if (s === "product") setStep(s);
                    else if (s === "area" && selectedProduct) setStep(s);
                    else if (s === "canvas" && selectedArea) setStep(s);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    step === s ? "bg-primary/20 text-primary font-medium" : "hover:text-foreground"
                  }`}
                >
                  {i + 1}. {s === "product" ? "Produto" : s === "area" ? "Área" : "Canvas"}
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step === "canvas" && (
            <>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-8" onClick={undo} disabled={historyIdx <= 0}>
                <Undo2 className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-8" onClick={redo} disabled={historyIdx >= history.length - 1}>
                <Redo2 className="w-3 h-3" />
              </Button>
              <div className="w-px h-5 bg-border" />
            </>
          )}
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-8" onClick={() => handleSaveDraft(false)} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {draftId ? "Atualizar" : "Salvar"}
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8" onClick={handleExportPdf}>
            <FileText className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button size="sm" className="text-xs gap-1.5 h-8" onClick={handleExportPng} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PNG HD
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ═══════════ STEP 1: Product Selection ═══════════ */}
          {step === "product" && (
            <motion.div key="product" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar produto por nome ou SKU... (6.100+ produtos)"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {productsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando produtos...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Package className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                      {products.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct(product);
                            setSelectedArea(null);
                            setSelectedVariant(null);
                            setStep("area");
                          }}
                          className={`group rounded-lg border transition-all overflow-hidden text-left ${
                            selectedProduct?.id === product.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="aspect-square bg-muted flex items-center justify-center p-2 relative">
                            <img
                              src={getProductImageUrl(product)}
                              alt={product.name}
                              className="w-full h-full object-contain"
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                            />
                            {product.allows_personalization && (
                              <span className="absolute top-1 right-1 text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">
                                PERS
                              </span>
                            )}
                          </div>
                          <div className="p-2 bg-card">
                            <h3 className="text-xs font-semibold text-foreground truncate">{product.name}</h3>
                            <p className="text-[10px] text-muted-foreground truncate">{product.sku}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs">
                          <ChevronLeft className="w-3 h-3" /> Anterior
                        </Button>
                        <span className="text-xs text-muted-foreground font-mono">{page + 1} / {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs">
                          Próximo <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════ STEP 2: Area & Technique ═══════════ */}
          {step === "area" && selectedProduct && (
            <motion.div key="area" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-6 overflow-auto">
              <div className="flex items-center gap-4 mb-6">
                {selectedProductImage && (
                  <div className="w-24 h-24 rounded-lg bg-muted border border-border flex items-center justify-center p-2 shrink-0">
                    <img src={selectedProductImage} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selectedProduct.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedProduct.sku} · {selectedProduct.brand || "Sem marca"}</p>
                  {selectedProduct.engraving_type && (
                    <span className="inline-block text-xs text-primary mt-1 font-mono bg-primary/10 px-2 py-0.5 rounded">{selectedProduct.engraving_type}</span>
                  )}
                </div>
              </div>

              {/* Color variants */}
              {colorVariants.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Cores Disponíveis</h3>
                  <div className="flex flex-wrap gap-2">
                    {colorVariants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(selectedVariant?.id === variant.id ? null : variant)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-left ${
                          selectedVariant?.id === variant.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40 bg-card"
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full border border-border shrink-0" style={{ backgroundColor: variant.color_hex || "#ccc" }} />
                        <span className="text-xs text-foreground">{variant.color_name || variant.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {colorVariants.length === 0 && selectedProduct.colors && selectedProduct.colors.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Cores</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.colors.map((color, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground">{color}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Templates */}
              <div className="mb-6">
                <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Templates Rápidos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MOCKUP_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTemplate(t.id);
                        setSelectedArea({
                          id: `tpl-${t.id}`,
                          product_id: selectedProduct.id,
                          tabela_preco_id: "",
                          max_width: t.area.w / 2,
                          max_height: t.area.h / 2,
                          is_curved: false,
                          shape: "rectangle",
                          location_code: t.id.toUpperCase(),
                          location_name: t.name,
                          location_order: 1,
                          gravacao_largura_max: t.area.w / 2,
                          gravacao_altura_max: t.area.h / 2,
                          is_active: true,
                        });
                        setStep("canvas");
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        selectedTemplate === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="w-full aspect-[4/3] bg-muted rounded-lg mb-2 flex items-center justify-center">
                        <div
                          className="border border-dashed border-primary/40 bg-primary/5 rounded"
                          style={{
                            width: `${t.area.w}%`,
                            height: `${t.area.h}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground block">{t.name}</span>
                      <span className="text-[9px] text-muted-foreground">{t.category}</span>
                    </button>
                  ))}
                </div>
              </div>

              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Áreas de Personalização do Produto</h3>

              {!printAreas || printAreas.length === 0 ? (
                <div className="p-4 rounded-xl bg-card border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-2">Nenhuma área cadastrada. Use um template acima ou crie área manual.</p>
                  <Button
                    onClick={() => {
                      setSelectedArea({
                        id: "manual",
                        product_id: selectedProduct.id,
                        tabela_preco_id: "",
                        max_width: selectedProduct.width_cm || 10,
                        max_height: selectedProduct.height_cm || 10,
                        is_curved: false,
                        shape: "rectangle",
                        location_code: "FRONTAL",
                        location_name: "Área Manual",
                        location_order: 1,
                        gravacao_largura_max: selectedProduct.width_cm || 10,
                        gravacao_altura_max: selectedProduct.height_cm || 10,
                        is_active: true,
                      });
                      setStep("canvas");
                    }}
                  >
                    Usar Área Manual →
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {printAreas.map((area) => (
                    <button
                      key={area.id}
                      onClick={() => { setSelectedArea(area); setStep("canvas"); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedArea?.id === area.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <Palette className={`w-5 h-5 mb-2 ${selectedArea?.id === area.id ? "text-primary" : "text-muted-foreground"}`} />
                      <h4 className="text-sm font-semibold text-foreground">{area.location_name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {area.max_width}×{area.max_height}cm · {area.shape}
                        {area.is_curved && " · Curvo"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════ STEP 3: Canvas ═══════════ */}
          {step === "canvas" && selectedProduct && selectedArea && (
            <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex">
              <div className="flex-1 flex flex-col">
                {/* Canvas toolbar */}
                <div className="h-10 bg-card border-b border-border flex items-center justify-between px-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded transition-colors ${showGrid ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} title="Grid (G)">
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowRulers(!showRulers)} className={`p-1.5 rounded transition-colors ${showRulers ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} title="Réguas (R)">
                      <Ruler className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowGuides(!showGuides)} className={`p-1.5 rounded transition-colors ${showGuides ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} title="Guias">
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <button onClick={centerLogo} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Centralizar logo">
                      <Maximize className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPlacement(p => ({ ...p, flipH: !p.flipH }))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Flip H">
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPlacement(p => ({ ...p, flipV: !p.flipV }))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Flip V">
                      <FlipVertical className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPlacement(p => ({ ...p, rotation: p.rotation + 15 }))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Rotacionar">
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {selectedArea.location_name} ({selectedArea.max_width}×{selectedArea.max_height}cm)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs font-mono text-muted-foreground w-12 text-center">{zoom}%</span>
                    <button onClick={() => setZoom(Math.min(400, zoom + 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"><ZoomIn className="w-4 h-4" /></button>
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
                  {/* Rulers */}
                  {showRulers && (
                    <>
                      {/* Top ruler */}
                      <div className="absolute top-0 left-8 right-0 h-6 bg-card/90 border-b border-border z-20 flex items-end overflow-hidden">
                        {Array.from({ length: Math.ceil(CANVAS_SIZE * (zoom / 100) / 20) + 1 }).map((_, i) => (
                          <div key={i} className="flex flex-col items-center" style={{ position: "absolute", left: i * 20 }}>
                            <span className="text-[7px] font-mono text-muted-foreground">{i}</span>
                            <div className="w-px h-2 bg-border" />
                          </div>
                        ))}
                      </div>
                      {/* Left ruler */}
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
                    style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
                  >
                    {selectedProductImage && (
                      <img
                        src={selectedProductImage}
                        alt={selectedProduct.name}
                        className="w-full h-full object-contain pointer-events-none"
                        draggable={false}
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                      />
                    )}

                    {/* Grid overlay */}
                    {showGrid && (
                      <div className="absolute inset-0 pointer-events-none z-5" style={{
                        backgroundImage: "linear-gradient(hsl(var(--primary) / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.06) 1px, transparent 1px)",
                        backgroundSize: "25px 25px",
                      }} />
                    )}

                    {/* Center guides */}
                    {showGuides && (
                      <>
                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-primary/20 pointer-events-none z-5" />
                        <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/20 pointer-events-none z-5" />
                      </>
                    )}

                    {/* Customization area */}
                    <div
                      ref={areaRef}
                      className="absolute border-2 border-dashed border-primary/40 rounded bg-primary/5"
                      style={{
                        left: "50%", top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: areaW, height: areaH,
                      }}
                    >
                      <span className="absolute -top-5 left-0 text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {selectedArea.location_name}
                      </span>
                      {/* Dimension labels */}
                      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground">
                        {selectedArea.max_width}cm
                      </span>
                      <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground rotate-90">
                        {selectedArea.max_height}cm
                      </span>

                      {logoPreview && showLogo && (
                        <div
                          className={`absolute cursor-move ${isDragging ? "opacity-80" : ""} ${isWarping ? "animate-pulse" : ""}`}
                          style={{
                            left: placement.x,
                            top: placement.y,
                            width: `${placement.scale * 100}%`,
                          }}
                          onMouseDown={handleLogoMouseDown}
                        >
                          <img
                            src={warpedLogoUrl && surfaceType !== "flat" ? warpedLogoUrl : logoPreview}
                            alt="Logo"
                            className="w-full h-full object-contain pointer-events-none"
                            draggable={false}
                            style={{
                              mixBlendMode: blendMode,
                              opacity: logoOpacity / 100,
                              filter: shadowEnabled ? `drop-shadow(3px 3px ${Math.round(shadowIntensity / 5)}px rgba(0,0,0,${shadowIntensity / 100}))` : undefined,
                              ...(surfaceType === "flat" ? {
                                transform: `rotate(${placement.rotation}deg) scaleX(${placement.flipH ? -1 : 1}) scaleY(${placement.flipV ? -1 : 1})`,
                              } : {}),
                            }}
                          />
                          <div
                            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-sm cursor-se-resize flex items-center justify-center border border-primary-foreground"
                            onMouseDown={(e) => { e.stopPropagation(); setIsResizing(true); }}
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
                          <Upload className="w-6 h-6 text-primary/60 mb-1" />
                          <span className="text-[10px] text-primary/60 font-mono">Soltar logo aqui</span>
                          <span className="text-[8px] text-muted-foreground mt-1">ou clique para upload</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══════════ Right Panel ═══════════ */}
              <div className="w-64 bg-card border-l border-border flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-border">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Produto</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center p-1 shrink-0">
                      {selectedProductImage && <img src={selectedProductImage} alt="" className="w-full h-full object-contain" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{selectedProduct.name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedProduct.sku}</p>
                    </div>
                  </div>
                  {selectedProduct.engraving_type && (
                    <span className="inline-block text-[10px] text-primary font-mono mt-2 bg-primary/10 px-1.5 py-0.5 rounded">{selectedProduct.engraving_type}</span>
                  )}
                  {colorVariants.length > 0 && (
                    <div className="mt-3">
                      <label className="text-[10px] font-mono text-muted-foreground uppercase">Cor</label>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {colorVariants.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              selectedVariant?.id === v.id ? "border-primary scale-110 ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                            }`}
                            style={{ backgroundColor: v.color_hex || "#ccc" }}
                            title={v.color_name || v.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-b border-border">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Logo</h3>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                  />
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
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" onClick={() => { setLogoPreview(null); setLogoFile(null); setLogoColors([]); setWarpedLogoUrl(null); clearWarpCache(); }}>
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
                        <span className="text-[9px] text-muted-foreground self-center ml-1">{logoColors.length} cores</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Appearance */}
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
                            className={`px-2 py-1.5 rounded text-[10px] transition-all ${
                              blendMode === bm.id
                                ? "bg-primary/20 text-primary border border-primary/40"
                                : "bg-muted text-muted-foreground border border-border hover:border-primary/30"
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
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-mono text-muted-foreground">Sombra</label>
                        <button
                          onClick={() => setShadowEnabled(!shadowEnabled)}
                          className={`px-2 py-1 rounded text-[10px] border transition-all ${
                            shadowEnabled
                              ? "bg-primary/20 text-primary border-primary/40"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {shadowEnabled ? "On" : "Off"}
                        </button>
                      </div>
                      {shadowEnabled && (
                        <div className="mt-1.5">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-mono text-muted-foreground">Intensidade</label>
                            <span className="text-[10px] font-mono text-primary">{shadowIntensity}%</span>
                          </div>
                          <Slider
                            value={[shadowIntensity]}
                            onValueChange={([v]) => setShadowIntensity(v)}
                            min={10} max={80} step={5}
                          />
                        </div>
                      )}
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
                    {surfaceType !== "flat" && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isWarping ? "bg-yellow-500 animate-pulse" : warpedLogoUrl ? "bg-green-500" : "bg-muted-foreground"}`} />
                        <span className="text-[9px] font-mono text-muted-foreground">
                          {isWarping ? "Aplicando mesh warp..." : warpedLogoUrl ? "Mesh warp ativo" : "Upload logo para ativar warp"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-b border-border">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Posição</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-mono text-muted-foreground">Escala</label>
                        <span className="text-[10px] font-mono text-primary">{Math.round(placement.scale * 100)}%</span>
                      </div>
                      <Slider
                        value={[placement.scale * 100]}
                        onValueChange={([v]) => setPlacement(p => ({ ...p, scale: v / 100 }))}
                        min={10} max={200} step={5}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-mono text-muted-foreground">Rotação</label>
                        <span className="text-[10px] font-mono text-primary">{placement.rotation}°</span>
                      </div>
                      <Slider
                        value={[placement.rotation]}
                        onValueChange={([v]) => setPlacement(p => ({ ...p, rotation: v }))}
                        min={-180} max={180} step={5}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 border-b border-border">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Área de Gravação</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted rounded-md p-2">
                      <span className="text-muted-foreground block text-[10px]">Largura</span>
                      <span className="text-foreground font-mono">{selectedArea.max_width}cm</span>
                    </div>
                    <div className="bg-muted rounded-md p-2">
                      <span className="text-muted-foreground block text-[10px]">Altura</span>
                      <span className="text-foreground font-mono">{selectedArea.max_height}cm</span>
                    </div>
                  </div>
                  <div className="mt-2 bg-muted rounded-md p-2 text-xs">
                    <span className="text-muted-foreground block text-[10px]">Formato</span>
                    <span className="text-foreground font-mono">{selectedArea.shape} {selectedArea.is_curved ? "(curvo)" : ""}</span>
                  </div>
                </div>

                {/* Shortcuts help */}
                <div className="p-4 border-b border-border">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Atalhos</h3>
                  <div className="space-y-1 text-[9px] text-muted-foreground">
                    <div className="flex justify-between"><span>Undo / Redo</span><span className="font-mono">⌘Z / ⌘Y</span></div>
                    <div className="flex justify-between"><span>Grid</span><span className="font-mono">G</span></div>
                    <div className="flex justify-between"><span>Réguas</span><span className="font-mono">R</span></div>
                    <div className="flex justify-between"><span>Zoom</span><span className="font-mono">+ / -</span></div>
                    <div className="flex justify-between"><span>Excluir logo</span><span className="font-mono">Del</span></div>
                  </div>
                </div>

                <div className="p-4 mt-auto space-y-2">
                  <Button
                    className="w-full gap-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      const params = new URLSearchParams({
                        product: selectedProduct.name,
                        sku: selectedProduct.sku,
                        material: selectedProduct.materials?.join(", ") || "",
                        productColors: selectedProduct.colors?.join(", ") || "",
                        technique: selectedProduct.engraving_type || "",
                        area: selectedArea.location_name,
                        aw: String(selectedArea.max_width),
                        ah: String(selectedArea.max_height),
                        shape: selectedArea.shape || "",
                        artColors: logoColors.join(", "),
                      });
                      navigate(`/mockup/service-order?${params.toString()}`);
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" /> Gerar Ordem de Serviço
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full gap-2 text-xs"
                    onClick={() => {
                      const params = new URLSearchParams({
                        product: selectedProduct.name,
                        sku: selectedProduct.sku,
                        image: selectedProductImage || "",
                        area: selectedArea.location_name,
                        aw: String(selectedArea.max_width),
                        ah: String(selectedArea.max_height),
                        technique: selectedProduct.engraving_type || "",
                      });
                      navigate(`/mockup/editor?${params.toString()}`);
                    }}
                  >
                    <Layers className="w-3.5 h-3.5" /> Editor Multivistas
                  </Button>
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 block">Formato</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(["png", "jpeg", "webp"] as ExportFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setExportFormat(fmt)}
                          className={`px-2 py-1.5 rounded text-[10px] font-mono uppercase transition-all ${
                            exportFormat === fmt
                              ? "bg-primary/20 text-primary border border-primary/40"
                              : "bg-muted text-muted-foreground border border-border hover:border-primary/30"
                          }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full gap-2 text-xs" onClick={handleExportPdf}>
                    <FileText className="w-3.5 h-3.5" /> Layout Aprovação (PDF)
                  </Button>
                  <Button variant="outline" className="w-full gap-2 text-xs" onClick={handleExportPng} disabled={isExporting}>
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} {exportFormat.toUpperCase()} Alta Resolução
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MockupNew;
