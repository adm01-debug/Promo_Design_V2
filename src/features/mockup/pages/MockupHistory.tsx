import { motion } from "framer-motion";
import { History, Search, Eye, Loader2, Package, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useMockupDrafts } from "../hooks/use-mockup-drafts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const MockupHistory = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { drafts, isLoading } = useMockupDrafts();

  const filteredDrafts = useMemo(() => {
    return drafts.filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.productName?.toLowerCase().includes(search.toLowerCase()) ||
      d.productSku?.toLowerCase().includes(search.toLowerCase())
    );
  }, [drafts, search]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Histórico de Mockups
          </h1>
          <p className="text-sm text-muted-foreground">Mockups salvos e rascunhos recentes</p>
        </div>
      </div>

      {/* Search & filters */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por produto, SKU ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">Carregando seu histórico...</p>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-display font-semibold text-foreground mb-1">
            {search ? "Nenhum resultado encontrado" : "Nenhum mockup gerado"}
          </p>
          <p className="text-xs text-muted-foreground">
            {search ? "Tente ajustar sua busca" : "Comece criando um novo mockup no Studio"}
          </p>
          {!search && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/mockup/new")}>
              Ir para o Studio
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDrafts.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-border bg-card overflow-hidden group hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md"
              onClick={() => navigate(`/mockup/new?draft=${m.id}`)}
            >
              <div className="aspect-video bg-muted/30 relative flex items-center justify-center overflow-hidden">
                {m.thumbnailUrl ? (
                  <img src={m.thumbnailUrl} alt={m.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <Package className="w-10 h-10 text-muted-foreground/30" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity gap-2">
                  <Button variant="secondary" size="sm" className="h-8 text-xs gap-1">
                    <Eye className="w-3.5 h-3.5" /> Editar
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-foreground truncate">{m.name}</h3>
                {m.productName && <p className="text-[10px] text-primary font-mono mt-1">{m.productName}</p>}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(m.updatedAt), { addSuffix: true, locale: ptBR })}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MockupHistory;
