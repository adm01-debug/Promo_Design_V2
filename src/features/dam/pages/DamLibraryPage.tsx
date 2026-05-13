import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";
import { Archive, ArchiveRestore, LayoutGrid, List, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/use-organization";
import { useClients } from "@/features/clients/hooks/use-clients";
import { MIN_SEARCH_LENGTH, type Asset, type AssetType } from "../hooks/use-assets";
import { AssetCard } from "../components/AssetCard";
import { AssetUploadDialog } from "../components/AssetUploadDialog";
import { AssetDetailDrawer } from "../components/AssetDetailDrawer";
import { TagFilter } from "../components/TagFilter";
import { AssetListView } from "../components/AssetListView";
import { ActiveFiltersBar } from "../components/ActiveFiltersBar";
import { QuickPreviewPanel } from "../components/QuickPreviewPanel";
import { useQuickPreview } from "../hooks/use-quick-preview";
import { useDebounce } from "@/hooks/use-debounce";
import { ResultsPagination } from "@/components/ResultsPagination";
import { LibraryActivityDialog } from "../components/LibraryActivityDialog";
import { BatchOcrDialog } from "../components/BatchOcrDialog";
import { AssetGridSkeleton } from "../components/AssetGridSkeleton";
import { useDamFilters } from "../hooks/use-dam-filters";
import { useDamLibraryResults } from "../hooks/use-dam-library-results";
import { DamLibraryHeader } from "../components/DamLibraryHeader";
import { TYPES, SORT_OPTIONS } from "../lib/dam-constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DamLibraryPage() {
  const { currentOrgId, can } = useOrganizations();
  const { clients } = useClients(currentOrgId);
  const filters = useDamFilters();
  const { 
    state, setSearch, setAssetTypes, setClientId, setTags, setTagsMode, 
    setIncludeArchived, setPage, setViewMode, reset: resetFilters 
  } = filters;
  const { 
    search, assetTypes, clientId, tags, tagsMode, includeArchived, 
    sort, page, pageSize, paginationMode, viewMode, showSizeColumn 
  } = state;

  const [activityOpen, setActivityOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const results = useDamLibraryResults(currentOrgId || "", state, debouncedSearch);
  const { assets, total, totalPages, isLoading, isFetching, isPaginating, restore, displayedAssets, hasMore } = results;

  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [batchOcrOpen, setBatchOcrOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const quickPreview = useQuickPreview();

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    displayedAssets.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [displayedAssets]);

  const handleRestore = async (asset: Asset) => {
    try {
      await restore.mutateAsync(asset.id);
      toast.success(`"${asset.name}" restaurado`);
    } catch (e) {
      toast.error("Falha ao restaurar");
    }
  };

  if (!currentOrgId) return <div className="p-6 text-center"><Card className="p-8">Selecione uma organização</Card></div>;

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label;

  return (
    <div className="p-6 space-y-6">
      <DamLibraryHeader
        filters={filters}
        canUpload={can(["owner", "admin", "designer"])}
        onOpenUpload={() => setUploadOpen(true)}
        onOpenActivity={() => setActivityOpen(true)}
        onOpenBatchOcr={() => setBatchOcrOpen(true)}
        onOpenReset={() => setResetOpen(true)}
        quickPreview={quickPreview}
        assets={assets}
        clients={clients}
        total={total}
        ocrFilteredOut={0}
        debouncedSearch={debouncedSearch}
        organizationId={currentOrgId}
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px]">
          <Input placeholder="Buscar por nome ou conteúdo..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Toggle pressed={includeArchived} onPressedChange={setIncludeArchived} size="sm" variant="outline">
            {includeArchived ? <ArchiveRestore className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
            Arquivados
          </Toggle>
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as "grid" | "list")} size="sm">
            <ToggleGroupItem value="grid"><LayoutGrid className="w-4 h-4" /></ToggleGroupItem>
            <ToggleGroupItem value="list"><List className="w-4 h-4" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => {
          const active = t.value === "all" ? assetTypes.length === 0 : assetTypes.includes(t.value as AssetType);
          return (
            <Badge key={t.value} variant={active ? "default" : "outline"} className="cursor-pointer" onClick={() => setAssetTypes(t.value === "all" ? [] : (assetTypes.includes(t.value as AssetType) ? assetTypes.filter(x => x !== t.value) : [...assetTypes, t.value as AssetType]))}>
              {t.label}
            </Badge>
          );
        })}
      </div>

      {availableTags.length > 0 && <TagFilter availableTags={availableTags} selected={tags} onChange={setTags} mode={tagsMode} onModeChange={setTagsMode} />}

      <ActiveFiltersBar
        search={debouncedSearch.trim().length >= MIN_SEARCH_LENGTH ? debouncedSearch.trim() : undefined}
        onClearSearch={() => setSearch("")}
        assetTypes={assetTypes}
        onRemoveType={(t) => setAssetTypes(assetTypes.filter(x => x !== t))}
        clientId={clientId}
        clientLabel={clients.find(c => c.id === clientId)?.name}
        onClearClient={() => setClientId("all")}
        tags={tags}
        tagsMode={tagsMode}
        onRemoveTag={(t) => setTags(tags.filter(x => x !== t))}
        includeArchived={includeArchived}
        onClearArchived={() => setIncludeArchived(false)}
        onClearAll={resetFilters}
      />

      {(isLoading && displayedAssets.length === 0) || isPaginating ? (
        <AssetGridSkeleton viewMode={viewMode} count={pageSize} />
      ) : displayedAssets.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhum asset encontrado</Card>
      ) : (
        <div className={quickPreview.enabled ? "flex gap-4 items-start" : undefined}>
          <div className="flex-1 min-w-0 relative">
            {isFetching && !isLoading && !isPaginating && (
              <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            {viewMode === "list" ? (
              <AssetListView assets={displayedAssets} clients={clients} onSelect={setSelected} onRestore={can(["owner", "admin", "designer"]) ? handleRestore : undefined} showSize={showSizeColumn} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayedAssets.map((a) => <AssetCard key={a.id} asset={a} onClick={() => setSelected(a)} />)}
              </div>
            )}
          </div>
          {quickPreview.enabled && (
            <QuickPreviewPanel 
              asset={quickPreview.activeAsset} 
              pinned={Boolean(quickPreview.activeAsset && quickPreview.pinnedId === quickPreview.activeAsset.id)}
              onTogglePin={() => quickPreview.activeAsset && quickPreview.togglePin(quickPreview.activeAsset)}
              onOpenDetails={() => quickPreview.activeAsset && setSelected(quickPreview.activeAsset)}
              clients={clients}
              sortLabel={sortLabel}
            />
          )}
        </div>
      )}

      {paginationMode === "pages" && totalPages > 1 && (
        <div className="flex justify-center pt-6">
          <ResultsPagination 
            page={page} 
            pageSize={pageSize}
            total={total}
            totalPages={totalPages} 
            onPageChange={setPage} 
          />
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={isFetching}>
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
            Carregar mais
          </Button>
        </div>
      )}

      <AssetUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} organizationId={currentOrgId} />
      {selected && <AssetDetailDrawer asset={selected} onClose={() => setSelected(null)} searchQuery={debouncedSearch} />}
      <LibraryActivityDialog open={activityOpen} onOpenChange={setActivityOpen} organizationId={currentOrgId} />
      <BatchOcrDialog open={batchOcrOpen} onOpenChange={setBatchOcrOpen} assets={assets} />

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir preferências?</AlertDialogTitle>
            <AlertDialogDescription>Isso limpará todos os filtros e voltará a biblioteca ao estado inicial.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { resetFilters(); setResetOpen(false); }}>Redefinir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

