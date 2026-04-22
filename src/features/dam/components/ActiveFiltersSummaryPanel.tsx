import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Filter, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Asset, AssetType } from "../hooks/use-assets";
import type { DamFiltersState } from "../hooks/use-dam-filters";
import { diagnoseAssetRemoval, type DiagnosisCauseKind } from "../lib/filter-diagnosis";

const TYPE_LABELS: Record<AssetType, string> = {
  logo: "Logo",
  art: "Arte",
  photo: "Foto",
  mockup: "Mockup",
  document: "Documento",
  other: "Outro",
};

interface FilterChip {
  kind: DiagnosisCauseKind | "size" | "updated" | "ocrOnly" | "archivedOnly";
  label: string;
  /** When true, this filter is most likely excluding the asset. */
  suspect: boolean;
  onClear?: () => void;
}

interface Props {
  state: DamFiltersState;
  activeAsset: Asset | null;
  clientNameById?: Record<string, string>;
  onClearAssetTypes: () => void;
  onClearClient: () => void;
  onClearTags: () => void;
  onClearSearch: () => void;
  onClearArchived: () => void;
  onResetAll: () => void;
}

/**
 * Compact panel that summarizes every active filter and visually flags
 * which ones are most likely excluding the currently active asset, based on
 * the same heuristic used by `diagnoseAssetRemoval`.
 */
export function ActiveFiltersSummaryPanel({
  state,
  activeAsset,
  clientNameById,
  onClearAssetTypes,
  onClearClient,
  onClearTags,
  onClearSearch,
  onClearArchived,
  onResetAll,
}: Props) {
  const [open, setOpen] = useState(true);

  // Suspect kinds = the ones diagnoseAssetRemoval would emit for this asset.
  const suspectKinds = useMemo<Set<DiagnosisCauseKind>>(() => {
    if (!activeAsset) return new Set();
    const causes = diagnoseAssetRemoval(activeAsset, state, { clientNameById });
    return new Set(causes.map((c) => c.kind));
  }, [activeAsset, state, clientNameById]);

  const chips = useMemo<FilterChip[]>(() => {
    const items: FilterChip[] = [];

    if (state.search.trim()) {
      items.push({
        kind: "search",
        label: `Busca: "${state.search.trim()}"`,
        suspect: suspectKinds.has("search"),
        onClear: onClearSearch,
      });
    }

    if (state.assetTypes.length > 0) {
      items.push({
        kind: "assetTypes",
        label: `Tipos: ${state.assetTypes.map((t) => TYPE_LABELS[t]).join(", ")}`,
        suspect: suspectKinds.has("assetTypes"),
        onClear: onClearAssetTypes,
      });
    }

    if (state.clientId !== "all") {
      const label =
        state.clientId === "none"
          ? "Cliente: sem cliente"
          : `Cliente: ${clientNameById?.[state.clientId] ?? "selecionado"}`;
      items.push({
        kind: "clientId",
        label,
        suspect: suspectKinds.has("clientId"),
        onClear: onClearClient,
      });
    }

    if (state.tags.length > 0) {
      const mode = state.tagsMode === "all" ? "todas" : "qualquer";
      items.push({
        kind: "tags",
        label: `Tags (${mode}): ${state.tags.join(", ")}`,
        suspect: suspectKinds.has("tags"),
        onClear: onClearTags,
      });
    }

    if (!state.includeArchived) {
      items.push({
        kind: "includeArchived",
        label: "Ocultar arquivados",
        suspect: suspectKinds.has("includeArchived"),
        onClear: onClearArchived,
      });
    }

    if (state.sizeRange && state.sizeRange !== "any") {
      items.push({ kind: "size", label: `Tamanho: ${state.sizeRange}`, suspect: false });
    }
    if (state.updatedRange && state.updatedRange !== "any") {
      items.push({ kind: "updated", label: `Atualização: ${state.updatedRange}`, suspect: false });
    }
    if (state.ocrOnly) {
      items.push({ kind: "ocrOnly", label: "Apenas com OCR", suspect: false });
    }
    if (state.archivedOnly) {
      items.push({ kind: "archivedOnly", label: "Apenas arquivados", suspect: false });
    }

    return items;
  }, [
    state,
    suspectKinds,
    clientNameById,
    onClearSearch,
    onClearAssetTypes,
    onClearClient,
    onClearTags,
    onClearArchived,
  ]);

  if (chips.length === 0) return null;

  const suspectCount = chips.filter((c) => c.suspect).length;

  return (
    <div className="border-b border-border bg-muted/20" data-testid="active-filters-summary">
      <div className="px-4 py-2 flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Filtros ativos
        </span>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono tabular-nums">
          {chips.length}
        </Badge>
        {suspectCount > 0 && activeAsset && (
          <Badge
            variant="outline"
            className="h-5 px-1.5 text-[10px] gap-1 border-warning/40 text-warning"
            title={`${suspectCount} filtro(s) provavelmente excluem o asset atual`}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            {suspectCount} suspeito{suspectCount === 1 ? "" : "s"}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 px-2 text-[11px]"
          onClick={onResetAll}
          aria-label="Limpar todos os filtros"
        >
          Limpar tudo
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Recolher painel de filtros" : "Expandir painel de filtros"}
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {open && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={`${chip.kind}-${chip.label}`}
              type="button"
              onClick={chip.onClear}
              disabled={!chip.onClear}
              className={cn(
                "inline-flex items-center gap-1 h-6 rounded-full border px-2 text-[11px] transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                chip.suspect
                  ? "border-warning/50 bg-warning/10 text-warning hover:bg-warning/20"
                  : "border-border bg-background text-foreground hover:bg-muted",
                !chip.onClear && "cursor-default opacity-80",
              )}
              title={
                chip.suspect
                  ? "Provavelmente exclui o asset atual — clique para remover"
                  : chip.onClear
                    ? "Clique para remover este filtro"
                    : undefined
              }
            >
              {chip.suspect && <AlertTriangle className="w-2.5 h-2.5" />}
              <span className="truncate max-w-[220px]">{chip.label}</span>
              {chip.onClear && <span aria-hidden className="text-muted-foreground">×</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
