import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Eye, Trash2, X, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useMagicUpHistory, type MagicUpHistoryItem } from "@/features/magic-up";
import MagicUpHistoryDetail from "@/features/magic-up/components/MagicUpHistoryDetail";
import DownloadMenu from "@/features/magic-up/components/DownloadMenu";

const MagicUpFavorites = () => {
  const { items, toggleFavorite, deleteItem } = useMagicUpHistory();
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<MagicUpHistoryItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!item.favorite) return false;
      if (!q) return true;
      return (
        item.prompt.toLowerCase().includes(q) ||
        item.productName?.toLowerCase().includes(q) ||
        item.productSku?.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const favCount = items.filter((i) => i.favorite).length;

  const handleDelete = (id: string) => {
    deleteItem(id);
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary fill-current" />
          <h1 className="text-sm font-display font-semibold text-foreground">Favoritos Magic Up</h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-2 py-0.5 rounded">
            {filtered.length} de {favCount}
          </span>
        </div>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-muted-foreground"
            onClick={() => setSearch("")}
          >
            <X className="w-3 h-3" /> Limpar busca
          </Button>
        )}
      </div>

      <div className="p-4 border-b border-border shrink-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar nos favoritos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
              <StopCircle className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-display font-semibold text-foreground mb-1">
              {favCount === 0 ? "Nenhum favorito ainda" : "Nenhum resultado"}
            </p>
            <p className="text-xs text-muted-foreground">
              {favCount === 0
                ? "Toque no coração de uma imagem no histórico para salvá-la aqui"
                : "Tente ajustar a busca"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border overflow-hidden group cursor-pointer transition-all bg-card hover:border-primary/40"
                onClick={() => setSelectedItem(item)}
              >
                <div className="aspect-square bg-surface-2 relative flex items-center justify-center">
                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white h-8 w-8 p-0"
                      aria-label="Ver detalhes"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <span onClick={(e) => e.stopPropagation()}>
                      <DownloadMenu imageUrl={item.imageUrl} fileName={`magicup-${item.id}`} />
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white h-8 w-8 p-0 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="absolute top-2 left-2 flex gap-1">
                    {item.style && (
                      <span className="bg-primary/80 text-primary-foreground text-[8px] px-1.5 py-0.5 rounded font-mono">
                        {item.style}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  {item.productName && (
                    <p className="text-[10px] text-primary font-mono mb-1 truncate">
                      {item.productName}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.prompt}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-mono">
                    {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedItem && (
          <MagicUpHistoryDetail
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onToggleFavorite={toggleFavorite}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MagicUpFavorites;
