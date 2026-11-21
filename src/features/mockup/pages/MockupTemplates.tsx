import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutTemplate, Clock, Copy, Trash2, Loader2, Package, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useMockupDrafts } from "@/features/mockup";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Templates de mockup salvos — reuso de configurações/arte pronta. */
const MockupTemplates = () => {
  const navigate = useNavigate();
  const { drafts, isLoading, deleteDraft, saveDraft } = useMockupDrafts();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const templates = useMemo(() => {
    return drafts
      .filter((d) => d.isTemplate)
      .filter((d) => {
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.productName?.toLowerCase().includes(q) ||
          d.productSku?.toLowerCase().includes(q)
        );
      });
  }, [drafts, search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDraft(deleteId);
      toast.success("Template excluído!");
    } catch {
      toast.error("Erro ao excluir template.");
    }
    setDeleteId(null);
  };

  const handleUse = (id: string) => navigate(`/mockup/new?draft=${id}`);

  const handleClone = async (id: string) => {
    const src = drafts.find((d) => d.id === id);
    if (!src) return;
    try {
      await saveDraft({
        name: `${src.name} (cópia)`,
        productName: src.productName,
        productSku: src.productSku,
        thumbnailUrl: src.thumbnailUrl,
        editorState: src.editorState ?? undefined,
      });
      toast.success("Cópia criada em seus rascunhos.");
      navigate("/mockup/drafts");
    } catch {
      toast.error("Erro ao clonar template.");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-primary" /> Templates de Mockup
          </h1>
          <p className="text-sm text-muted-foreground">
            Reuse configurações e artes prontas para novos pedidos
          </p>
        </div>
      </div>

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
          <p className="text-sm text-muted-foreground">Carregando templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <LayoutTemplate className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-display font-semibold text-foreground mb-1">
            {search ? "Nenhum template encontrado" : "Nenhum template salvo"}
          </p>
          <p className="text-xs text-muted-foreground">
            {search
              ? "Tente ajustar sua busca"
              : "Salve um mockup pronto como template no Studio ou no histórico"}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {templates.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-xl border border-border bg-card overflow-hidden group hover:border-primary/40 transition-all cursor-pointer shadow-sm hover:shadow-md"
                onClick={() => handleUse(t.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleUse(t.id);
                  }
                }}
              >
                <div className="aspect-video bg-muted/30 relative flex items-center justify-center overflow-hidden">
                  {t.thumbnailUrl ? (
                    <img
                      src={t.thumbnailUrl}
                      alt={t.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  )}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
                    <LayoutTemplate className="w-3 h-3" /> Template
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity" />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-foreground truncate">{t.name}</h3>
                  {t.productName && (
                    <p className="text-[10px] text-primary font-mono mt-1 truncate">
                      {t.productName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true, locale: ptBR })}
                  </div>
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleClone(t.id);
                      }}
                    >
                      <Copy className="w-3 h-3" /> Clonar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(t.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" /> Excluir
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-card p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          <Check className="w-3.5 h-3.5 inline-block mr-1 text-primary" />
          Dica
        </h3>
        <p className="text-sm text-foreground">
          No Studio, use o botão <span className="font-semibold">Salvar como Template</span> (na
          barra superior, etapa Canvas) para transformar um mockup pronto em template reutilizável.
        </p>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Este template será removido permanentemente. Rascunhos criados a partir dele não são
              afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MockupTemplates;
