import { useEffect, useId, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TechniqueMapInput } from "../hooks/use-technique-map";

interface TechniqueMapFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mapeamento em edicao; null = novo mapeamento. */
  originalTechnique: string | null;
  /** Valores iniciais: editar uma linha ou mapear uma tecnica presa na fila. */
  initialValues: TechniqueMapInput;
  /** Ids de tecnica ja usados no Fast Gravacoes, sugeridos no campo de destino. */
  destinations: string[];
  isSaving: boolean;
  onSubmit: (values: TechniqueMapInput) => void;
}

/**
 * Cadastro do mapa tecnica-da-OS -> tecnica do Fast Gravacoes. Serve para criar
 * e para editar: sem linha no mapa a OS vai para o Fast Gravacoes sem tecnica e
 * nenhum job nasce la.
 */
export function TechniqueMapFormDialog({
  open,
  onOpenChange,
  originalTechnique,
  initialValues,
  destinations,
  isSaving,
  onSubmit,
}: TechniqueMapFormDialogProps) {
  const [promoTechnique, setPromoTechnique] = useState(initialValues.promoTechnique);
  const [fgTechniqueId, setFgTechniqueId] = useState(initialValues.fgTechniqueId);
  const destinationsId = useId();
  const editing = originalTechnique !== null;

  useEffect(() => {
    if (!open) return;
    setPromoTechnique(initialValues.promoTechnique);
    setFgTechniqueId(initialValues.fgTechniqueId);
  }, [open, initialValues.promoTechnique, initialValues.fgTechniqueId]);

  const canSubmit = promoTechnique.trim() !== "" && fgTechniqueId.trim() !== "" && !isSaving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit({
              promoTechnique: promoTechnique.trim(),
              fgTechniqueId: fgTechniqueId.trim(),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{editing ? "Editar mapeamento" : "Novo mapeamento"}</DialogTitle>
            <DialogDescription>
              A tecnica da ordem de servico e a tecnica correspondente no Fast Gravacoes. O que nao
              estiver aqui nao gera job no Fast Gravacoes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="mapa-tecnica-os">Tecnica na ordem de servico</Label>
            <Input
              id="mapa-tecnica-os"
              value={promoTechnique}
              onChange={(event) => setPromoTechnique(event.target.value)}
              placeholder="Sublimacao - Caneca"
              autoComplete="off"
              disabled={isSaving}
              required
            />
            <p className="text-xs text-muted-foreground">
              Gravamos do mesmo jeito que o sistema compara com a OS: minuscula, sem acento e com um
              espaco entre as palavras.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapa-tecnica-fg">Tecnica no Fast Gravacoes</Label>
            <Input
              id="mapa-tecnica-fg"
              list={destinationsId}
              value={fgTechniqueId}
              onChange={(event) => setFgTechniqueId(event.target.value)}
              placeholder="sublimation-mug"
              autoComplete="off"
              disabled={isSaving}
              required
            />
            <datalist id={destinationsId}>
              {destinations.map((destination) => (
                <option key={destination} value={destination} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Id da tecnica no cadastro do Fast Gravacoes (as opcoes ja usadas aparecem ao digitar).
              Id inexistente faz a entrega falhar la.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {editing ? "Salvar mapeamento" : "Criar mapeamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
