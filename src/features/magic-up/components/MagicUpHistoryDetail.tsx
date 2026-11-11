import { motion } from "framer-motion";
import { X, Heart, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MagicUpHistoryItem } from "@/features/magic-up";

interface MagicUpHistoryDetailProps {
  item: MagicUpHistoryItem;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

const MagicUpHistoryDetail = ({
  item,
  onClose,
  onToggleFavorite,
  onDelete,
}: MagicUpHistoryDetailProps) => (
  <motion.div
    initial={{ width: 0, opacity: 0 }}
    animate={{ width: 280, opacity: 1 }}
    exit={{ width: 0, opacity: 0 }}
    className="bg-surface-1 border-l border-border flex flex-col overflow-hidden shrink-0"
  >
    <div className="p-4 border-b border-border flex items-center justify-between">
      <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        Detalhes
      </h3>
      <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
    <div className="flex-1 overflow-auto">
      <div className="aspect-square bg-surface-2 flex items-center justify-center">
        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="p-4 space-y-4">
        {item.productName && (
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
              Produto
            </label>
            <p className="text-xs font-semibold text-foreground">{item.productName}</p>
            {item.productSku && (
              <p className="text-[10px] text-muted-foreground font-mono">{item.productSku}</p>
            )}
          </div>
        )}
        {item.style && (
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
              Estilo
            </label>
            <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary border border-primary/30">
              {item.style}
            </span>
          </div>
        )}
        <div>
          <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
            Prompt
          </label>
          <p className="text-xs text-foreground leading-relaxed bg-surface-2 rounded-lg p-2 border border-border font-mono">
            {item.prompt}
          </p>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
            Data
          </label>
          <p className="text-xs text-foreground font-mono">
            {format(new Date(item.createdAt), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>
    </div>
    <div className="p-4 border-t border-border space-y-2">
      <Button
        className="w-full gap-2 text-xs bg-gradient-primary text-primary-foreground"
        size="sm"
      >
        <Download className="w-3.5 h-3.5" /> Baixar Imagem
      </Button>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className={`flex-1 gap-1.5 text-xs ${item.favorite ? "text-accent border-accent/40" : ""}`}
          onClick={() => onToggleFavorite(item.id)}
        >
          <Heart className={`w-3.5 h-3.5 ${item.favorite ? "fill-current" : ""}`} />
          {item.favorite ? "Desfav." : "Favoritar"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-3.5 h-3.5" /> Excluir
        </Button>
      </div>
    </div>
  </motion.div>
);

export default MagicUpHistoryDetail;
