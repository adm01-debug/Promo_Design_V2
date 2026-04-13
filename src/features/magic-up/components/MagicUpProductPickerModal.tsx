import { AnimatePresence, motion } from "framer-motion";
import { Search, Loader2, ChevronLeft, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductImageUrl } from "@/features/mockup";
import type { DbProduct } from "@/features/mockup";

interface MagicUpProductPickerModalProps {
  open: boolean;
  onClose: () => void;
  products: DbProduct[];
  productsLoading: boolean;
  productSearch: string;
  setProductSearch: (s: string) => void;
  productPage: number;
  setProductPage: (fn: (p: number) => number) => void;
  totalProducts: number;
  onSelect: (product: DbProduct) => void;
}

const MagicUpProductPickerModal = ({
  open, onClose, products, productsLoading,
  productSearch, setProductSearch, productPage, setProductPage,
  totalProducts, onSelect,
}: MagicUpProductPickerModalProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="w-full max-w-3xl max-h-[70vh] bg-card rounded-2xl border border-border shadow-elevated flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <h2 className="text-sm font-display font-semibold text-foreground">Selecionar Produto</h2>
            <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome ou SKU..."
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setProductPage(() => 0); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => onSelect(product)}
                    className="rounded-lg border border-border hover:border-primary/40 overflow-hidden text-left transition-all hover:shadow-glow"
                  >
                    <div className="aspect-square bg-surface-2 flex items-center justify-center p-2">
                      <img src={getProductImageUrl(product)} alt={product.name} className="w-full h-full object-contain" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                    </div>
                    <div className="p-2">
                      <h3 className="text-[10px] font-semibold text-foreground truncate">{product.name}</h3>
                      <p className="text-[9px] text-muted-foreground truncate">{product.sku}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {totalProducts > 12 && (
            <div className="p-3 border-t border-border flex items-center justify-center gap-2 shrink-0">
              <Button variant="outline" size="sm" disabled={productPage === 0} onClick={() => setProductPage(p => p - 1)} className="text-xs">
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                {productPage + 1} / {Math.ceil(totalProducts / 12)}
              </span>
              <Button variant="outline" size="sm" disabled={productPage >= Math.ceil(totalProducts / 12) - 1} onClick={() => setProductPage(p => p + 1)} className="text-xs">
                <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default MagicUpProductPickerModal;
