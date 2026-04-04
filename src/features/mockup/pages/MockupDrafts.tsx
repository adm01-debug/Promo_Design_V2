import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Clock, Trash2, Edit3, Loader2, Package, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useMockupDrafts } from "@/features/mockup";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MockupDrafts = () => {
  const { drafts, isLoading, deleteDraft } = useMockupDrafts();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDraft(deleteId);
      toast.success("Rascunho excluído!");
    } catch {
      toast.error("Erro ao excluir rascunho.");
    }
    setDeleteId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const dailyDraftData = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let d = 13; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(now.getDate() - d);
      const key = format(date, "dd/MM");
      map[key] = 0;
    }
    drafts.forEach((dr) => {
      const key = format(new Date(dr.createdAt), "dd/MM");
      if (key in map) map[key]++;
    });
    return Object.entries(map).map(([day, count]) => ({ day, count }));
  }, [drafts]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Rascunhos</h1>
          <p className="text-sm text-muted-foreground">
            {drafts.length} rascunho(s) salvo(s) na nuvem
          </p>
        </div>
        <Link to="/mockup/new">
          <Button className="bg-gradient-primary text-primary-foreground text-sm">
            Novo Mockup
          </Button>
        </Link>
      </div>

      {/* Analytics */}
      {drafts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{drafts.length}</p>
            <p className="text-xs text-muted-foreground">Total de Rascunhos</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold text-foreground">{drafts.filter(d => d.productName).length}</p>
            <p className="text-xs text-muted-foreground">Com Produto Vinculado</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 md:col-span-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> Criações (14 dias)
            </h3>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={dailyDraftData}>
                <defs>
                  <linearGradient id="draftGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--secondary))" fill="url(#draftGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : drafts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <FolderOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-display font-semibold text-foreground mb-1">Nenhum rascunho</p>
          <p className="text-xs text-muted-foreground">Seus mockups serão salvos automaticamente aqui</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {drafts.map((draft) => (
              <motion.div
                key={draft.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-xl border border-border bg-card overflow-hidden group hover:border-primary/40 transition-colors"
              >
                <div className="aspect-video bg-muted/30 flex items-center justify-center overflow-hidden">
                  {draft.thumbnailUrl ? (
                    <img src={draft.thumbnailUrl} alt={draft.name} className="w-full h-full object-contain" />
                  ) : (
                    <Package className="w-8 h-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-foreground truncate">{draft.name}</h3>
                  {draft.productName && (
                    <p className="text-[10px] text-muted-foreground truncate">{draft.productName}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(draft.updatedAt)}
                  </div>
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => navigate(`/mockup/new?draft=${draft.id}`)}
                    >
                      <Edit3 className="w-3 h-3" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-destructive"
                      onClick={() => setDeleteId(draft.id)}
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rascunho?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MockupDrafts;
