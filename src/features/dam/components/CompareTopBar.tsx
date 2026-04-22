import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Layers, Trash2, LogOut } from "lucide-react";

interface Props {
  count: number;
  max: number;
  onClear: () => void;
  onExit: () => void;
  onExitAndClear: () => void;
}

export function CompareTopBar({ count, max, onClear, onExit, onExitAndClear }: Props) {
  return (
    <div className="border-b border-border bg-card/60 backdrop-blur-sm px-3 py-2 flex items-center gap-2 shrink-0">
      <Layers className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium">Modo comparação</span>
      <Badge variant="secondary" className="text-[10px]">
        {count} de {max} selecionados
      </Badge>
      <span className="text-xs text-muted-foreground hidden md:inline">
        Use o strip abaixo para selecionar · Espaço alterna o asset ativo
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={count === 0}
          className="h-8 px-2 text-xs gap-1"
          title="Limpar a seleção atual (mantém o modo comparação)"
        >
          <Trash2 className="w-3.5 h-3.5" /> Limpar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="h-8 px-2 text-xs gap-1"
          title="Voltar para a pré-visualização (mantém a seleção salva)"
        >
          <X className="w-3.5 h-3.5" /> Sair (M)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onExitAndClear}
          className="h-8 px-2 text-xs gap-1"
          title="Sair do modo comparação e limpar a seleção"
          aria-label="Sair do modo comparação e limpar a seleção"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair e limpar
        </Button>
      </div>
    </div>
  );
}
