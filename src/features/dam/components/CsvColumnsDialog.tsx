import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CSV_COLUMNS, DEFAULT_CSV_COLUMNS, type CsvColumnId } from "../lib/asset-export";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial selection (controls preselected checkboxes when reopening). */
  value: CsvColumnId[];
  /** Asset count being exported, shown in subtitle. */
  assetCount: number;
  /** Confirms the export with the chosen columns. */
  onConfirm: (columns: CsvColumnId[]) => void;
}

/** Dialog that lets the user pick which CSV columns to include before exporting. */
export function CsvColumnsDialog({ open, onOpenChange, value, assetCount, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<CsvColumnId>>(() => new Set(value));

  // Sync when reopened with a different default.
  useEffect(() => {
    if (open) setSelected(new Set(value));
  }, [open, value]);

  const allIds = useMemo(() => CSV_COLUMNS.map((c) => c.id), []);
  const allChecked = selected.size === allIds.length;
  const noneChecked = selected.size === 0;

  const toggle = (id: CsvColumnId, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allIds));
  const selectNone = () => setSelected(new Set());
  const selectDefault = () => setSelected(new Set(DEFAULT_CSV_COLUMNS));

  const handleConfirm = () => {
    // Preserve canonical order (CSV_COLUMNS order), filter by selection.
    const ordered = allIds.filter((id) => selected.has(id));
    onConfirm(ordered);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Escolher colunas do CSV</DialogTitle>
          <DialogDescription className="text-xs">
            Selecione quais colunas incluir no arquivo. {assetCount} asset(s) serão exportados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 -mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={selectAll}
            disabled={allChecked}
          >
            Selecionar todas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={selectNone}
            disabled={noneChecked}
          >
            Limpar
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectDefault}>
            Padrão
          </Button>
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            {selected.size}/{allIds.length}
          </span>
        </div>

        <Separator />

        <ScrollArea className="h-72 pr-2">
          <div className="space-y-2">
            {CSV_COLUMNS.map((col) => {
              const checked = selected.has(col.id);
              return (
                <div
                  key={col.id}
                  className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50"
                >
                  <Checkbox
                    id={`csv-col-${col.id}`}
                    checked={checked}
                    onCheckedChange={(v) => toggle(col.id, v === true)}
                  />
                  <Label
                    htmlFor={`csv-col-${col.id}`}
                    className="text-xs font-normal cursor-pointer flex-1 flex items-center justify-between"
                  >
                    <span>{col.label}</span>
                    <code className="text-[10px] text-muted-foreground font-mono">{col.id}</code>
                  </Label>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={noneChecked}>
            Exportar CSV ({selected.size} {selected.size === 1 ? "coluna" : "colunas"})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
