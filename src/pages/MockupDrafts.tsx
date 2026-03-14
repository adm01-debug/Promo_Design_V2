import { motion } from "framer-motion";
import { FolderOpen, Clock, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const MockupDrafts = () => {
  // Placeholder - will connect to DB when Cloud is enabled
  const drafts: any[] = [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Rascunhos</h1>
          <p className="text-sm text-muted-foreground">Mockups salvos automaticamente</p>
        </div>
        <Link to="/mockup/new">
          <Button className="bg-gradient-primary text-primary-foreground text-sm">
            Novo Mockup
          </Button>
        </Link>
      </div>

      {drafts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <FolderOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-display font-semibold text-foreground mb-1">Nenhum rascunho</p>
          <p className="text-xs text-muted-foreground">Seus mockups serão salvos automaticamente aqui</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {drafts.map((draft: any) => (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-border bg-card overflow-hidden group hover:border-primary/40 transition-colors"
            >
              <div className="aspect-video bg-surface-2 flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-foreground truncate">{draft.name}</h3>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {draft.updatedAt}
                </div>
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    <Edit3 className="w-3 h-3" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive">
                    <Trash2 className="w-3 h-3" /> Excluir
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MockupDrafts;
