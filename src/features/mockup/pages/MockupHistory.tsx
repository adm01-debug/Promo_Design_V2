import { motion } from "framer-motion";
import { History, Search, Filter, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const MockupHistory = () => {
  const [search, setSearch] = useState("");
  const mockups: Array<{ id: string; productName: string; technique: string; createdAt: string }> = [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Histórico de Mockups</h1>
          <p className="text-sm text-muted-foreground">Todos os mockups gerados</p>
        </div>
      </div>

      {/* Search & filters */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por produto, cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </Button>
      </div>

      {mockups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <History className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-display font-semibold text-foreground mb-1">Nenhum mockup gerado</p>
          <p className="text-xs text-muted-foreground">Seus mockups exportados aparecerão aqui</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockups.map((m: any) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-border bg-card overflow-hidden group"
            >
              <div className="aspect-video bg-surface-2 relative">
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                  <Button variant="ghost" size="sm" className="text-white gap-1">
                    <Eye className="w-4 h-4" /> Ver
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white gap-1">
                    <Download className="w-4 h-4" /> Baixar
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-foreground truncate">{m.productName}</h3>
                <p className="text-xs text-muted-foreground">{m.technique} · {m.createdAt}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MockupHistory;
