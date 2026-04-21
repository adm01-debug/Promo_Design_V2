import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface RuleChipsProps {
  items: string[];
  variant: "do" | "dont";
  editable?: boolean;
  onRemove?: (index: number) => void;
}

export function RuleChips({ items, variant, editable, onRemove }: RuleChipsProps) {
  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground">Nenhuma regra adicionada.</div>;
  }
  const Icon = variant === "do" ? Check : X;
  const colorClass = variant === "do" ? "border-success/40 text-success bg-success/5" : "border-destructive/40 text-destructive bg-destructive/5";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className={`${colorClass} gap-1.5 py-1 pl-2 pr-1 text-xs font-normal`}>
          <Icon className="w-3 h-3 flex-shrink-0" />
          <span className="max-w-[260px] truncate">{item}</span>
          {editable && onRemove && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-4 w-4 hover:bg-transparent opacity-60 hover:opacity-100"
              onClick={() => onRemove(i)}
              aria-label="Remover regra"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </Badge>
      ))}
    </div>
  );
}