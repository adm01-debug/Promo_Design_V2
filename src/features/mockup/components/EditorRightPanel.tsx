import React, { useState } from "react";
import {
  Upload, Eye, EyeOff, Trash2, Maximize, Check, Printer, Download, Loader2, Library, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PERSPECTIVE_PRESETS, type SurfaceType } from "@/features/mockup";
import { clearWarpCache } from "@/features/mockup";
import { AssetPicker, downloadAssetAsFile } from "@/features/dam";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "color-burn";
type ExportFormat = "png" | "jpeg" | "webp";
type Placement = { x: number; y: number; scale: number; rotation: number; flipH: boolean; flipV: boolean };

interface ViewDef { id: string; label: string; icon: string; areaPercent: { x: number; y: number; w: number; h: number }; bgRotation?: number; }
interface WatermarkConfig {
  include: boolean;
  opacity: number;
  scale: number;
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
}


const BLEND_MODES: { id: BlendMode; label: string; desc: string }[] = [
  { id: "normal", label: "Normal", desc: "Sem efeito" },
  { id: "multiply", label: "Multiply", desc: "Escurece, ideal para tecidos" },
  { id: "screen", label: "Screen", desc: "Clareia, ideal para fundos escuros" },
  { id: "overlay", label: "Overlay", desc: "Contraste, realça texturas" },
  { id: "darken", label: "Darken", desc: "Mantém tons escuros" },
  { id: "color-burn", label: "Color Burn", desc: "Saturação intensa" },
];

interface EditorRightPanelProps {
  productName: string;
  productSku: string;
  productImage: string;
  technique: string;
  logoFile: File | null;
  logoPreview: string | null;
  logoColors: string[];
  showLogo: boolean;
  setShowLogo: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleLogoUpload: (file: File) => void;
  setLogoPreview: (v: string | null) => void;
  setLogoFile: (v: File | null) => void;
  setLogoColors: (v: string[]) => void;
  setWarpedLogoUrl: (v: string | null) => void;
  blendMode: BlendMode;
  setBlendMode: (bm: BlendMode) => void;
  logoOpacity: number;
  setLogoOpacity: (v: number) => void;
  showTexture: boolean;
  setShowTexture: (v: boolean) => void;
  shadowEnabled: boolean;
  setShadowEnabled: (v: boolean) => void;
  shadowIntensity: number;
  setShadowIntensity: (v: number) => void;
  autoFitLogo: (dataUrl: string) => void;
  surfaceType: SurfaceType;
  setSurfaceType: (s: SurfaceType) => void;
  currentPlacement: Placement;
  updatePlacement: (u: Partial<Placement>) => void;
  currentViewLabel: string;
  views: ViewDef[];
  approvedViews: Set<string>;
  toggleApproval: (id: string) => void;
  exportFormat: ExportFormat;
  setExportFormat: (f: ExportFormat) => void;
  exportQuality: number;
  setExportQuality: (q: number) => void;
  exportScale: number;
  setExportScale: (s: number) => void;
  handleExportPdf: () => void;
  handleExportPng: () => void;
  isExporting: boolean;
  watermarkConfig: WatermarkConfig;
  setWatermarkConfig: (v: WatermarkConfig) => void;
}



const EditorRightPanel = (props: EditorRightPanelProps) => {
  const [damPickerOpen, setDamPickerOpen] = useState(false);
  const [isLoadingFromDam, setIsLoadingFromDam] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const {
    productName, productSku, productImage, technique,
    logoFile, logoPreview, logoColors, showLogo, setShowLogo,
    fileInputRef, handleLogoUpload, setLogoPreview, setLogoFile, setLogoColors, setWarpedLogoUrl,
    blendMode, setBlendMode, logoOpacity, setLogoOpacity,
    showTexture, setShowTexture, shadowEnabled, setShadowEnabled, shadowIntensity, setShadowIntensity,
    autoFitLogo, surfaceType, setSurfaceType,
    currentPlacement, updatePlacement, currentViewLabel,
    views, approvedViews, toggleApproval,
    exportFormat, setExportFormat, exportQuality, setExportQuality, exportScale, setExportScale, handleExportPdf, handleExportPng, isExporting,
    watermarkConfig, setWatermarkConfig,
  } = props;


  const handleAISuggestion = async () => {
    if (!logoPreview) return;
    setIsSuggesting(true);
    const rid = crypto.randomUUID();
    
    try {
      const { data, error } = await supabase.functions.invoke("mockup-ai", {
        body: { 
          action: "suggest-placement",
          productName,
          templateId: productSku || "custom",
          areaWidth: props.views[0]?.areaPercent.w || 15,
          areaHeight: props.views[0]?.areaPercent.h || 15
        },
        headers: { "X-Request-Id": rid }
      });

      if (error) throw error;

      updatePlacement({
        scale: data.scale,
        x: (data.xPercent / 100) * 800, // Adjust to virtual canvas size
        y: (data.yPercent / 100) * 800,
        rotation: data.rotation
      });

      if (data.blendMode) setBlendMode(data.blendMode);
      if (data.surfaceType) setSurfaceType(data.surfaceType);
      if (data.opacity) setLogoOpacity(data.opacity);

      toast.success("IA: Sugestão aplicada!", {
        description: data.reasoning,
        duration: 5000
      });
    } catch (err) {
      console.error("AI Suggestion failed:", err);
      toast.error("IA: Não foi possível obter sugestão no momento.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleRemoveBg = async () => {
    if (!logoPreview) return;
    const loadingToast = toast.loading("IA: Removendo fundo...");
    const rid = crypto.randomUUID();

    try {
      const { data, error } = await supabase.functions.invoke("mockup-ai", {
        body: { 
          action: "remove-bg",
          imageBase64: logoPreview
        },
        headers: { "X-Request-Id": rid }
      });

      if (error) throw error;
      
      setLogoPreview(data.imageBase64);
      toast.success("IA: Fundo removido com sucesso!", { id: loadingToast });
    } catch (err) {
      console.error("AI BG Removal failed:", err);
      toast.error("IA: Falha ao remover fundo.", { id: loadingToast });
    }
  };

  return (
    <aside className="w-64 bg-card border-l border-border flex flex-col overflow-y-auto" aria-label="Painel de propriedades">
      {/* Product info */}
      <section className="p-4 border-b border-border" aria-labelledby="product-info-title">
        <h3 id="product-info-title" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Produto</h3>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center p-1 shrink-0">
            <img src={productImage} alt="" className="w-full h-full object-contain" aria-hidden="true" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{productName}</p>
            <p className="text-[10px] text-muted-foreground font-mono" aria-label={`SKU: ${productSku}`}>{productSku}</p>
          </div>
        </div>
        {technique && <span className="inline-block text-[10px] text-primary font-mono mt-2 bg-primary/10 px-1.5 py-0.5 rounded" aria-label={`Técnica: ${technique}`}>{technique}</span>}
      </section>

      {/* Logo */}
      <section className="p-4 border-b border-border" aria-labelledby="logo-section-title">
        <h3 id="logo-section-title" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Logo</h3>
        <input ref={fileInputRef} type="file" id="logo-upload-input" accept="image/*" className="hidden" aria-label="Upload de logo" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => fileInputRef.current?.click()} aria-label="Fazer upload de imagem">
            <Upload className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> {logoFile ? logoFile.name.slice(0, 10) : "Upload"}
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setDamPickerOpen(true)} disabled={isLoadingFromDam} aria-label="Escolher da biblioteca DAM">
            {isLoadingFromDam ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" aria-hidden="true" /> : <Library className="w-3.5 h-3.5 mr-1" aria-hidden="true" />}
            {isLoadingFromDam ? "Carregando..." : "DAM"}
          </Button>
        </div>
        {isLoadingFromDam && (
          <p className="text-[10px] text-primary mt-1.5 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Baixando logo do DAM…
          </p>
        )}
        {logoPreview && (
          <div className="flex items-center gap-1 mt-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs flex-1 gap-1" onClick={() => setShowLogo(!showLogo)}>
              {showLogo ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} {showLogo ? "Ocultar" : "Mostrar"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive gap-1 flex-1"
              onClick={() => {
                setLogoPreview(null);
                setLogoFile(null);
                setLogoColors([]);
                setWarpedLogoUrl(null);
                clearWarpCache();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              aria-label="Remover logo"
              title="Remover logo e voltar ao estado vazio"
            >
              <Trash2 className="w-3 h-3" /> Remover
            </Button>
          </div>
        )}
        {logoColors.length > 0 && (
          <div className="mt-3">
            <label className="text-[10px] font-mono text-muted-foreground uppercase">Cores Detectadas</label>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {logoColors.slice(0, 6).map((color, i) => <div key={i} className="w-5 h-5 rounded border border-border" style={{ backgroundColor: color }} title={color} />)}
            </div>
          </div>
        )}
      </section>

      {/* Appearance */}
      <section className="p-4 border-b border-border" aria-labelledby="appearance-section-title">
        <h3 id="appearance-section-title" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Aparência</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground mb-1.5 block">Blend Mode</label>
            <div className="grid grid-cols-2 gap-1">
              {BLEND_MODES.map((bm) => (
                <button key={bm.id} onClick={() => setBlendMode(bm.id)} title={bm.desc} className={`px-2 py-1.5 rounded text-[10px] transition-all ${blendMode === bm.id ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground border border-border hover:border-primary/30"}`}>
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
            <Slider value={[logoOpacity]} onValueChange={([v]) => setLogoOpacity(v)} min={10} max={100} step={5} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-muted-foreground">Textura</label>
            <button onClick={() => setShowTexture(!showTexture)} className={`px-2 py-1 rounded text-[10px] border transition-all ${showTexture ? "bg-primary/20 text-primary border-primary/40" : "bg-muted text-muted-foreground border-border"}`}>
              {showTexture ? "On" : "Off"}
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono text-muted-foreground">Sombra</label>
              <button onClick={() => setShadowEnabled(!shadowEnabled)} className={`px-2 py-1 rounded text-[10px] border transition-all ${shadowEnabled ? "bg-primary/20 text-primary border-primary/40" : "bg-muted text-muted-foreground border-border"}`}>
                {shadowEnabled ? "On" : "Off"}
              </button>
            </div>
            {shadowEnabled && (
              <div className="mt-1.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono text-muted-foreground">Intensidade</label>
                  <span className="text-[10px] font-mono text-primary">{shadowIntensity}%</span>
                </div>
                <Slider value={[shadowIntensity]} onValueChange={([v]) => setShadowIntensity(v)} min={10} max={80} step={5} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Auto-Fit & Surface */}
      <section className="p-4 border-b border-border" aria-labelledby="autofit-section-title">
        <div className="flex items-center justify-between mb-3">
          <h3 id="autofit-section-title" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Auto-Fit</h3>
          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" disabled={!logoPreview} onClick={() => logoPreview && autoFitLogo(logoPreview)}>
            <Maximize className="w-3 h-3" /> Encaixar
          </Button>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted-foreground mb-1.5 block">Superfície</label>
          <div className="grid grid-cols-2 gap-1">
            {PERSPECTIVE_PRESETS.map((preset) => (
              <button key={preset.id} onClick={() => setSurfaceType(preset.id)} title={preset.description} className={`px-2 py-1.5 rounded text-[10px] transition-all ${surfaceType === preset.id ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground border border-border hover:border-primary/30"}`}>
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Position */}
      <section className="p-4 border-b border-border" aria-labelledby="position-section-title">
        <h3 id="position-section-title" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Posição — {currentViewLabel}</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono text-muted-foreground">Escala</label>
              <span className="text-[10px] font-mono text-primary">{Math.round(currentPlacement.scale * 100)}%</span>
            </div>
            <Slider value={[currentPlacement.scale * 100]} onValueChange={([v]) => updatePlacement({ scale: v / 100 })} min={10} max={200} step={5} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono text-muted-foreground">Rotação</label>
              <span className="text-[10px] font-mono text-primary">{currentPlacement.rotation}°</span>
            </div>
            <Slider value={[currentPlacement.rotation]} onValueChange={([v]) => updatePlacement({ rotation: v })} min={-180} max={180} step={5} />
          </div>
        </div>
      </section>

      {/* Per-view approval */}
      <section className="p-4 border-b border-border" aria-labelledby="approval-section-title">
        <h3 id="approval-section-title" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Aprovação por Vista</h3>
        <div className="space-y-1.5">
          {views.map((view) => (
            <button key={view.id} onClick={() => toggleApproval(view.id)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs ${approvedViews.has(view.id) ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-border hover:border-primary/40 text-muted-foreground"}`}>
              <span className="flex items-center gap-2"><span>{view.icon}</span><span className="font-medium">{view.label}</span></span>
              {approvedViews.has(view.id) ? <Check className="w-4 h-4 text-green-400" /> : <div className="w-4 h-4 rounded-full border border-muted-foreground/40" />}
            </button>
          ))}
        </div>
      </section>

      <section className="p-4 mt-auto space-y-4" aria-labelledby="export-section-title">
        <h2 id="export-section-title" className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Exportação</h2>
        
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5 block">Formato</label>
            <div className="grid grid-cols-3 gap-1">
              {(["png", "jpeg", "webp"] as ExportFormat[]).map((fmt) => (
                <button key={fmt} onClick={() => setExportFormat(fmt)} className={`px-2 py-1.5 rounded text-[10px] font-mono uppercase transition-all ${exportFormat === fmt ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground border border-border hover:border-primary/30"}`}>
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono text-muted-foreground">Qualidade / Tamanho</label>
              <span className="text-[10px] font-mono text-primary">{exportScale}x ({(1200 * exportScale)}px)</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3].map((s) => (
                <button key={s} onClick={() => setExportScale(s)} className={`px-1 py-1 rounded text-[10px] transition-all ${exportScale === s ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground border border-border"}`}>
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Marca d'água</label>
              <button onClick={() => setWatermarkConfig({ ...watermarkConfig, include: !watermarkConfig.include })} className={`px-2 py-1 rounded text-[10px] border transition-all ${watermarkConfig.include ? "bg-primary/20 text-primary border-primary/40" : "bg-muted text-muted-foreground border-border"}`}>
                {watermarkConfig.include ? "Ativo" : "Off"}
              </button>
            </div>
            
            {watermarkConfig.include && (
              <div className="space-y-3 p-2 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in slide-in-from-top-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-mono text-muted-foreground">Opacidade</label>
                    <span className="text-[9px] font-mono text-primary">{Math.round(watermarkConfig.opacity * 100)}%</span>
                  </div>
                  <Slider value={[watermarkConfig.opacity * 100]} onValueChange={([v]) => setWatermarkConfig({ ...watermarkConfig, opacity: v / 100 })} min={5} max={40} step={5} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-mono text-muted-foreground">Escala</label>
                    <span className="text-[9px] font-mono text-primary">{Math.round(watermarkConfig.scale * 100)}%</span>
                  </div>
                  <Slider value={[watermarkConfig.scale * 100]} onValueChange={([v]) => setWatermarkConfig({ ...watermarkConfig, scale: v / 100 })} min={20} max={150} step={10} />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-muted-foreground mb-1 block">Posição</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["center", "top-left", "top-right", "bottom-left", "bottom-right"] as const).map((pos) => (
                      <button 
                        key={pos} 
                        onClick={() => setWatermarkConfig({ ...watermarkConfig, position: pos })}
                        className={`px-1 py-1 rounded text-[8px] uppercase border transition-all ${watermarkConfig.position === pos ? "bg-primary/20 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground"}`}
                      >
                        {pos.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>


          {exportFormat !== "png" && (

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-mono text-muted-foreground">Compressão</label>
                <span className="text-[10px] font-mono text-primary">{Math.round(exportQuality * 100)}%</span>
              </div>
              <Slider value={[exportQuality * 100]} onValueChange={([v]) => setExportQuality(v / 100)} min={10} max={100} step={5} />
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2">
          <Button className="w-full gap-2 text-xs" onClick={handleExportPdf}><Printer className="w-3.5 h-3.5" /> Arte Final (PDF Otimizado)</Button>
          <Button variant="outline" className="w-full gap-2 text-xs" onClick={handleExportPng} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Exportar {exportFormat.toUpperCase()}
          </Button>
        </div>
      </section>

      <AssetPicker
        open={damPickerOpen}
        onOpenChange={setDamPickerOpen}
        defaultAssetType="logo"
        title="Escolher logo da biblioteca"
        onSelect={async (asset) => {
          setIsLoadingFromDam(true);
          try {
            const file = await downloadAssetAsFile(asset.file_path, asset.name, asset.mime_type);
            handleLogoUpload(file);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Não foi possível carregar o asset");
          } finally {
            setIsLoadingFromDam(false);
          }
        }}
      />
    </aside>
  );
};

export default EditorRightPanel;
