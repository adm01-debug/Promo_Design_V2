import { motion } from "framer-motion";
import { History, Search, Heart, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const MagicUpHistory = () => {
  const [search, setSearch] = useState("");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const generations: any[] = [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Histórico Magic Up</h1>
          <p className="text-sm text-muted-foreground">Todas as imagens geradas com IA</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por prompt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <Button
          variant={filterFavorites ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setFilterFavorites(!filterFavorites)}
        >
          <Heart className={`w-3.5 h-3.5 ${filterFavorites ? "fill-current" : ""}`} /> Favoritos
        </Button>
      </div>

      {generations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <History className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-display font-semibold text-foreground mb-1">Nenhuma geração ainda</p>
          <p className="text-xs text-muted-foreground">Suas imagens geradas com IA aparecerão aqui</p>
        </motion.div>
      ) : null}
    </div>
  );
};

export default MagicUpHistory;
