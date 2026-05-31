import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload, Eye, EyeOff, Trash2, Sparkles, ImageOff, Wand2,
  Maximize, FileText, Download, Layers, Loader2, Library,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PERSPECTIVE_PRESETS } from "@/features/mockup";
import type { DbProduct, DbPrintAreaTechnique, DbProductVariant } from "@/features/mockup";
import type { Placement, BlendMode, ExportFormat } from "@/features/mockup/hooks/use-mockup-editor";
import { BLEND_MODES } from "@/features/mockup/hooks/use-mockup-editor";
import { AssetPicker, downloadAssetAsFile } from "@/features/dam";
import { toast } from "sonner";

interface MockupRightPanelProps {
  selectedProduct: DbProduct;
  selectedProductImage: string | null;
  selectedArea: DbPrintAreaTechnique;
  colorVariants: DbProductVariant[];
  selectedVariant: DbProductVariant | null;
  setSelectedVariant: (v: DbProductVariant | null) => void;
  logoFile: File | null;
  logoPreview: string | null;
  logoColors: string[];
  showLogo: boolean;
  setShowLogo: React.Dispatch<React.SetStateAction<boolean>>;
  clearLogo: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleLogoUpload: (file: File) => void;
  isRemovingBg: boolean;
  handleRemoveBg: () => void;
  isSuggestingPlacement: boolean;
  handleSuggestPlacement: () => void;
  aiReasoning: string | null;
  suggestedPlacement: { placement: Placement; reasoning: string } | null;
  applySuggestedPlacement: () => void;
  cancelAIRequest: () => void;
  blendMode: BlendMode;
  setBlendMode: (bm: BlendMode) => void;
  logoOpacity: number;
  setLogoOpacity: (v: number) => void;
  shadowEnabled: boolean;
  setShadowEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  shadowIntensity: number;
  setShadowIntensity: (v: number) => void;
  autoFitLogo: (dataUrl: string) => void;
  surfaceType: string;
  setSurfaceType: (s: any) => void;
  isWarping: boolean;
  warpedLogoUrl: string | null;
  placement: Placement;
  setPlacement: React.Dispatch<React.SetStateAction<Placement>>;
  exportFormat: ExportFormat;
  setExportFormat: (f: ExportFormat) => void;
  handleExportPdf: () => void;
  handleExportPng: () => void;
  isExporting: boolean;
}

const MockupRightPanel = (props: MockupRightPanelProps) => {
  const navigate = useNavigate();
  const [damPickerOpen, setDamPickerOpen] = useState(false);
  const [isLoadingFromDam, setIsLoadingFromDam] = useState(false);
  const {
    selectedProduct, selectedProductImage, selectedArea, colorVariants, selectedVariant, setSelectedVariant,
    logoFile, logoPreview, logoColors, showLogo, setShowLogo, clearLogo,
    fileInputRef, handleLogoUpload, isRemovingBg, handleRemoveBg,
    isSuggestingPlacement, handleSuggestPlacement, aiReasoning, suggestedPlacement, applySuggestedPlacement, cancelAIRequest,
    blendMode, setBlendMode, logoOpacity, setLogoOpacity,
    shadowEnabled, setShadowEnabled, shadowIntensity, setShadowIntensity,
    autoFitLogo, surfaceType, setSurfaceType, isWarping, warpedLogoUrl,
    placement, setPlacement, exportFormat, setExportFormat,
    handleExportPdf, handleExportPng, isExporting,
  } = props;

  return (
    <div className="w-64 bg-card border-l border-border flex flex-col overflow-y-auto">
      {/* Product info */}
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
                  className={`w-6 h-6 rounded-full border-2 transition-all ${selectedVariant?.id === v.id ? "border-primary scale-110 ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}
                  style={{ backgroundColor: v.color_hex || "#ccc" }}
                  title={v.color_name || v.name}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Logo */}
      <div className="p-4 border-b border-border">
        <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Logo</h3>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1" /> Upload
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setDamPickerOpen(true)} disabled={isLoadingFromDam}>
            {isLoadingFromDam ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Library className="w-3.5 h-3.5 mr-1" />}
            {isLoadingFromDam ? "Carregando..." : "DAM"}
          </Button>
        </div>
        {isLoadingFromDam ? (
          <p className="text-[10px] text-primary mt-1.5 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Baixando logo do DAM…
          </p>
        ) : (
          logoFile && <p className="text-[10px] text-muted-foreground truncate mt-1.5">{logoFile.name}</p>
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
                clearLogo();
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
              {logoColors.slice(0, 6).map((color, i) => (
                <div key={i} className="w-5 h-5 rounded border border-border" style={{ backgroundColor: color }} title={color} />
              ))}
              <span className="text-[9px] text-muted-foreground self-center ml-1">{logoColors.length} cores</span>
            </div>
          </div>
        )}
        {logoPreview && (
          <div className="mt-3 space-y-1.5">
            <label className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> IA</label>
            <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 border-primary/30 hover:bg-primary/10" disabled={isRemovingBg} onClick={handleRemoveBg}>
              {isRemovingBg ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageOff className="w-3 h-3" />} {isRemovingBg ? "Removendo fundo..." : "Remover Fundo"}
            </Button>
          </div>
        )}
      </div>

      {/* AI Placement */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Wand2 className="w-3 h-3 text-primary" /> IA Posicionamento</h3>
          {!suggestedPlacement ? (
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-primary/30 hover:bg-primary/10" disabled={isSuggestingPlacement} onClick={handleSuggestPlacement}>
              {isSuggestingPlacement ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} {isSuggestingPlacement ? "Analisando..." : "Sugerir"}
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => cancelAIRequest()}>Cancelar</Button>
              <Button variant="default" size="sm" className="h-6 text-[10px] bg-primary text-primary-foreground" onClick={applySuggestedPlacement}>Aplicar</Button>
            </div>
          )}
        </div>
        {isSuggestingPlacement && (
          <div className="flex items-center gap-2 text-[9px] text-primary animate-pulse mb-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>IA está analisando o produto e a logo...</span>
          </div>
        )}
        {aiReasoning && <p className="text-[9px] text-muted-foreground bg-primary/5 border border-primary/10 rounded p-2 mt-1.5 leading-relaxed">💡 {aiReasoning}</p>}
        {suggestedPlacement && !isSuggestingPlacement && (
          <div className="mt-2 p-2 rounded bg-primary/10 border border-primary/20">
            <p className="text-[9px] font-semibold text-primary mb-1">Sugestão pronta!</p>
            <p className="text-[9px] text-muted-foreground leading-tight">{suggestedPlacement.reasoning}</p>
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
                <button key={bm.id} onClick={() => setBlendMode(bm.id)} className={`px-2 py-1.5 rounded text-[10px] transition-all ${blendMode === bm.id ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground border border-border hover:border-primary/30"}`}>
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
      </div>

      {/* Auto-Fit & Surface */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Auto-Fit</h3>
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
          {surfaceType !== "flat" && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isWarping ? "bg-yellow-500 animate-pulse" : warpedLogoUrl ? "bg-green-500" : "bg-muted-foreground"}`} />
              <span className="text-[9px] font-mono text-muted-foreground">{isWarping ? "Aplicando mesh warp..." : warpedLogoUrl ? "Mesh warp ativo" : "Upload logo para ativar warp"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Position */}
      <div className="p-4 border-b border-border">
        <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Posição</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono text-muted-foreground">Escala</label>
              <span className="text-[10px] font-mono text-primary">{Math.round(placement.scale * 100)}%</span>
            </div>
            <Slider value={[placement.scale * 100]} onValueChange={([v]) => setPlacement(p => ({ ...p, scale: v / 100 }))} min={10} max={200} step={5} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono text-muted-foreground">Rotação</label>
              <span className="text-[10px] font-mono text-primary">{placement.rotation}°</span>
            </div>
            <Slider value={[placement.rotation]} onValueChange={([v]) => setPlacement(p => ({ ...p, rotation: v }))} min={-180} max={180} step={5} />
          </div>
        </div>
      </div>

      {/* Area info */}
      <div className="p-4 border-b border-border">
        <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Área de Gravação</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted rounded-md p-2"><span className="text-muted-foreground block text-[10px]">Largura</span><span className="text-foreground font-mono">{selectedArea.max_width}cm</span></div>
          <div className="bg-muted rounded-md p-2"><span className="text-muted-foreground block text-[10px]">Altura</span><span className="text-foreground font-mono">{selectedArea.max_height}cm</span></div>
        </div>
        <div className="mt-2 bg-muted rounded-md p-2 text-xs"><span className="text-muted-foreground block text-[10px]">Formato</span><span className="text-foreground font-mono">{selectedArea.shape} {selectedArea.is_curved ? "(curvo)" : ""}</span></div>
      </div>

      {/* Shortcuts */}
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

      {/* Actions */}
      <div className="p-4 mt-auto space-y-2">
        <Button className="w-full gap-2 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => {
          const params = new URLSearchParams({
            product: selectedProduct.name, sku: selectedProduct.sku,
            material: selectedProduct.materials?.join(", ") || "", productColors: selectedProduct.colors?.join(", ") || "",
            technique: selectedProduct.engraving_type || "", area: selectedArea.location_name,
            aw: String(selectedArea.max_width), ah: String(selectedArea.max_height), shape: selectedArea.shape || "",
            artColors: logoColors.join(", "),
          });
          navigate(`/mockup/service-order?${params.toString()}`);
        }}>
          <FileText className="w-3.5 h-3.5" /> Gerar Ordem de Serviço
        </Button>
        <Button variant="secondary" className="w-full gap-2 text-xs" onClick={() => {
          const params = new URLSearchParams({
            product: selectedProduct.name, sku: selectedProduct.sku,
            image: selectedProductImage || "", area: selectedArea.location_name,
            aw: String(selectedArea.max_width), ah: String(selectedArea.max_height),
            technique: selectedProduct.engraving_type || "",
          });
          navigate(`/mockup/editor?${params.toString()}`);
        }}>
          <Layers className="w-3.5 h-3.5" /> Editor Multivistas
        </Button>
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
        <Button className="w-full gap-2 text-xs" onClick={handleExportPdf}><FileText className="w-3.5 h-3.5" /> Layout Aprovação (PDF)</Button>
        <Button variant="outline" className="w-full gap-2 text-xs" onClick={handleExportPng} disabled={isExporting}>
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} {exportFormat.toUpperCase()} Alta Resolução
        </Button>
      </div>

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
            toast.error(err instanceof Error ? err.message : "Não foi possível carregar o logo.");
          } finally {
            setIsLoadingFromDam(false);
          }
        }}
      />
    </div>
  );
};

export default MockupRightPanel;
