import { motion } from "framer-motion";
import { Search, Loader2, Package, ChevronLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProductImageUrl } from "@/features/mockup";
import type { DbProduct } from "@/features/mockup";

interface MockupProductStepProps {
  search: string;
  setSearch: (s: string) => void;
  page: number;
  setPage: (fn: (p: number) => number) => void;
  products: DbProduct[];
  totalPages: number;
  productsLoading: boolean;
  selectedProductId: string | null;
  onSelect: (product: DbProduct) => void;
}

const MockupProductStep = ({
  search,
  setSearch,
  page,
  setPage,
  products,
  totalPages,
  productsLoading,
  selectedProductId,
  onSelect,
}: MockupProductStepProps) => (
  <motion.div
    key="product"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex-1 flex flex-col overflow-hidden"
  >
    <div className="p-4 border-b border-border shrink-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar produto por nome ou SKU... (6.100+ produtos)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(() => 0);
          }}
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
                onClick={() => onSelect(product)}
                className={`group rounded-lg border transition-all overflow-hidden text-left ${
                  selectedProductId === product.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="aspect-square bg-muted flex items-center justify-center p-2 relative">
                  <img
                    src={getProductImageUrl(product)}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
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
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs"
              >
                <ChevronLeft className="w-3 h-3" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground font-mono">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs"
              >
                Próximo <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  </motion.div>
);

export default MockupProductStep;
