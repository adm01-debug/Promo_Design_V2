import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { countUniqueColors, loadImageWithFallback, calculateAutoFit, detectSurfaceType, PERSPECTIVE_PRESETS, type SurfaceType } from "@/features/mockup";
import { getWarpedPreview, clearWarpCache, applyMeshWarp } from "@/features/mockup";
import { generateApprovalPdf } from "@/features/mockup";
import { toast } from "sonner";
import { useMockupDrafts } from "@/features/mockup";
import { supabase } from "@/integrations/supabase/client";
import type { DbProduct, DbPrintAreaTechnique, DbProductVariant } from "@/features/mockup";

export type Placement = { x: number; y: number; scale: number; rotation: number; flipH: boolean; flipV: boolean };
export type HistoryEntry = { placement: Placement; logoPreview: string | null };
export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";
export type ExportFormat = "png" | "jpeg" | "webp";

export const BLEND_MODES: { id: BlendMode; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
  { id: "darken", label: "Darken" },
  { id: "color-burn", label: "Color Burn" },
];

export const INITIAL_PLACEMENT: Placement = { x: 10, y: 10, scale: 0.8, rotation: 0, flipH: false, flipV: false };

export const MOCKUP_TEMPLATES = [
  { id: "camiseta-frente", name: "Camiseta - Frente", category: "Vestuário", area: { x: 35, y: 20, w: 30, h: 35 }, aspectHint: "portrait" },
  { id: "camiseta-costas", name: "Camiseta - Costas", category: "Vestuário", area: { x: 30, y: 15, w: 40, h: 40 }, aspectHint: "portrait" },
  { id: "caneca-lateral", name: "Caneca - Lateral", category: "Drinkware", area: { x: 20, y: 25, w: 60, h: 50 }, aspectHint: "landscape" },
  { id: "caderno-capa", name: "Caderno - Capa", category: "Papelaria", area: { x: 15, y: 10, w: 70, h: 80 }, aspectHint: "portrait" },
  { id: "sacola-frente", name: "Sacola - Frente", category: "Embalagem", area: { x: 25, y: 20, w: 50, h: 40 }, aspectHint: "portrait" },
  { id: "squeeze-corpo", name: "Squeeze - Corpo", category: "Drinkware", area: { x: 25, y: 20, w: 50, h: 60 }, aspectHint: "portrait" },
  { id: "bone-frente", name: "Boné - Frente", category: "Vestuário", area: { x: 30, y: 30, w: 40, h: 25 }, aspectHint: "landscape" },
  { id: "pen-drive", name: "Pen Drive", category: "Tech", area: { x: 20, y: 35, w: 60, h: 30 }, aspectHint: "landscape" },
];

interface UseMockupEditorOptions {
  selectedProduct: DbProduct | null;
  selectedArea: DbPrintAreaTechnique | null;
  selectedVariant: DbProductVariant | null;
  selectedProductImage: string | null;
  selectedTemplate: string | null;
  step: "product" | "area" | "canvas";
}

export function useMockupEditor(options: UseMockupEditorOptions) {
  const { selectedProduct, selectedArea, selectedVariant, selectedProductImage, selectedTemplate, step } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const { saveDraft, getDraft, isSaving } = useMockupDrafts();

  const [draftId, setDraftId] = useState<string | null>(searchParams.get("draft"));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoColors, setLogoColors] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [placement, setPlacement] = useState<Placement>(INITIAL_PLACEMENT);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [lockAspect, setLockAspect] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
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

  const [history, setHistory] = useState<HistoryEntry[]>([{ placement: INITIAL_PLACEMENT, logoPreview: null }]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const areaW = selectedArea ? Math.min(selectedArea.max_width * 20, 400) : 200;
  const areaH = selectedArea ? Math.min(selectedArea.max_height * 20, 400) : 200;

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

  // Keyboard shortcuts
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

  // Mesh warp cache reset
  useEffect(() => { clearWarpCache(); setWarpedLogoUrl(null); }, [logoPreview]);

  // Mesh warp effect
  useEffect(() => {
    if (!logoPreview || surfaceType === "flat") { setWarpedLogoUrl(null); setIsWarping(false); return; }
    let cancelled = false;
    setIsWarping(true);
    const logoDisplayW = areaW * placement.scale;
    const logoDisplayH = areaH * placement.scale;
    const warpW = Math.max(64, Math.round(logoDisplayW * 2));
    const warpH = Math.max(64, Math.round(logoDisplayH * 2));
    getWarpedPreview(logoPreview, warpW, warpH, surfaceType, placement.rotation, placement.flipH, placement.flipV)
      .then((url) => { if (!cancelled) { setWarpedLogoUrl(url); setIsWarping(false); } })
      .catch(() => { if (!cancelled) { setWarpedLogoUrl(null); setIsWarping(false); } });
    return () => { cancelled = true; };
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
      if (selectedTemplate) {
        const tpl = MOCKUP_TEMPLATES.find(t => t.id === selectedTemplate);
        if (tpl) setSurfaceType(detectSurfaceType(tpl.category, tpl.id));
      }
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

  const handleRemoveBg = useCallback(async () => {
    if (!logoPreview) return;
    setIsRemovingBg(true);
    try {
      const { data, error } = await supabase.functions.invoke("mockup-ai", { body: { action: "remove-bg", imageBase64: logoPreview } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.imageBase64) {
        clearWarpCache(); setWarpedLogoUrl(null); setLogoPreview(data.imageBase64);
        pushHistory(placement, data.imageBase64);
        toast.success("Fundo removido com IA!");
      }
    } catch (e: unknown) {
      toast.error("Erro ao remover fundo: " + (e instanceof Error ? e.message : "Tente novamente"));
    } finally { setIsRemovingBg(false); }
  }, [logoPreview, placement, pushHistory]);

  const handleSuggestPlacement = useCallback(async () => {
    if (!selectedProduct) return;
    setIsSuggestingPlacement(true); setAiReasoning(null);
    try {
      const { data, error } = await supabase.functions.invoke("mockup-ai", {
        body: { action: "suggest-placement", productName: selectedProduct.name, templateId: selectedTemplate || "", areaWidth: selectedArea?.max_width || 15, areaHeight: selectedArea?.max_height || 15 },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      const newPlacement: Placement = { x: (data.xPercent / 100) * areaW, y: (data.yPercent / 100) * areaH, scale: Math.max(0.1, Math.min(1.5, data.scale)), rotation: data.rotation || 0, flipH: false, flipV: false };
      setPlacement(newPlacement);
      pushHistory(newPlacement, logoPreview);
      if (data.blendMode) setBlendMode(data.blendMode);
      if (data.surfaceType) setSurfaceType(data.surfaceType);
      if (data.opacity) setLogoOpacity(data.opacity);
      if (data.reasoning) setAiReasoning(data.reasoning);
      toast.success("Posicionamento sugerido pela IA aplicado!");
    } catch (e: unknown) {
      toast.error("Erro na sugestão de IA: " + (e instanceof Error ? e.message : "Tente novamente"));
    } finally { setIsSuggestingPlacement(false); }
  }, [selectedProduct, selectedTemplate, selectedArea, areaW, areaH, logoPreview, pushHistory]);

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
    if (isDragging || isResizing) pushHistory(placement, logoPreview);
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleExportImage = useCallback(async (format: ExportFormat = "png") => {
    if (!selectedProduct || !selectedProductImage) return;
    setIsExporting(true);
    try {
      const productImg = await loadImageWithFallback(selectedProductImage);
      const canvas = document.createElement("canvas");
      canvas.width = 2400; canvas.height = 2400;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 2400, 2400);
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
        if (surfaceType !== "flat") drawSource = applyMeshWarp(logoImg, logoW, logoH, surfaceType);
        ctx.save();
        ctx.globalAlpha = logoOpacity / 100;
        ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
        ctx.translate(dx + (250 - exportAreaW / 2 + placement.x) * scale, dy + (250 - exportAreaH / 2 + placement.y) * scale);
        if (surfaceType === "flat") {
          ctx.rotate((placement.rotation * Math.PI) / 180);
          if (placement.flipH) ctx.scale(-1, 1);
          if (placement.flipV) ctx.scale(1, -1);
        }
        if (shadowEnabled) { ctx.shadowColor = `rgba(0, 0, 0, ${shadowIntensity / 100})`; ctx.shadowBlur = 12; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3; }
        ctx.drawImage(drawSource, 0, 0, logoW, logoH);
        ctx.restore();
      }
      const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
      const quality = format === "png" ? undefined : 0.92;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `mockup-${selectedProduct.sku}-HD.${format}`; a.click();
        URL.revokeObjectURL(url);
        toast.success(`${format.toUpperCase()} exportado em alta resolução (2400px)`);
      }, mimeType, quality);
    } catch { toast.error("Erro ao exportar"); } finally { setIsExporting(false); }
  }, [selectedProduct, selectedProductImage, logoPreview, placement, selectedArea, surfaceType, blendMode, logoOpacity, shadowEnabled, shadowIntensity]);

  const handleExportPng = useCallback(() => handleExportImage(exportFormat), [handleExportImage, exportFormat]);

  const handleExportPdf = () => {
    if (!selectedProduct || !selectedArea) return;
    const pdf = generateApprovalPdf({
      productName: selectedProduct.name, technique: selectedProduct.engraving_type || "N/A",
      dimensions: { width: selectedArea.max_width, height: selectedArea.max_height },
      colors: logoColors.slice(0, 5), area: selectedArea.location_name,
      date: new Date().toLocaleDateString("pt-BR"), mockupImageDataUrl: "",
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

  const clearLogo = () => { setLogoPreview(null); setLogoFile(null); setLogoColors([]); setWarpedLogoUrl(null); clearWarpCache(); };

  // Draft save/restore
  const autoSaveRef = useRef(false);
  const handleSaveDraft = useCallback(async (silent = false) => {
    const editorState: Record<string, unknown> = {
      placement, logoPreview, logoColors, step, zoom, showGrid, showRulers, showGuides, lockAspect, showLogo,
      surfaceType, selectedTemplate, blendMode, logoOpacity, shadowEnabled, shadowIntensity,
      selectedProductId: selectedProduct?.id ?? null, selectedAreaId: selectedArea?.id ?? null, selectedVariantId: selectedVariant?.id ?? null,
    };
    try {
      const name = selectedProduct ? `${selectedProduct.name}${selectedArea ? ` – ${selectedArea.location_name}` : ""}` : "Rascunho sem produto";
      const result = await saveDraft({ id: draftId ?? undefined, name, productName: selectedProduct?.name ?? null, productSku: selectedProduct?.sku ?? null, thumbnailUrl: selectedProductImage ?? null, editorState });
      if (!draftId) { setDraftId(result.id); setSearchParams({ draft: result.id }, { replace: true }); }
      if (!silent) toast.success("Rascunho salvo na nuvem!");
    } catch { if (!silent) toast.error("Erro ao salvar rascunho."); }
  }, [placement, logoPreview, logoColors, step, zoom, showGrid, showRulers, showGuides, lockAspect, showLogo, surfaceType, selectedTemplate, blendMode, logoOpacity, shadowEnabled, shadowIntensity, selectedProduct, selectedArea, selectedVariant, selectedProductImage, draftId, saveDraft, setSearchParams]);

  useEffect(() => {
    if (!selectedProduct && !logoPreview) return;
    const interval = setInterval(() => { autoSaveRef.current = true; handleSaveDraft(true); }, 30_000);
    return () => clearInterval(interval);
  }, [handleSaveDraft, selectedProduct, logoPreview]);

  const draftRestoredRef = useRef(false);
  const restoreDraft = useCallback((setStep: (s: "product" | "area" | "canvas") => void) => {
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
    if (s.blendMode) setBlendMode(s.blendMode as BlendMode);
    if (s.logoOpacity !== undefined) setLogoOpacity(s.logoOpacity as number);
    if (s.shadowEnabled !== undefined) setShadowEnabled(s.shadowEnabled as boolean);
    if (s.shadowIntensity !== undefined) setShadowIntensity(s.shadowIntensity as number);
    if (s.step === "canvas" && s.logoPreview) setStep("canvas");
  }, [getDraft, searchParams]);

  return {
    // State
    draftId, logoFile, logoPreview, logoColors, zoom, placement, isDragging, isResizing,
    showGrid, showRulers, showGuides, lockAspect, showLogo, isExporting,
    surfaceType, warpedLogoUrl, isWarping, blendMode, logoOpacity,
    shadowEnabled, shadowIntensity, exportFormat, isRemovingBg, isSuggestingPlacement, aiReasoning,
    history, historyIdx, isSaving,
    // Refs
    fileInputRef, areaRef, canvasContainerRef,
    // Computed
    areaW, areaH,
    // Setters
    setZoom, setPlacement, setShowGrid, setShowRulers, setShowGuides, setShowLogo,
    setSurfaceType, setBlendMode, setLogoOpacity, setShadowEnabled, setShadowIntensity,
    setExportFormat, setIsResizing,
    // Actions
    undo, redo, autoFitLogo, handleLogoUpload, handleRemoveBg, handleSuggestPlacement,
    handleDrop, handleLogoMouseDown, handleMouseMove, handleMouseUp,
    handleExportImage, handleExportPng, handleExportPdf, centerLogo, clearLogo,
    handleSaveDraft, restoreDraft,
  };
}
