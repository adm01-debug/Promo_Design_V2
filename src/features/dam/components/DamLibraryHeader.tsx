import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { History, Link2, ScanText, Plus, RotateCcw, FolderArchive, PanelRight } from "lucide-react";
import { SavedSearchesMenu } from "./SavedSearchesMenu";
import { LibraryExportMenu } from "./LibraryExportMenu";
import { Toggle } from "@/components/ui/toggle";
import { MIN_SEARCH_LENGTH } from "../hooks/use-assets";
import { SORT_OPTIONS } from "../lib/dam-constants";
import type { UseDamFiltersReturn } from "../hooks/use-dam-filters";
import type { Asset, AssetType } from "../hooks/use-assets";
import type { SortValue } from "../lib/dam-constants";
import type { Client } from "@/features/clients/hooks/use-clients";

interface Props {
  filters: UseDamFiltersReturn;
  canUpload: boolean;
  onOpenUpload: () => void;
  onOpenActivity: () => void;
  onOpenBatchOcr: () => void;
  onOpenReset: () => void;
  quickPreview: { enabled: boolean; toggleEnabled: () => void };
  assets: Asset[];
  clients: Client[];
  total: number;
  ocrFilteredOut: number;
  debouncedSearch: string;
  organizationId: string;
}

export function DamLibraryHeader({
  filters,
  canUpload,
  onOpenUpload,
  onOpenActivity,
  onOpenReset,
  quickPreview,
  assets,
  clients,
  total,
  debouncedSearch,
  organizationId
}: Props) {
  const { state, setSort, setOcrOnly } = filters;
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch (err) {
      console.warn("Failed to copy link:", err);
    }
  };

  const currentSavedFilters = {
    _v: 1 as const,
    search: debouncedSearch.trim(),
    assetTypes: state.assetTypes as AssetType[],
    clientId: state.clientId,
    tags: state.tags,
    tagsMode: state.tagsMode,
    includeArchived: state.includeArchived,
    sort: state.sort as SortValue,
  };

  return (
    <header className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderArchive className="w-6 h-6" />
          Biblioteca de Assets
        </h1>
        <p className="text-sm text-muted-foreground">
          Logos, artes, fotos e mockups da organização
        </p>
      </div>
      <div className="flex items-center gap-2">
        {state.sort !== "created_desc" && state.sort !== "relevance" && (
          <Badge
            variant="outline"
            className="gap-1 pr-1 border-dashed cursor-pointer hover:bg-muted/40 transition"
            onClick={() => setSort("created_desc")}
            role="button"
          >
            <span className="text-xs">
              Ordenação: {SORT_OPTIONS.find((o) => o.value === state.sort)?.label ?? state.sort}
            </span>
          </Badge>
        )}
        <SavedSearchesMenu currentFilters={currentSavedFilters} onApply={(snap) => {
          filters.setSearch(snap.search ?? "");
          filters.setAssetTypes(snap.assetTypes ?? []);
          filters.setClientId((snap.clientId as string) ?? "all");
          filters.setTags(snap.tags ?? []);
          filters.setTagsMode(snap.tagsMode ?? "all");
          filters.setIncludeArchived(Boolean(snap.includeArchived));
          filters.setSort((snap.sort as SortValue) ?? "created_desc");
        }} />
        <Button variant="outline" size="sm" onClick={handleCopyLink} data-testid="dam-copy-link">
          <Link2 className="w-4 h-4 mr-2" />
          {copiedLink ? "Copiado!" : "Compartilhar"}
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenActivity}>
          <History className="w-4 h-4 mr-2" />
          Atividade
        </Button>
        <LibraryExportMenu
          assets={assets}
          clients={clients}
          total={total}
          organizationId={organizationId}
          filters={state}
          filtersSummary={currentSavedFilters}
        />
        <Toggle
          pressed={quickPreview.enabled}
          onPressedChange={quickPreview.toggleEnabled}
          size="sm"
          variant="outline"
        >
          <PanelRight className="w-4 h-4 mr-2" />
          Prévia
        </Toggle>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={state.ocrOnly}
              onPressedChange={setOcrOnly}
              size="sm"
              variant="outline"
              disabled={debouncedSearch.trim().length < MIN_SEARCH_LENGTH}
            >
              <ScanText className="w-4 h-4 mr-2" />
              Só OCR
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            Mostrar apenas resultados encontrados pelo texto interno (OCR)
          </TooltipContent>
        </Tooltip>
        {canUpload && (
          <Button onClick={onOpenUpload}>
            <Plus className="w-4 h-4 mr-2" /> Novo asset
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={onOpenReset} data-testid="dam-reset-preferences">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
