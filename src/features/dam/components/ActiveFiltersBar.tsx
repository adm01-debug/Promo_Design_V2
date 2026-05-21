import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AssetType } from "../hooks/use-assets";

const TYPE_LABELS: Record<AssetType, string> = {
  logo: "Logo",
  art: "Arte",
  photo: "Foto",
  mockup: "Mockup",
  document: "Documento",
  other: "Outro",
};

interface ActiveFiltersBarProps {
  search?: string;
  onClearSearch?: () => void;
  assetTypes: AssetType[];
  onRemoveType: (t: AssetType) => void;
  clientId: string | "all" | "none";
  clientLabel?: string;
  onClearClient: () => void;
  tags: string[];
  tagsMode: "all" | "any";
  onRemoveTag: (t: string) => void;
  includeArchived: boolean;
  onClearArchived: () => void;
  onClearAll: () => void;
}

export function ActiveFiltersBar({
  search,
  onClearSearch,
  assetTypes,
  onRemoveType,
  clientId,
  clientLabel,
  onClearClient,
  tags,
  tagsMode,
  onRemoveTag,
  includeArchived,
  onClearArchived,
  onClearAll,
}: ActiveFiltersBarProps) {
  const hasAny =
    !!search || assetTypes.length > 0 || clientId !== "all" || tags.length > 0 || includeArchived;

  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Filtros ativos:</span>

      {search && (
        <Chip
          label={`Busca: ${search}`}
          onRemove={onClearSearch}
          ariaLabel={`Remover filtro de busca ${search}`}
        />
      )}

      {assetTypes.map((t) => (
        <Chip
          key={t}
          label={`Tipo: ${TYPE_LABELS[t]}`}
          onRemove={() => onRemoveType(t)}
          ariaLabel={`Remover filtro de tipo ${TYPE_LABELS[t]}`}
        />
      ))}

      {clientId !== "all" && (
        <Chip
          label={`Cliente: ${clientId === "none" ? "Sem cliente" : (clientLabel ?? "—")}`}
          onRemove={onClearClient}
          ariaLabel="Remover filtro de cliente"
        />
      )}

      {tags.length > 0 && (
        <Chip
          label={`Tags: ${tags.join(", ")} (${tagsMode === "all" ? "Todas" : "Qualquer"})`}
          onRemove={() => tags.forEach((t) => onRemoveTag(t))}
          ariaLabel="Remover todas as tags"
        />
      )}

      {includeArchived && (
        <Chip
          label="Arquivados incluídos"
          onRemove={onClearArchived}
          ariaLabel="Ocultar arquivados"
        />
      )}

      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAll}>
        Limpar tudo
      </Button>
    </div>
  );
}

function Chip({
  label,
  onRemove,
  ariaLabel,
}: {
  label: string;
  onRemove?: () => void;
  ariaLabel: string;
}) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1 max-w-[280px]">
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded hover:bg-background/50 p-0.5 shrink-0"
          aria-label={ariaLabel}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </Badge>
  );
}
