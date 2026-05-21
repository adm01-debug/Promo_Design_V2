import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Plus } from "lucide-react";

interface RuleChipsProps {
  items: string[];
  variant: "do" | "dont";
  editable?: boolean;
  onRemove?: (index: number) => void;
  onAdd?: (rule: string) => void;
}

export function RuleChips({ items, variant, editable, onRemove, onAdd }: RuleChipsProps) {
  const Icon = variant === "do" ? Check : X;
  const colorClass =
    variant === "do"
      ? "border-success/40 text-success bg-success/5"
      : "border-destructive/40 text-destructive bg-destructive/5";
  const inputColorClass =
    variant === "do"
      ? "border-success/50 text-success focus-within:border-success"
      : "border-destructive/50 text-destructive focus-within:border-destructive";

  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const invalidTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashInvalid = () => {
    setInvalid(true);
    if (invalidTimer.current) clearTimeout(invalidTimer.current);
    invalidTimer.current = setTimeout(() => setInvalid(false), 1000);
  };

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft("");
      return;
    }
    const exists = items.some((it) => it.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      flashInvalid();
      return;
    }
    onAdd?.(trimmed);
    setDraft("");
  };

  const showInput = editable && !!onAdd;

  if (items.length === 0 && !showInput) {
    return <div className="text-xs text-muted-foreground">Nenhuma regra adicionada.</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <Badge
          key={i}
          variant="outline"
          className={`${colorClass} gap-1.5 py-1 pl-2 pr-1 text-xs font-normal`}
        >
          <Icon className="w-3 h-3 flex-shrink-0" />
          <span className="max-w-[260px] truncate">{item}</span>
          {editable && onRemove && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-4 w-4 hover:bg-transparent opacity-60 hover:opacity-100"
              onClick={() => onRemove(i)}
              aria-label={`Remover regra: ${item}`}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </Badge>
      ))}
      {showInput && (
        <div
          className={`inline-flex items-center gap-1.5 py-1 pl-2 pr-2 text-xs rounded-md border border-dashed bg-transparent transition-colors ${
            invalid ? "border-destructive text-destructive" : inputColorClass
          }`}
        >
          <Plus className="w-3 h-3 flex-shrink-0 opacity-70" />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDraft("");
              }
            }}
            onBlur={() => {
              if (draft.trim()) submit();
            }}
            placeholder="Adicionar regra"
            className="bg-transparent outline-none placeholder:text-muted-foreground w-[160px] text-xs"
            aria-label={variant === "do" ? "Adicionar regra Do" : "Adicionar regra Don't"}
          />
        </div>
      )}
    </div>
  );
}
