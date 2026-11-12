import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { NavigateFunction } from "react-router-dom";
import {
  exportMockupImage,
  exportMockupPdf,
  renderMultiViewCanvas,
  type ExportOptions,
} from "../lib/export-service";
import { generateFinalArtPdf as generateArtPdf } from "@/features/mockup";
import { ErrorLogger } from "@/lib/error-logger";
import type { Placement } from "./use-mockup-editor-state";
import type { SurfaceType } from "@/features/mockup";

type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";
type ExportFormat = "png" | "jpeg" | "webp";

type ViewDef = {
  id: string;
  label: string;
  icon: string;
  areaPercent: { x: number; y: number; w: number; h: number };
  bgRotation?: number;
};

type WatermarkConfig = {
  include: boolean;
  opacity: number;
  scale: number;
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

export interface UseMockupEditorExportsOptions {
  productImage: string;
  productSku: string;
  productName: string;
  technique: string;
  areaName: string;
  areaW: number;
  areaH: number;
  logoPreview: string | null;
  logoFile: File | null;
  logoColors: string[];
  showLogo: boolean;
  placements: Record<string, Placement>;
  logoOpacity: number;
  blendMode: BlendMode;
  surfaceType: SurfaceType;
  shadowEnabled: boolean;
  shadowIntensity: number;
  viewAreaW: number;
  viewAreaH: number;
  exportScale: number;
  exportQuality: number;
  exportFormat: ExportFormat;
  approvedViews: Set<string>;
  views: ViewDef[];
  watermarkConfig: WatermarkConfig;
  navigate: NavigateFunction;
}

/**
 * Encapsula todos os handlers de exportação do editor de mockup:
 * PNG/JPEG/WebP, PDF de aprovação, Arte Final e envio para Ordem de Serviço.
 */
export function useMockupEditorExports(opts: UseMockupEditorExportsOptions) {
  const [isExporting, setIsExporting] = useState(false);

  const {
    productImage,
    productSku,
    productName,
    technique,
    areaName,
    areaW,
    areaH,
    logoPreview,
    logoFile,
    logoColors,
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
    exportFormat,
    approvedViews,
    views,
    watermarkConfig,
    navigate,
  } = opts;

  const handleExportImage = useCallback(
    async (format: ExportFormat = "png") => {
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
          views,
          watermarkOptions: watermarkConfig,
        };
        toast.loading(`Renderizando multi-vistas (${1200 * exportScale}px)...`, {
          id: exportToast,
        });
        await exportMockupImage(options);
        toast.success(`${format.toUpperCase()} exportado com sucesso!`, { id: exportToast });
      } catch (error) {
        console.error("Export error:", error);
        ErrorLogger.error("Mockup export failed", error, { format, productName, productSku });
        toast.error("Falha na exportação. Tente reduzir a escala ou qualidade.", {
          id: exportToast,
        });
      } finally {
        setIsExporting(false);
      }
    },
    [
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
      approvedViews,
      views,
      watermarkConfig,
    ],
  );

  const handleExportPng = useCallback(
    () => handleExportImage(exportFormat),
    [handleExportImage, exportFormat],
  );

  const handleExportPdf = useCallback(async () => {
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
        views,
        watermarkOptions: watermarkConfig,
        colors: logoColors.slice(0, 5),
        area: areaName,
        date: new Date().toLocaleDateString("pt-BR"),
        technique: technique || "Personalização",
      });
      toast.success("PDF gerado e pronto para download", { id: pdfToast });
    } catch (error) {
      ErrorLogger.error("Mockup PDF export failed", error, { productName, productSku });
      console.error("PDF export error:", error);
      toast.error("Erro ao processar o PDF. Verifique se a logo foi carregada corretamente.", {
        id: pdfToast,
      });
    } finally {
      setIsExporting(false);
    }
  }, [
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
    approvedViews,
    views,
    watermarkConfig,
    logoColors,
    areaName,
    technique,
  ]);

  const handleExportArt = useCallback(() => {
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
  }, [
    productSku,
    productName,
    technique,
    areaName,
    areaW,
    areaH,
    logoColors,
    logoFile,
    logoPreview,
  ]);

  const handleOpenServiceOrder = useCallback(async () => {
    setIsExporting(true);
    const loadingToast = toast.loading("Preparando dados para Ordem de Serviço...");
    try {
      const canvas = await renderMultiViewCanvas({
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
        exportScale: 1,
        exportQuality: 0.8,
        exportFormat: "png",
        approvedViews,
        views,
        watermarkOptions: watermarkConfig,
      });

      const mockupImageUrl = canvas.toDataURL("image/png");

      const placementInfo = Object.entries(placements)
        .filter(([id]) => approvedViews.has(id))
        .map(([id, p]) => {
          const view = views.find((v) => v.id === id);
          return `${view?.label}: Escala ${Math.round(p.scale * 100)}%, Rot ${p.rotation}°, X:${Math.round(p.x)} Y:${Math.round(p.y)}`;
        })
        .join(" | ");

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
            observations: `Importado do Editor: ${approvedViews.size}/${views.length} vistas aprovadas. Detalhes: ${placementInfo}`,
          },
        },
      });
      toast.success("Pronto!", { id: loadingToast });
    } catch (error) {
      console.error("Failed to generate mockup preview:", error);
      toast.error("Erro ao gerar preview. Continuando sem imagem...", { id: loadingToast });
      navigate("/mockup/service-order", {
        state: {
          prefill: {
            productName,
            productSku,
            technique,
            areaWidth: String(areaW),
            areaHeight: String(areaH),
            areaName,
            artFileDataUrl: logoPreview,
            mockupImageUrl: "",
            artColors: logoColors.join(", "),
            observations: "Importado do Editor (erro no preview).",
          },
        },
      });
    } finally {
      setIsExporting(false);
    }
  }, [
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
    approvedViews,
    views,
    watermarkConfig,
    technique,
    areaW,
    areaH,
    areaName,
    logoColors,
    navigate,
  ]);

  return {
    isExporting,
    setIsExporting,
    handleExportImage,
    handleExportPng,
    handleExportPdf,
    handleExportArt,
    handleOpenServiceOrder,
  };
}
