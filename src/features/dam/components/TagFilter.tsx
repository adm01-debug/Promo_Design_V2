import { useMemo, useState } from "react";
import { Check, Tag as TagIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface TagFilterProps {
  availableTags: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  mode?: "all" | "any";
  onModeChange?: (mode: "all" | "any") => void;
}

export function TagFilter({ availableTags, selected, onChange, mode = "all", onModeChange }: TagFilterProps) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => [...availableTags].sort((a, b) => a.localeCompare(b)), [availableTags]);

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <TagIcon className="w-3.5 h-3.5" />
            Tags {selected.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5">
                {selected.length} · {mode === "all" ? "Todas" : "Qualquer"}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          {onModeChange && selected.length > 1 && (
            <div className="p-2 border-b" role="radiogroup" aria-label="Modo de combinação de tags">
              <ToggleGroup
                type="single"
                size="sm"
                value={mode}
                onValueChange={(v) => v && onModeChange(v as "all" | "any")}
                className="w-full justify-stretch"
              >
                <ToggleGroupItem value="all" className="flex-1 text-xs" aria-label="Todas as tags">
                  Todas
                </ToggleGroupItem>
                <ToggleGroupItem value="any" className="flex-1 text-xs" aria-label="Qualquer tag">
                  Qualquer
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}
          <Command>
            <CommandInput placeholder="Buscar tag..." />
            <CommandList>
              <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
              <CommandGroup>
                {sorted.map((tag) => {
                  const active = selected.includes(tag);
                  return (
                    <CommandItem key={tag} onSelect={() => toggle(tag)} className="cursor-pointer">
                      <Check className={cn("w-4 h-4 mr-2", active ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{tag}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            onClick={() => toggle(tag)}
            className="rounded hover:bg-background/50 p-0.5"
            aria-label={`Remover ${tag}`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      {selected.length > 0 && (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange([])}>
          Limpar
        </Button>
      )}
    </div>
  );
}