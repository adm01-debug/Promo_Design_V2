import { useMemo, useState } from "react";
import {
  Upload, Eye, EyeOff, Trash2, Maximize, Check, Printer, Download, Loader2, Library, Sparkles, XCircle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PERSPECTIVE_PRESETS, type SurfaceType } from "@/features/mockup";
import { clearWarpCache } from "@/features/mockup";
import { AssetPicker, downloadAssetAsFile } from "@/features/dam";
import { BrandAdherenceGauge } from "@/features/dam/components/BrandAdherenceGauge";
import { useBrandGuidelines } from "@/features/dam/hooks/use-brand-guidelines";
import { computeBrandAdherenceScore } from "@/features/dam/lib/brand-adherence";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/use-organization";
import { useClientDesignRecommendation, type DesignRecommendation } from "../hooks/use-client-design-recommendation";
import { ClientPatternBadge } from "./ClientPatternBadge";
import { ClientSelector } from "./ClientSelector";
import {
  useMockupEditorContext,
  type BlendMode,
  type ExportFormat,
} from "../context/mockup-editor-context";

// Re-export shared types so consumers importing them from this module keep working.
export type {
  BlendMode,
  ExportFormat,
  Placement,
  ViewDef,
  WatermarkConfig,
  MockupEditorContextValue as EditorRightPanelProps,
} from "../context/mockup-editor-context";


const BLEND_MODES: { id: BlendMode; label: string; desc: string }[] = [
  { id: "normal", label: "Normal", desc: "Sem efeito" },
  { id: "multiply", label: "Multiply", desc: "Escurece, ideal para tecidos" },
  { id: "screen", label: "Screen", desc: "Clareia, ideal para fundos escuros" },
  { id: "overlay", label: "Overlay", desc: "Contraste, realça texturas" },
  { id: "darken", label: "Darken", desc: "Mantém tons escuros" },
  { id: "color-burn", label: "Color Burn", desc: "Saturação intensa" },
];

const EditorRightPanel = () => {
  const [damPickerOpen, setDamPickerOpen] = useState(false);
  const [isLoadingFromDam, setIsLoadingFromDam] = useState(false);
  const { currentOrgId } = useOrganizations();
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
    isSuggestingPlacement, isRemovingBg, handleSuggestPlacement, handleRemoveBg,
    suggestedPlacement, applySuggestedPlacement, setSuggestedPlacement, cancelAIRequest,
    aiSuggestions, clearAISuggestions,
    isPreviewingAI, setIsPreviewingAI,
    selectedClientId, setSelectedClientId,
  } = useMockupEditorContext();


  // Recomendação de padrão do cliente (fallback: agregado da organização)
  const { data: designRecommendation } = useClientDesignRecommendation(
    currentOrgId,
    selectedClientId,
  );

  // Brand guidelines do cliente selecionado → alimenta o gauge de aderência
  const { guidelines: brandGuidelines } = useBrandGuidelines(
    currentOrgId,
    selectedClientId,
  );

  const adherence = useMemo(() => {
    if (!brandGuidelines || logoColors.length === 0) return null;
    return computeBrandAdherenceScore(
      {
        dominantColors: logoColors,
        placement: {
          x: currentPlacement.x / 100,
          y: currentPlacement.y / 100,
          scale: currentPlacement.scale,
        },
        surfaceType,
        blendMode,
      },
      {
        primary_colors: brandGuidelines.primary_colors,
        secondary_colors: brandGuidelines.secondary_colors,
        do_rules: brandGuidelines.do_rules,
        dont_rules: brandGuidelines.dont_rules,
      },
    );
  }, [brandGuidelines, logoColors, currentPlacement, surfaceType, blendMode]);

  const applyPatternRecommendation = (rec: DesignRecommendation) => {
    if (rec.suggestedBlendMode) {
      setBlendMode(rec.suggestedBlendMode as BlendMode);
    }
    if (rec.suggestedSurfaceType) {
      setSurfaceType(rec.suggestedSurfaceType as SurfaceType);
    }
    if (rec.opacity !== undefined) {
      setLogoOpacity(Math.round(rec.opacity * 100));
    }
    toast.success("Padrão aplicado", {
      description: `Baseado em ${rec.sampleSize} rascunhos (${rec.source === "client" ? "cliente" : "organização"}).`,
    });
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

      {/* Seletor de cliente + padrão de design recomendado */}
      <section className="p-4 border-b border-border space-y-3" aria-labelledby="pattern-recommendation-title">
        <h3 id="pattern-recommendation-title" className="sr-only">Cliente e recomendação de padrão de design</h3>
        <ClientSelector
          organizationId={currentOrgId}
          value={selectedClientId}
          onChange={setSelectedClientId}
        />
        {designRecommendation && designRecommendation.source !== "none" && (
          <ClientPatternBadge
            recommendation={designRecommendation}
            onApply={applyPatternRecommendation}
          />
        )}
      </section>

      {/* Aderência à identidade da marca (só quando há guidelines do cliente) */}
      {adherence && (
        <section className="p-4 border-b border-border" aria-labelledby="brand-adherence-title">
          <h3
            id="brand-adherence-title"
            className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2"
          >
            Aderência à marca
          </h3>
          <BrandAdherenceGauge result={adherence} />
        </section>
      )}

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
        {logoPreview && (
          <div className="space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-1.5">
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-7 text-[10px] gap-1 bg-primary/5 hover:bg-primary/10 border-primary/20"
                onClick={handleSuggestPlacement}
                disabled={isSuggestingPlacement || isRemovingBg}
              >
                {isSuggestingPlacement ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />} Sugerir
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-7 text-[10px] gap-1 bg-primary/5 hover:bg-primary/10 border-primary/20"
                onClick={handleRemoveBg}
                disabled={isRemovingBg || isSuggestingPlacement}
              >
                {isRemovingBg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary" />} Limpar Fundo
              </Button>
            </div>
            {(isSuggestingPlacement || isRemovingBg) && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-7 text-[10px] gap-1 text-destructive hover:bg-destructive/10"
                onClick={cancelAIRequest}
              >
                <XCircle className="w-3 h-3" /> Cancelar IA
              </Button>
            )}
          </div>
        )}
        
        {suggestedPlacement && (
          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5 text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Sugestão de IA</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => { setSuggestedPlacement(null); setIsPreviewingAI(false); }}
                aria-label="Descartar sugestão de posicionamento da IA"
              >
                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </div>
            
            <p className="text-[10px] text-muted-foreground leading-relaxed flex gap-1.5">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              {suggestedPlacement.reasoning}
            </p>
            
            <div className="space-y-1.5 py-1.5 border-y border-primary/10">
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase font-mono">Posição</span>
                  <div className="flex flex-col text-[10px] font-mono leading-tight">
                    <span className="text-muted-foreground line-through">
                      {Math.round(currentPlacement.x)}, {Math.round(currentPlacement.y)}
                    </span>
                    <span className="text-primary font-bold">
                      {Math.round(suggestedPlacement.placement.x)}, {Math.round(suggestedPlacement.placement.y)}
                    </span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-muted-foreground uppercase font-mono">Escala / Rot</span>
                  <div className="flex flex-col text-[10px] font-mono leading-tight">
                    <span className="text-muted-foreground line-through">
                      {Math.round(currentPlacement.scale * 100)}% / {currentPlacement.rotation}°
                    </span>
                    <span className="text-primary font-bold">
                      {Math.round(suggestedPlacement.placement.scale * 100)}% / {suggestedPlacement.placement.rotation}°
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-1">
              <Button 
                variant={isPreviewingAI ? "secondary" : "outline"}
                size="sm" 
                className="flex-1 h-7 text-[10px] gap-1"
                onClick={() => setIsPreviewingAI(!isPreviewingAI)}
              >
                {isPreviewingAI ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {isPreviewingAI ? "Ver Atual" : "Ver Sugestão"}
              </Button>
              <Button size="sm" className="flex-1 h-7 text-[10px] gap-1 bg-primary hover:bg-primary/90" onClick={applySuggestedPlacement}>
                <Check className="w-3 h-3" /> Aplicar
              </Button>
            </div>
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
        {aiSuggestions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Histórico IA</label>
              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={clearAISuggestions}>Limpar</Button>
            </div>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {aiSuggestions.slice().reverse().map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    if (s.type === 'placement' && s.data.placement) {
                      setSuggestedPlacement({ placement: s.data.placement, reasoning: s.data.reasoning || "" });
                    } else if (s.type === 'remove-bg' && s.data.logoPreview) {
                      setLogoPreview(s.data.logoPreview);
                      toast.success("Versão da IA restaurada");
                    }
                  }}
                  className="w-full text-left p-2 rounded bg-muted/50 hover:bg-primary/5 border border-border hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-primary flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      {s.type === 'placement' ? 'Posição' : 'Fundo'}
                    </span>
                    <span className="text-[8px] text-muted-foreground font-mono">
                      {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[9px] text-muted-foreground line-clamp-2 group-hover:text-foreground transition-colors leading-tight">
                    {s.data.reasoning || "Sugestão aplicada."}
                  </p>
                </button>
              ))}
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
