import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagCounter } from "@/components/ui/tag-counter";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface Props {
  suggestions: string[];
  onAddTag: (tag: string) => void;
  onAddAll: () => void;
  remainingSlots: number;
}

export function AssetUploadAutoSuggestions({
  suggestions,
  onAddTag,
  onAddAll,
  remainingSlots,
}: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Sugestões automáticas
          </Label>
          <TagCounter count={suggestions.length} max={12} className="h-3.5 px-1 text-[9px]" />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/5"
          onClick={onAddAll}
          disabled={remainingSlots <= 0}
        >
          <Plus className="w-3 h-3 mr-1" />
          Adicionar todas
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((t) => (
          <Badge
            key={t}
            variant="outline"
            className="cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-colors py-0.5 text-[10px] font-normal"
            onClick={() => onAddTag(t)}
          >
            {t}
          </Badge>
        ))}
      </div>
    </div>
  );
}
