import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, GripVertical, Grid3X3, Maximize,
  FlipHorizontal, FlipVertical, RotateCw, ZoomIn, ZoomOut, Check, Undo2, Redo2,
  Trash2, Square,
} from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

import { countUniqueColors, calculateAutoFit, type SurfaceType } from "@/features/mockup";
import { getWarpedPreviewWorker as getWarpedPreview, clearWarpCache } from "@/features/mockup";
import { generateFinalArtPdf as generateArtPdf } from "@/features/mockup";
import { exportMockupImage, exportMockupPdf, renderMultiViewCanvas, type ExportOptions } from "../lib/export-service";
import { useMockupDrafts } from "../hooks/use-mockup-drafts";
import { useMockupEditorState, type Placement } from "../hooks/use-mockup-editor-state";
import { ErrorLogger } from "@/lib/error-logger";



import EditorTopBar from "@/features/mockup/components/EditorTopBar";
import EditorViewThumbnails from "@/features/mockup/components/EditorViewThumbnails";
import EditorRightPanel from "@/features/mockup/components/EditorRightPanel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";


/**
 * MockupEditor Component
 * 
 * A high-performance, accessible product mockup studio.
 * Features Web Worker based warping, memory-safe asset management,
 * and keyboard-friendly UI.
 */

const VIEWS: { id: string; label: string; icon: string; areaPercent: { x: number; y: number; w: number; h: number }; bgRotation?: number }[] = [
  { id: "front", label: "Frente", icon: "🟦", areaPercent: { x: 30, y: 20, w: 40, h: 45 } },
  { id: "back", label: "Costas", icon: "🟧", areaPercent: { x: 25, y: 15, w: 50, h: 50 } },
  { id: "side-left", label: "Lateral Esq.", icon: "◀", areaPercent: { x: 35, y: 30, w: 30, h: 40 } },
  { id: "side-right", label: "Lateral Dir.", icon: "▶", areaPercent: { x: 35, y: 30, w: 30, h: 40 } },
];

type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";
type ExportFormat = "png" | "jpeg" | "webp";
const INITIAL_PLACEMENT: Placement = { x: 50, y: 50, scale: 0.6, rotation: 0, flipH: false, flipV: false };
const VIRTUAL_CANVAS_SIZE = 800;



const MockupEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { saveDraft, isSaving } = useMockupDrafts();
  const isMobile = useIsMobile();
  
  const draftId = searchParams.get("id") || searchParams.get("edit");

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
  const [logoColors, setLogoColors] = useState<string[]>([]);
  const [showLogo, setShowLogo] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isWarping, setIsWarping] = useState(false);
  const [isSuggestingPlacement, setIsSuggestingPlacement] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [suggestedPlacement, setSuggestedPlacement] = useState<{ placement: Placement; reasoning: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [approvedViews, setApprovedViews] = useState<Set<string>>(new Set());
  const [blendMode, setBlendMode] = useState<BlendMode>("normal");
  const [showTexture, setShowTexture] = useState(true);
  const [logoOpacity, setLogoOpacity] = useState(100);
  const [surfaceType, setSurfaceType] = useState<SurfaceType>("flat");
  const [warpedLogoUrl, setWarpedLogoUrl] = useState<string | null>(null);
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowIntensity, setShadowIntensity] = useState(40);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const [exportQuality, setExportQuality] = useState(0.92);
  const [exportScale, setExportScale] = useState(2); // 1 = 1200px, 2 = 2400px (HD)
  const [watermarkConfig, setWatermarkConfig] = useState<{
    include: boolean;
    opacity: number;
    scale: number;
    position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  }>({
    include: false,
    opacity: 0.1,
    scale: 0.8,
    position: "center"
  });

  const { 
    placements, history, historyIndex, updatePlacement: updatePlacementCore, 
    undo: undoCore, redo: redoCore, setPlacements, resetAllHistory,
    logoPreview, undoLogo, redoLogo, pushLogoToHistory
  } = useMockupEditorState(VIEWS);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showRightPanel, setShowRightPanel] = useState(!isMobile);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Sync panel visibility with mobile state
  useEffect(() => {
    setShowRightPanel(!isMobile);
  }, [isMobile]);

  const { drafts } = useMockupDrafts();

  // Load draft if draftId is present
  useEffect(() => {
    if (draftId && drafts.length > 0) {
      const draft = drafts.find(d => d.id === draftId);
      if (draft && draft.editorState) {
        const state = draft.editorState as any;
        if (state.placements) {
          setPlacements(state.placements);
          resetAllHistory();
        }
        if (state.logoPreview) pushLogoToHistory(state.logoPreview);
        if (state.logoOpacity) setLogoOpacity(state.logoOpacity);
        if (state.blendMode) setBlendMode(state.blendMode);
        if (state.surfaceType) setSurfaceType(state.surfaceType);
        if (state.shadowEnabled !== undefined) setShadowEnabled(state.shadowEnabled);
        if (state.shadowIntensity) setShadowIntensity(state.shadowIntensity);
        if (state.approvedViews) setApprovedViews(new Set(state.approvedViews));
        if (state.watermarkConfig) setWatermarkConfig(state.watermarkConfig);

        
        toast.success("Rascunho carregado");
      }
    }
  }, [draftId, drafts, setPlacements]);



  const [displayScale, setDisplayScale] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry.contentRect) {
        const availableWidth = entry.contentRect.width - 48;
        const availableHeight = entry.contentRect.height - 48;
        const scale = Math.min(availableWidth / VIRTUAL_CANVAS_SIZE, availableHeight / VIRTUAL_CANVAS_SIZE, 1);
        setDisplayScale(scale > 0 ? scale : 1);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const currentPlacement = placements[activeView] || INITIAL_PLACEMENT;
  const currentView = VIEWS.find(v => v.id === activeView)!;
  const viewAreaW = (currentView.areaPercent.w / 100) * VIRTUAL_CANVAS_SIZE;
  const viewAreaH = (currentView.areaPercent.h / 100) * VIRTUAL_CANVAS_SIZE;

  const undo = useCallback(() => {
    undoCore(activeView);
    undoLogo();
  }, [activeView, undoCore, undoLogo]);
  const redo = useCallback(() => {
    redoCore(activeView);
    redoLogo();
  }, [activeView, redoCore, redoLogo]);

  const updatePlacement = useCallback((update: Partial<Placement>) => {
    const isHistoryChange = Object.keys(update).some(k => ["rotation", "flipH", "flipV", "scale"].includes(k));
    updatePlacementCore(activeView, update, isHistoryChange);
  }, [activeView, updatePlacementCore]);


  // Keyboard shortcuts and nudge functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Robust check for typing context
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === "INPUT" || 
                      target?.tagName === "TEXTAREA" || 
                      target?.isContentEditable ||
                      target?.closest('[role="combobox"]') ||
                      target?.closest('.cmdk-input');
      
      if (isInput) return;

      const step = e.shiftKey ? 10 : 2;

      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }

      // Nudge logo with arrow keys, including snap-to-center shortcut
      if (logoPreview && showLogo) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); updatePlacement({ x: currentPlacement.x - step }); }
        if (e.key === 'ArrowRight') { e.preventDefault(); updatePlacement({ x: currentPlacement.x + step }); }
        if (e.key === 'ArrowUp') { e.preventDefault(); updatePlacement({ x: currentPlacement.y - step }); }
        if (e.key === 'ArrowDown') { e.preventDefault(); updatePlacement({ x: currentPlacement.y + step }); }
        if (e.key === 'c' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); centerLogo(); }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture to preempt other listeners
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [undo, redo, logoPreview, showLogo, currentPlacement, updatePlacement]);



  useEffect(() => {
    if (warpedLogoUrl) {
      URL.revokeObjectURL(warpedLogoUrl);
    }
    clearWarpCache();
    setWarpedLogoUrl(null);
  }, [logoPreview]);

  // Clean up warped logo URL on unmount
  useEffect(() => {
    return () => {
      if (warpedLogoUrl) {
        URL.revokeObjectURL(warpedLogoUrl);
      }
    };
  }, [warpedLogoUrl]);

  useEffect(() => {
    if (!logoPreview || surfaceType === "flat") { 
      if (warpedLogoUrl) URL.revokeObjectURL(warpedLogoUrl);
      setWarpedLogoUrl(null); 
      setIsWarping(false);
      return; 
    }
    
    let cancelled = false;
    setIsWarping(true);
    
    // Safety check for scale to avoid infinite or zero dimensions
    const safeScale = Math.max(0.01, currentPlacement.scale);
    const warpW = Math.max(64, Math.min(2048, Math.round(viewAreaW * safeScale * 2)));
    const warpH = Math.max(64, Math.min(2048, Math.round(viewAreaH * safeScale * 2)));
    
    const requestWarp = async () => {
      try {
        const url = await getWarpedPreview(
          logoPreview, 
          warpW, 
          warpH, 
          surfaceType, 
          currentPlacement.rotation, 
          currentPlacement.flipH, 
          currentPlacement.flipV
        );
        
        if (!cancelled) {
          // React state updates are batched, but let's be explicit about the old URL
          setWarpedLogoUrl(prev => {
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
          setWarpedLogoUrl(prev => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          setIsWarping(false);
          toast.error("Erro ao processar deformação da logo. Tente simplificar a escala.");
        }
      }
    };

    const timer = setTimeout(requestWarp, 150); // Debounce heavy warping
    return () => { 
      cancelled = true; 
      clearTimeout(timer);
    };
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
      clearWarpCache(); setWarpedLogoUrl(null); 
      pushLogoToHistory(dataUrl);
      const img = new window.Image();
      img.onload = () => { setLogoColors(countUniqueColors(img)); const fit = calculateAutoFit(img, viewAreaW, viewAreaH); updatePlacement({ x: fit.x, y: fit.y, scale: fit.scale }); toast.success("Logo auto-encaixado na área de gravação"); };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [viewAreaW, viewAreaH, pushLogoToHistory]);

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
          areaHeight: areaH
        },
        headers: { "X-Request-Id": rid },
        signal: controller.signal
      });

      if (error) {
        if (error.name === 'AbortError') return;
        throw error;
      }

      const suggested: Placement = {
        scale: data.scale,
        x: (data.xPercent / 100) * VIRTUAL_CANVAS_SIZE,
        y: (data.yPercent / 100) * VIRTUAL_CANVAS_SIZE,
        rotation: data.rotation || 0,
        flipH: false,
        flipV: false
      };

      setSuggestedPlacement({
        placement: suggested,
        reasoning: data.reasoning || "Sugerido com base na geometria do produto."
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
  }, [logoPreview, productName, productSku, areaW, areaH]);

  const applySuggestedPlacement = useCallback(() => {
    if (!suggestedPlacement) return;
    updatePlacement(suggestedPlacement.placement);
    setSuggestedPlacement(null);
    toast.success("Posicionamento aplicado!");
  }, [suggestedPlacement, updatePlacement]);

  const handleRemoveBg = useCallback(async () => {
    if (!logoPreview) return;
    setIsRemovingBg(true);
    const rid = crypto.randomUUID();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { data, error } = await supabase.functions.invoke("mockup-ai", {
        body: { 
          action: "remove-bg",
          imageBase64: logoPreview
        },
        headers: { "X-Request-Id": rid },
        signal: controller.signal
      });

      if (error) {
        if (error.name === 'AbortError') return;
        throw error;
      }
      
      pushLogoToHistory(data.imageBase64);
      toast.success("IA: Fundo removido!");
    } catch (err) {
      console.error("AI BG Removal failed:", err);
      toast.error("IA: Falha ao remover fundo.");
    } finally {
      setIsRemovingBg(false);
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }, [logoPreview, pushLogoToHistory]);

  const cancelAIRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsRemovingBg(false);
      setIsSuggestingPlacement(false);
      toast.info("Operação cancelada.");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file?.type.startsWith("image/")) handleLogoUpload(file); }, [handleLogoUpload]);
  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    const scaleFactor = displayScale * (zoom / 100);
    setDragStart({ 
      x: e.clientX / scaleFactor - currentPlacement.x, 
      y: e.clientY / scaleFactor - currentPlacement.y 
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const scaleFactor = displayScale * (zoom / 100);
    let newX = e.clientX / scaleFactor - dragStart.x;
    let newY = e.clientY / scaleFactor - dragStart.y;
    
    // Snap to center logic (threshold of 5px)
    if (Math.abs(newX - 0) < 5) newX = 0; // Relative to area origin
    if (Math.abs(newY - 0) < 5) newY = 0;
    
    updatePlacement({ x: newX, y: newY });
  };

  const handleMouseUp = () => setIsDragging(false);
  const centerLogo = () => { if (!areaRef.current) return; const rect = areaRef.current.getBoundingClientRect(); updatePlacement({ x: rect.width * 0.15, y: rect.height * 0.15 }); };
  const toggleApproval = (viewId: string) => { setApprovedViews(prev => { const next = new Set(prev); if (next.has(viewId)) next.delete(viewId); else next.add(viewId); return next; }); };
  const allApproved = VIEWS.every(v => approvedViews.has(v.id));

  const handleExportImage = useCallback(async (format: ExportFormat = "png") => {
    setIsExporting(true);
    const exportToast = toast.loading(`Iniciando exportação ${format.toUpperCase()}...`);
    try {
      const options: ExportOptions = {
        productImage,
        productSku,
        productName,
        logoPreview,
        showLogo,
        placements,
        logoOpacity,
        blendMode,
        shadowEnabled,
        shadowIntensity,
        viewAreaW,
        viewAreaH,
        exportScale,
        exportQuality,
        exportFormat: format,
        approvedViews,
        views: VIEWS,
        watermarkOptions: watermarkConfig
      };
      
      toast.loading(`Renderizando multi-vistas (${VIRTUAL_CANVAS_SIZE * exportScale}px)...`, { id: exportToast });
      await exportMockupImage(options);
      toast.success(`${format.toUpperCase()} exportado com sucesso!`, { id: exportToast });
    } catch (error) {
      console.error("Export error:", error);
      ErrorLogger.error("Mockup export failed", error, { format, productName, productSku });
      toast.error("Falha na exportação. Tente reduzir a escala ou qualidade.", { id: exportToast });
    } finally {
      setIsExporting(false);
    }
  }, [productImage, productSku, productName, logoPreview, showLogo, placements, logoOpacity, blendMode, shadowEnabled, shadowIntensity, viewAreaW, viewAreaH, exportScale, exportQuality, approvedViews, watermarkConfig]);


  const handleExportPng = useCallback(() => handleExportImage(exportFormat), [handleExportImage, exportFormat]);
  
  const handleExportPdf = async () => {
    setIsExporting(true);
    const pdfToast = toast.loading("Gerando PDF de Aprovação...");
    try {
      await exportMockupPdf({
        productImage,
        productSku,
        productName,
        logoPreview,
        showLogo,
        placements,
        logoOpacity,
        blendMode,
        shadowEnabled,
        shadowIntensity,
        viewAreaW,
        viewAreaH,
        exportScale,
        exportQuality,
        exportFormat: "png",
        approvedViews,
        views: VIEWS,
        watermarkOptions: watermarkConfig,
        colors: logoColors.slice(0, 5),
        area: areaName,
        date: new Date().toLocaleDateString("pt-BR"),
        technique: technique || "Personalização"
      });
      toast.success("PDF gerado e pronto para download", { id: pdfToast });
    } catch (error) {
      ErrorLogger.error("Mockup PDF export failed", error, { productName, productSku });
      console.error("PDF export error:", error);
      toast.error("Erro ao processar o PDF. Verifique se a logo foi carregada corretamente.", { id: pdfToast });
    } finally {
      setIsExporting(false);
    }
  };



  const handleExportArt = () => {
    const pdf = generateArtPdf({
      osNumber: `ART-${productSku || "NEW"}`,
      date: new Date().toLocaleDateString("pt-BR"),
      deliveryDate: "",
      clientName: "Rascunho Editor",
      clientCompany: "",
      clientPhone: "",
      clientEmail: "",
      productName,
      productSku,
      productMaterial: "",
      productColors: "",
      technique: technique || "Laser Fiber",
      areaName,
      areaWidth: String(areaW),
      areaHeight: String(areaH),
      areaShape: "",
      artColors: logoColors.join(", "),
      artDpi: "300",
      artFile: logoFile?.name || "logo.png",
      artFileDataUrl: logoPreview || "",
      quantity: "1",
      observations: "Gerado via Editor Multivistas",
      mockupImageUrl: "",
      identificacaoCaixa: "",
      materialEvento: false,
      aprovarPrimeiraPeca: false,
      qtdCompra: "",
      qtdLiberada: "",
      fazParteKit: false,
      gravacaoDetalhe: "",
    });
    pdf.save(`arte-final-${productSku || "export"}.pdf`);
    toast.success("Arte Final exportada!");
  };

  const handleOpenServiceOrder = async () => {
    setIsExporting(true);
    const loadingToast = toast.loading("Preparando dados para Ordem de Serviço...");
    
    try {
      const canvas = await renderMultiViewCanvas({
        productImage, productSku, productName, logoPreview, showLogo,
        placements, logoOpacity, blendMode, shadowEnabled, shadowIntensity,
        viewAreaW, viewAreaH, exportScale: 1, exportQuality: 0.8,
        exportFormat: "png", approvedViews, views: VIEWS,
        watermarkOptions: watermarkConfig
      });
      
      const mockupImageUrl = canvas.toDataURL("image/png");
      
      // Calculate final art description
      const placementInfo = Object.entries(placements)
        .filter(([id]) => approvedViews.has(id))
        .map(([id, p]) => {
          const view = VIEWS.find(v => v.id === id);
          return `${view?.label}: Escala ${Math.round(p.scale * 100)}%, Rot ${p.rotation}°, X:${Math.round(p.x)} Y:${Math.round(p.y)}`;
        }).join(" | ");

      navigate("/mockup/service-order", {
        state: {
          prefill: {
            productName,
            productSku,
            technique: technique || "Personalização",
            areaWidth: String(areaW),
            areaHeight: String(areaH),
            areaName,
            artFileDataUrl: logoPreview,
            mockupImageUrl, 
            artColors: logoColors.join(", "),
            observations: `Importado do Editor: ${approvedViews.size}/${VIEWS.length} vistas aprovadas. Detalhes: ${placementInfo}`
          }
        }
      });
      toast.success("Pronto!", { id: loadingToast });
    } catch (error) {
      console.error("Failed to generate mockup preview:", error);
      toast.error("Erro ao gerar preview. Continuando sem imagem...", { id: loadingToast });
      // Fallback
      navigate("/mockup/service-order", {
        state: {
          prefill: {
            productName, productSku, technique, areaWidth: String(areaW), areaHeight: String(areaH),
            areaName, artFileDataUrl: logoPreview, mockupImageUrl: "", artColors: logoColors.join(", "),
            observations: "Importado do Editor (erro no preview)."
          }
        }
      });
    } finally {
      setIsExporting(false);
    }
  };



  useEffect(() => {
    if (!logoPreview) return;
    
    const timer = setTimeout(async () => {
      try {
        await saveDraft({
          id: draftId || undefined,
          name: `Draft ${productName}`,
          productName,
          productSku,
          editorState: {
            placements,
            logoPreview,
            logoOpacity,
            blendMode,
            surfaceType,
            shadowEnabled,
            shadowIntensity,
            approvedViews: Array.from(approvedViews),
            watermarkConfig

          }
        });
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 2000); // 2s debounce
    
    return () => clearTimeout(timer);
  }, [placements, logoPreview, logoOpacity, blendMode, surfaceType, shadowEnabled, shadowIntensity, approvedViews, draftId, productName, productSku, saveDraft]);

  return (
    <div className="h-screen flex flex-col">
      <EditorTopBar 
        productName={productName} 
        allApproved={allApproved} 
        onExportPdf={handleExportPdf} 
        onExportPng={handleExportPng} 
        onExportArt={handleExportArt}
        onOpenServiceOrder={handleOpenServiceOrder}
        onTogglePanel={() => setShowRightPanel(!showRightPanel)}
        isExporting={isExporting} 
        isSaving={isSaving}
      />

      <div className="flex-1 flex overflow-hidden">
        {!isMobile && <EditorViewThumbnails views={VIEWS} activeView={activeView} setActiveView={setActiveView} productImage={productImage} approvedViews={approvedViews} />}



        <div className="flex-1 flex flex-col">
          <div className="h-10 bg-card border-b border-border flex items-center justify-between px-3" role="toolbar" aria-label="Ferramentas de Edição">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={undo} 
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed" 
                title="Desfazer (Ctrl+Z)" 
                aria-label="Desfazer"
                disabled={historyIndex[activeView] <= 0}
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button 
                onClick={redo} 
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed" 
                title="Refazer (Ctrl+Y)" 
                aria-label="Refazer"
                disabled={historyIndex[activeView] >= (history[activeView]?.length || 0) - 1}
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded transition-colors ${showGrid ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`} title="Grade" aria-pressed={showGrid} aria-label="Alternar grade"><Grid3X3 className="w-4 h-4" aria-hidden="true" /></button>
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={centerLogo} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Centralizar" aria-label="Centralizar logo"><Maximize className="w-4 h-4" aria-hidden="true" /></button>
              <button onClick={() => updatePlacement({ flipH: !currentPlacement.flipH })} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Espelhar horizontal" aria-label="Espelhar horizontal" tabIndex={-1}><FlipHorizontal className="w-4 h-4" aria-hidden="true" /></button>
              <button onClick={() => updatePlacement({ flipV: !currentPlacement.flipV })} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Espelhar vertical" aria-label="Espelhar vertical" tabIndex={-1}><FlipVertical className="w-4 h-4" aria-hidden="true" /></button>
              <button onClick={() => updatePlacement({ rotation: currentPlacement.rotation + 15 })} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Rotacionar" aria-label="Rotacionar logo" tabIndex={-1}><RotateCw className="w-4 h-4" aria-hidden="true" /></button>

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

          <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden relative p-4" style={{ background: "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%) 50% / 20px 20px" }} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="relative bg-white rounded-xl border border-border shadow-2xl select-none" style={{ width: VIRTUAL_CANVAS_SIZE, height: VIRTUAL_CANVAS_SIZE, transform: `scale(${displayScale * (zoom / 100)})`, transformOrigin: "center" }}>
              {!imageLoaded && <Skeleton className="absolute inset-0 w-full h-full rounded-xl" />}
              <img src={productImage} alt={productName} className={`w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`} draggable={false} style={{ transform: currentView.bgRotation ? `rotate(${currentView.bgRotation}deg)` : undefined }} onLoad={() => setImageLoaded(true)} onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; setImageLoaded(true); }} />
              {showGrid && <div className="absolute inset-0 pointer-events-none z-[5]" style={{ backgroundImage: "linear-gradient(hsl(var(--primary) / 0.06) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.06) 1px, transparent 1px)", backgroundSize: "25px 25px" }} />}
              <div ref={areaRef} className="absolute border-2 border-dashed border-primary/40 rounded bg-primary/5" style={{ left: `${currentView.areaPercent.x}%`, top: `${currentView.areaPercent.y}%`, width: `${currentView.areaPercent.w}%`, height: `${currentView.areaPercent.h}%` }}>
                <span className="absolute -top-5 left-0 text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{currentView.label}</span>
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-muted-foreground">{areaW}cm</span>
                <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-[8px] font-mono text-muted-foreground rotate-90">{areaH}cm</span>
                {logoPreview && showLogo && (
                  <ContextMenu>
                    <ContextMenuTrigger className={`absolute cursor-move ${isDragging ? "opacity-80" : ""}`} style={{ left: currentPlacement.x, top: currentPlacement.y, width: `${currentPlacement.scale * 100}%` }} onMouseDown={handleLogoMouseDown} role="button" aria-label="Ajustar posição da logo" tabIndex={0}>
                      {isWarping ? (
                        <Skeleton className="w-full aspect-square rounded-sm bg-primary/10 animate-pulse" />
                      ) : (
                        <img src={warpedLogoUrl && surfaceType !== "flat" ? warpedLogoUrl : logoPreview} alt="Logo aplicada" className="w-full h-full object-contain pointer-events-none" draggable={false} style={{ mixBlendMode: blendMode, opacity: logoOpacity / 100, filter: shadowEnabled ? `drop-shadow(3px 3px ${Math.round(shadowIntensity / 5)}px rgba(0,0,0,${shadowIntensity / 100}))` : undefined, ...(surfaceType === "flat" ? { transform: `rotate(${currentPlacement.rotation}deg) scaleX(${currentPlacement.flipH ? -1 : 1}) scaleY(${currentPlacement.flipV ? -1 : 1})` } : {}) }} />
                      )}
                      <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-sm cursor-se-resize flex items-center justify-center border border-primary-foreground" role="button" aria-label="Redimensionar logo"><GripVertical className="w-2.5 h-2.5 text-primary-foreground rotate-[-45deg]" aria-hidden="true" /></div>
                      <div className="absolute inset-0 border border-primary/60 rounded-sm pointer-events-none" aria-hidden="true" />
                    </ContextMenuTrigger>
                    
                    <ContextMenuContent className="w-56">
                      <ContextMenuItem onClick={(e) => { e.stopPropagation(); undo(); }} disabled={historyIndex[activeView] <= 0}>
                        <Undo2 className="mr-2 h-4 w-4" /> <span>Desfazer</span>
                        <ContextMenuShortcut>Ctrl+Z</ContextMenuShortcut>
                      </ContextMenuItem>
                      <ContextMenuItem onClick={(e) => { e.stopPropagation(); redo(); }} disabled={historyIndex[activeView] >= (history[activeView]?.length || 0) - 1}>
                        <Redo2 className="mr-2 h-4 w-4" /> <span>Refazer</span>
                        <ContextMenuShortcut>Ctrl+Y</ContextMenuShortcut>
                      </ContextMenuItem>

                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={centerLogo}>
                        <Maximize className="mr-2 h-4 w-4" /> <span>Centralizar</span>
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => updatePlacement({ rotation: 0, flipH: false, flipV: false })}>
                        <Square className="mr-2 h-4 w-4" /> <span>Resetar Transformação</span>
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => updatePlacement({ flipH: !currentPlacement.flipH })}>
                        <FlipHorizontal className="mr-2 h-4 w-4" /> <span>Espelhar Horizontal</span>
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => updatePlacement({ flipV: !currentPlacement.flipV })}>
                        <FlipVertical className="mr-2 h-4 w-4" /> <span>Espelhar Vertical</span>
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => { setLogoFile(null); pushLogoToHistory(""); }} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> <span>Remover Logo</span>
                        <ContextMenuShortcut>Del</ContextMenuShortcut>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
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

        <AnimatePresence>
          {showRightPanel && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-12 right-0 z-40 lg:relative lg:inset-y-0"
            >
              <EditorRightPanel
                productName={productName} productSku={productSku} productImage={productImage} technique={technique}
                logoFile={logoFile} logoPreview={logoPreview} logoColors={logoColors} showLogo={showLogo} setShowLogo={setShowLogo}
                fileInputRef={fileInputRef} handleLogoUpload={handleLogoUpload}
                setLogoPreview={pushLogoToHistory} setLogoFile={setLogoFile} setLogoColors={setLogoColors} setWarpedLogoUrl={setWarpedLogoUrl}
                blendMode={blendMode} setBlendMode={setBlendMode} logoOpacity={logoOpacity} setLogoOpacity={setLogoOpacity}
                showTexture={showTexture} setShowTexture={setShowTexture}
                shadowEnabled={shadowEnabled} setShadowEnabled={setShadowEnabled} shadowIntensity={shadowIntensity} setShadowIntensity={setShadowIntensity}
                autoFitLogo={autoFitLogo} surfaceType={surfaceType} setSurfaceType={setSurfaceType}
                currentPlacement={currentPlacement} updatePlacement={updatePlacement} currentViewLabel={currentView.label}
                views={VIEWS} approvedViews={approvedViews} toggleApproval={toggleApproval}
                exportFormat={exportFormat} setExportFormat={setExportFormat}
                exportQuality={exportQuality} setExportQuality={setExportQuality}
                exportScale={exportScale} setExportScale={setExportScale}
                handleExportPdf={handleExportPdf} handleExportPng={handleExportPng} isExporting={isExporting}
                watermarkConfig={watermarkConfig} setWatermarkConfig={setWatermarkConfig}
              />
            </motion.div>
          )}
        </AnimatePresence>


      </div>
    </div>
  );
};

export default MockupEditor;
