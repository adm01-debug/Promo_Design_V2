
import { Wand2, Package, X, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductImageUrl } from "@/features/mockup";
import type { DbProduct } from "@/features/mockup";
import PromptGenerator from "@/features/magic-up/components/PromptGenerator";
import InspirationGallery from "@/features/magic-up/components/InspirationGallery";

const STYLE_OPTIONS = [
  { id: "premium", label: "Premium", emoji: "✨" },
  { id: "flatlay", label: "Flat Lay", emoji: "📐" },
  { id: "lifestyle", label: "Lifestyle", emoji: "🌿" },
  { id: "corporate", label: "Corporativo", emoji: "🏢" },
  { id: "ecommerce", label: "E-commerce", emoji: "🛒" },
  { id: "social", label: "Redes Sociais", emoji: "📱" },
  { id: "outdoor", label: "Outdoor", emoji: "🌅" },
  { id: "minimal", label: "Minimalista", emoji: "◻️" },
];

interface MagicUpLeftPanelProps {
  selectedProduct: DbProduct | null;
  setSelectedProduct: (p: DbProduct | null) => void;
  colorVariants: { id: string; color_hex: string | null; color_name: string | null; name: string }[];
  selectedStyle: string;
  setSelectedStyle: (s: string) => void;
  smartPrompt: string;
  applySmartPrompt: () => void;
  setPrompt: (p: string) => void;
  onOpenProductPicker: () => void;
}

const MagicUpLeftPanel = ({
  selectedProduct, setSelectedProduct, colorVariants,
  selectedStyle, setSelectedStyle, smartPrompt, applySmartPrompt,
  setPrompt, onOpenProductPicker,
}: MagicUpLeftPanelProps) => (
  <div className="w-72 bg-surface-1 border-r border-border flex flex-col overflow-hidden shrink-0">
    <div className="p-3 border-b border-border">
      <h2 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Produto de Referência</h2>
      {selectedProduct ? (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-2 border border-border">
          <div className="w-12 h-12 rounded-md bg-card flex items-center justify-center shrink-0 overflow-hidden">
            <img src={getProductImageUrl(selectedProduct)} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{selectedProduct.name}</p>
            <p className="text-[10px] text-muted-foreground">{selectedProduct.sku}</p>
          </div>
          <button onClick={() => { setSelectedProduct(null); setPrompt(""); }} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={onOpenProductPicker}>
          <Package className="w-3.5 h-3.5" /> Selecionar Produto
        </Button>
      )}
    </div>

    {selectedProduct && (
      <div className="p-3 border-b border-border">
        <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Cores do Produto</h3>
        {colorVariants.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {colorVariants.map((v) => (
              <div key={v.id} className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: v.color_hex || "#ccc" }} title={v.color_name || v.name} />
            ))}
          </div>
        ) : selectedProduct.colors?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedProduct.colors.map((c, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-surface-2 border border-border text-foreground">{c}</span>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">Sem cores definidas</p>
        )}
      </div>
    )}

    <div className="p-3 border-b border-border">
      <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Estilo Visual</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {STYLE_OPTIONS.map((style) => (
          <button
            key={style.id}
            onClick={() => setSelectedStyle(style.id)}
            className={`px-2 py-1.5 rounded-md text-xs text-left transition-all ${
              selectedStyle === style.id
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-surface-2 text-muted-foreground border border-border hover:text-foreground hover:border-primary/30"
            }`}
          >
            {style.emoji} {style.label}
          </button>
        ))}
      </div>
    </div>

    {selectedProduct && smartPrompt && (
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Prompt Inteligente</h3>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-primary" onClick={applySmartPrompt}>
            <Wand2 className="w-3 h-3" /> Usar
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed font-mono bg-surface-2 rounded-lg p-2 border border-border">
          {smartPrompt}
        </p>
      </div>
    )}

    <div className="p-3 flex-1 overflow-auto">
      <div className="flex items-center gap-1.5 mb-3">
        <Target className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Gerador de Campanha</h3>
      </div>
      <PromptGenerator onGenerate={(p) => setPrompt(p)} productName={selectedProduct?.name} />
      <div className="mt-4 pt-4 border-t border-border">
        <InspirationGallery onUsePrompt={(p) => setPrompt(p)} />
      </div>
    </div>

    {selectedProduct && (
      <div className="p-3 border-t border-border mt-auto">
        <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Detalhes</h3>
        <div className="space-y-1 text-[10px]">
          {selectedProduct.brand && <p className="text-muted-foreground">Marca: <span className="text-foreground">{selectedProduct.brand}</span></p>}
          {selectedProduct.engraving_type && <p className="text-muted-foreground">Gravação: <span className="text-primary font-mono">{selectedProduct.engraving_type}</span></p>}
          {selectedProduct.shape_type && <p className="text-muted-foreground">Formato: <span className="text-foreground">{selectedProduct.shape_type}</span></p>}
        </div>
      </div>
    )}
  </div>
);

export default MagicUpLeftPanel;
export { STYLE_OPTIONS };
