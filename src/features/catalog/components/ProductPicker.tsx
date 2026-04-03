import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Package, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useCatalog, type CatalogProduct } from "@/features/catalog";

interface ProductPickerProps {
  value: { name: string; sku: string; material: string; colors: string };
  onChange: (product: { name: string; sku: string; material: string; colors: string }) => void;
}

const ProductPicker = ({ value, onChange }: ProductPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { products, categories, isLoading } = useCatalog();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products
      .filter((p) => p.active)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
  }, [products, search]);

  const handleSelect = (p: CatalogProduct) => {
    onChange({
      name: p.name,
      sku: p.sku || "",
      material: p.material || "",
      colors: p.colors || "",
    });
    setOpen(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
        >
          <Package className="w-3.5 h-3.5" />
          {value.name ? "Trocar produto" : "Buscar no catálogo"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Selecionar Produto do Catálogo
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, SKU ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {products.length === 0
                  ? "Nenhum produto cadastrado. Acesse o Catálogo para criar."
                  : "Nenhum produto encontrado."}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filtered.map((p) => {
                const selected = value.name === p.name && value.sku === (p.sku || "");
                return (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    type="button"
                    onClick={() => handleSelect(p)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-accent border border-transparent"
                    }`}
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-10 h-10 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.sku && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {p.sku}
                          </span>
                        )}
                        {p.categoryName && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {p.categoryName}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductPicker;
