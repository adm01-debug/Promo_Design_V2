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

export interface ColumnDef<Id extends string> {
  id: Id;
  label: string;
}

interface Props<Id extends string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All available columns, in canonical order. */
  allColumns: readonly ColumnDef<Id>[];
  /** Current selection (preselected on open). */
  value: Id[];
  /** Default selection used by the "Padrão" preset. */
  defaults: Id[];
  /** Asset count being exported, shown in subtitle. */
  assetCount: number;
  /** Title (e.g. "Escolher colunas do CSV"). */
  title: string;
  /** Subtitle prefix (e.g. "Selecione quais colunas incluir no arquivo"). */
  description?: string;
  /** Confirm button label prefix (e.g. "Exportar CSV"). */
  confirmLabel: string;
  /** Confirms with the chosen columns (always returned in canonical order). */
  onConfirm: (columns: Id[]) => void;
}

/**
 * Generic column-picker dialog. Used for both CSV and PDF exports — keeps
 * the UX identical so the user always knows what to expect.
 */
export function ColumnsDialog<Id extends string>({
  open,
  onOpenChange,
  allColumns,
  value,
  defaults,
  assetCount,
  title,
  description,
  confirmLabel,
  onConfirm,
}: Props<Id>) {
  const [selected, setSelected] = useState<Set<Id>>(() => new Set(value));

  useEffect(() => {
    if (open) setSelected(new Set(value));
  }, [open, value]);

  const allIds = useMemo(() => allColumns.map((c) => c.id), [allColumns]);
  const allChecked = selected.size === allIds.length;
  const noneChecked = selected.size === 0;

  const toggle = (id: Id, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allIds));
  const selectNone = () => setSelected(new Set());
  const selectDefault = () => setSelected(new Set(defaults));

  const handleConfirm = () => {
    const ordered = allIds.filter((id) => selected.has(id));
    onConfirm(ordered);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            {description ?? "Selecione quais colunas incluir no arquivo."} {assetCount} asset(s)
            serão exportados.
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
            {allColumns.map((col) => {
              const checked = selected.has(col.id);
              return (
                <div
                  key={col.id}
                  className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50"
                >
                  <Checkbox
                    id={`col-${col.id}`}
                    checked={checked}
                    onCheckedChange={(v) => toggle(col.id, v === true)}
                  />
                  <Label
                    htmlFor={`col-${col.id}`}
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
            {confirmLabel} ({selected.size} {selected.size === 1 ? "coluna" : "colunas"})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
