import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ListTree, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TechniqueMapEntry } from "../hooks/use-technique-map";

interface TechniqueMapTableProps {
  entries: TechniqueMapEntry[];
  /** Owner/admin da organizacao: sem permissao, a coluna de acoes nao aparece. */
  canManage?: boolean;
  /** Chave que esta sendo salva ou excluida, para desabilitar a linha. */
  busyTechnique?: string | null;
  onEdit?: (entry: TechniqueMapEntry) => void;
  onDelete?: (entry: TechniqueMapEntry) => void;
}

/**
 * Leitura do mapa tecnica-da-OS -> tecnica do Fast Gravacoes: e o que decide se
 * o job nasce no Fast Gravacoes. Tecnica fora do mapa gera fg_technique_id NULL
 * na fila (marcada como "Tecnica nao mapeada").
 */
export function TechniqueMapTable({
  entries,
  canManage = false,
  busyTechnique = null,
  onEdit,
  onDelete,
}: TechniqueMapTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <ListTree className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Nenhuma tecnica mapeada</p>
        <p className="text-sm text-muted-foreground">
          O mapa de tecnicas do Fast Gravacoes esta vazio, entao nenhuma OS gera job la.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Tecnica na ordem de servico</TableHead>
          <TableHead scope="col">Tecnica no Fast Gravacoes</TableHead>
          <TableHead scope="col">Atualizado em</TableHead>
          {canManage && (
            <TableHead scope="col" className="text-right">
              Acoes
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const busy = busyTechnique === entry.promo_technique;
          return (
            <TableRow key={entry.promo_technique}>
              <TableCell className="font-medium">{entry.promo_technique}</TableCell>
              <TableCell>{entry.fg_technique_id}</TableCell>
              <TableCell>
                {format(new Date(entry.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onEdit?.(entry)}
                      aria-label={`Editar mapeamento da tecnica ${entry.promo_technique}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      <span className="ml-2">Editar</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onDelete?.(entry)}
                      aria-label={`Excluir mapeamento da tecnica ${entry.promo_technique}`}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      <span className="ml-2">Excluir</span>
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
