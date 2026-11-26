import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ListTree } from "lucide-react";
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
}

/**
 * Leitura do mapa tecnica-da-OS -> tecnica do Fast Gravacoes: e o que decide se
 * o job nasce no Fast Gravacoes. Tecnica fora do mapa gera fg_technique_id NULL
 * na fila (marcada como "Tecnica nao mapeada").
 */
export function TechniqueMapTable({ entries }: TechniqueMapTableProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <ListTree className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Nenhuma tecnica mapeada</p>
        <p className="text-sm text-muted-foreground">
          O mapa de tecnicas do Fast Gravacoes esta vazio.
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.promo_technique}>
            <TableCell className="font-medium">{entry.promo_technique}</TableCell>
            <TableCell>{entry.fg_technique_id}</TableCell>
            <TableCell>
              {format(new Date(entry.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
