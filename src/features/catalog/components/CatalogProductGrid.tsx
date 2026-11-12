import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Trash2, Edit3, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { CatalogProduct } from "@/features/catalog";

interface CatalogProductGridProps {
  filtered: CatalogProduct[];
  products: CatalogProduct[];
  isLoading: boolean;
  onOpenNew: () => void;
  onEdit: (p: CatalogProduct) => void;
  onDelete: (id: string) => void;
  onToggleActive: (p: CatalogProduct) => void;
}

const CatalogProductGrid = ({
  filtered,
  products,
  isLoading,
  onOpenNew,
  onEdit,
  onDelete,
  onToggleActive,
}: CatalogProductGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
        <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          {products.length === 0 ? "Nenhum produto cadastrado" : "Nenhum resultado"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {products.length === 0
            ? 'Clique em "Novo Produto" para começar seu catálogo'
            : "Tente ajustar os filtros de busca"}
        </p>
        {products.length === 0 && (
          <Button className="mt-4 gap-1.5" onClick={onOpenNew}>
            <Plus className="w-4 h-4" />
            Cadastrar primeiro produto
          </Button>
        )}
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence>
        {filtered.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`group relative rounded-xl border p-4 transition-shadow hover:shadow-md ${!p.active ? "opacity-60" : ""}`}
          >
            <div className="flex items-start gap-3">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  className="w-14 h-14 rounded-lg object-cover shrink-0 bg-muted"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                {p.sku && <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</p>}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {p.categoryName && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {p.categoryName}
                    </Badge>
                  )}
                  {!p.active && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30"
                    >
                      Inativo
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {(p.material || p.colors) && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {p.material && <span>📦 {p.material}</span>}
                {p.colors && <span>🎨 {p.colors}</span>}
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onToggleActive(p)}
                title={p.active ? "Desativar" : "Ativar"}
              >
                {p.active ? (
                  <ToggleRight className="w-4 h-4 text-primary" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(p)}>
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{p.name}" será removido permanentemente do catálogo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(p.id)}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default CatalogProductGrid;
