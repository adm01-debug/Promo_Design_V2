import { motion } from "framer-motion";
import { Copy, Image as ImageIcon, Package, Loader2, AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DownloadMenu from "@/features/magic-up/components/DownloadMenu";
import type { MagicUpJob } from "@/features/magic-up/hooks/use-magic-up-jobs";
import type { DbProduct } from "@/features/mockup";

interface MagicUpResultsGridProps {
  jobs: MagicUpJob[];
  jobsLoading: boolean;
  selectedProduct: DbProduct | null;
  onOpenProductPicker: () => void;
}

const isPending = (status: MagicUpJob["status"]) => status === "queued" || status === "processing";

const MagicUpResultsGrid = ({
  jobs,
  jobsLoading,
  selectedProduct,
  onOpenProductPicker,
}: MagicUpResultsGridProps) => {
  if (jobsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-7 h-7 text-primary animate-spin mb-3" />
        <p className="text-xs text-muted-foreground">Carregando gerações…</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
          <ImageIcon className="w-9 h-9 text-muted-foreground" />
        </div>
        <p className="text-sm font-display font-semibold text-foreground mb-1">
          Nenhuma geração ainda
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {selectedProduct
            ? `Selecione um estilo e gere para "${selectedProduct.name}"`
            : "Selecione um produto ou digite um prompt"}
        </p>
        {!selectedProduct && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onOpenProductPicker}
          >
            <Package className="w-3.5 h-3.5" /> Começar com um Produto
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {jobs.map((job, index) => (
        <motion.div
          key={job.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.04 }}
          className="rounded-xl border border-border overflow-hidden group transition-all hover:border-primary/40"
        >
          <div className="aspect-square bg-surface-2 relative flex items-center justify-center">
            {job.status === "done" && job.result_image_url ? (
              <img
                src={job.result_image_url}
                alt={`Variação ${job.style} de ${job.product_name ?? "produto"}`}
                className="w-full h-full object-cover"
              />
            ) : isPending(job.status) ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-[10px] text-muted-foreground">
                  {job.status === "queued" ? "Na fila" : "Gerando"}
                </span>
              </div>
            ) : job.status === "failed" ? (
              <div className="flex flex-col items-center gap-2 px-2 text-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
                <span className="text-[10px] text-muted-foreground line-clamp-2">
                  {job.error_message ?? "Falhou"}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Clock className="w-6 h-6 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Cancelado</span>
              </div>
            )}

            {job.status === "done" && job.result_image_url && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <DownloadMenu imageUrl={job.result_image_url} fileName={`magicup-${job.id}`} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white h-8 w-8 p-0"
                  aria-label="Copiar link da imagem"
                  onClick={() => {
                    void navigator.clipboard.writeText(job.result_image_url as string);
                    toast.success("Link da imagem copiado");
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="p-2 bg-card">
            <p className="text-[10px] font-mono text-center text-muted-foreground">{job.style}</p>
            {job.product_name && (
              <p className="text-[10px] text-primary font-mono text-center truncate mt-0.5">
                {job.product_name}
              </p>
            )}
          </div>
        </motion.div>
      ))}

      <div className="col-span-2 lg:col-span-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
        <p className="text-[10px] text-muted-foreground font-mono line-clamp-1">
          {jobs[0]?.prompt}
        </p>
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs shrink-0">
          <Link to="/magicup/jobs">Ver fila completa</Link>
        </Button>
      </div>
    </div>
  );
};

export default MagicUpResultsGrid;
