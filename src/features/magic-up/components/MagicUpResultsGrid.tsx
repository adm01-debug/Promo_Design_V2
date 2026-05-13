import { motion } from "framer-motion";
import { Sparkles, Heart, Copy, Image as ImageIcon, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DownloadMenu from "@/features/magic-up/components/DownloadMenu";
import type { DbProduct } from "@/features/mockup";

interface GenerationBatch {
  id: string;
  prompt: string;
  productName?: string;
  variations: { id: string; imageUrl: string; favorite: boolean; selected: boolean; style: string }[];
  createdAt: string;
}

interface MagicUpResultsGridProps {
  generationBatches: GenerationBatch[];
  isGenerating: boolean;
  selectedProduct: DbProduct | null;
  onSelectVariation: (batchId: string, varId: string) => void;
  onToggleFavorite: (batchId: string, varId: string) => void;
  onOpenProductPicker: () => void;
}

const MagicUpResultsGrid = ({
  generationBatches, isGenerating, selectedProduct,
  onSelectVariation, onToggleFavorite, onOpenProductPicker,
}: MagicUpResultsGridProps) => {
  if (generationBatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
          <Image className="w-9 h-9 text-muted-foreground" />
        </div>
        <p className="text-sm font-display font-semibold text-foreground mb-1">Nenhuma geração ainda</p>
        <p className="text-xs text-muted-foreground mb-4">
          {selectedProduct ? `Selecione um estilo e gere para "${selectedProduct.name}"` : "Selecione um produto ou digite um prompt"}
        </p>
        {!selectedProduct && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onOpenProductPicker}>
            <Package className="w-3.5 h-3.5" /> Começar com um Produto
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {generationBatches.map((batch, batchIdx) => (
        <motion.div key={batch.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: batchIdx * 0.1 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
              <div>
                {batch.productName && <span className="text-[10px] text-primary font-mono mr-2">{batch.productName}</span>}
                <span className="text-[10px] text-muted-foreground font-mono">
                  4 variações • {new Date(batch.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {batch.variations.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-xl border-2 overflow-hidden group cursor-pointer transition-all ${
                  v.selected ? "border-primary shadow-glow" : "border-border hover:border-primary/40"
                }`}
                onClick={() => onSelectVariation(batch.id, v.id)}
              >
                <div className="aspect-square bg-surface-2 relative flex items-center justify-center">
                  {isGenerating && batchIdx === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <span className="text-[10px] text-muted-foreground">{v.style}</span>
                    </div>
                  ) : (
                    <img src={v.imageUrl} alt="" className="w-full h-full object-cover" />
                  )}
                  {v.selected && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-[10px] text-primary-foreground font-bold">✓</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <DownloadMenu imageUrl={v.imageUrl} fileName={`magicup-${v.id}`} />
                    <Button variant="ghost" size="sm" className="text-white h-8 w-8 p-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className={`h-8 w-8 p-0 ${v.favorite ? "text-accent" : "text-white"}`}
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(batch.id, v.id); }}
                    >
                      <Heart className={`w-4 h-4 ${v.favorite ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                </div>
                <div className="p-2 bg-card">
                  <p className={`text-[10px] font-mono text-center ${v.selected ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {v.style}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2 font-mono bg-surface-2 rounded-lg px-3 py-2 border border-border">
            {batch.prompt}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

export default MagicUpResultsGrid;
