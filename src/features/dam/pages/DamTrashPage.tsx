import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, ArchiveRestore, Loader2 } from "lucide-react";
import { useOrganizations } from "@/hooks/use-organization";
import { useDebounce } from "@/hooks/use-debounce";
import { useAssets, MIN_SEARCH_LENGTH, type Asset } from "../hooks/use-assets";
import { AssetCard } from "../components/AssetCard";
import { AssetGridSkeleton } from "../components/AssetGridSkeleton";
import { AssetDetailDrawer } from "../components/AssetDetailDrawer";

const PAGE_SIZE = 24;

export default function DamTrashPage() {
  const { currentOrgId, can } = useOrganizations();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Asset | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { assets, total, totalPages, isLoading, isFetching, restoreMany, purgeMany } = useAssets(
    currentOrgId || "",
    {
      archivedOnly: true,
      includeArchived: true,
      search: debouncedSearch.trim() || undefined,
      page,
      pageSize: PAGE_SIZE,
    },
  );

  if (!currentOrgId)
    return (
      <div className="p-6 text-center">
        <Card className="p-8">Selecione uma organização</Card>
      </div>
    );

  const canDelete = can(["owner", "admin", "designer"]);
  const allSelected = assets.length > 0 && assets.every((a) => selectedIds.has(a.id));
  const hasSelection = selectedIds.size > 0;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(assets.map((a) => a.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestoreSelected = async () => {
    try {
      await restoreMany.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} asset(s) restaurado(s)`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Falha ao restaurar. Tente novamente.");
    }
  };

  const handlePurgeSelected = async () => {
    const count = selectedIds.size;
    const confirmed = window.confirm(
      `Excluir definitivamente ${count} asset(s)? Os arquivos serão removidos do storage. Isso não pode ser desfeito.`,
    );
    if (!confirmed) return;

    try {
      const purged = await purgeMany.mutateAsync(Array.from(selectedIds));
      toast.success(`${purged} asset(s) excluído(s) definitivamente`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Falha ao excluir definitivamente. Tente novamente.");
    }
  };

  const searchDetails =
    debouncedSearch.trim().length >= MIN_SEARCH_LENGTH ? debouncedSearch.trim() : undefined;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="w-6 h-6" />
            Lixeira de Assets
          </h1>
          <p className="text-sm text-muted-foreground">
            Assets arquivados aguardando restauração ou exclusão definitiva
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{total} arquivado(s)</Badge>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasSelection}
            onClick={() => setSelectedIds(new Set())}
          >
            Limpar seleção ({selectedIds.size})
          </Button>
          <Button
            size="sm"
            disabled={!hasSelection || !canDelete || restoreMany.isPending}
            onClick={handleRestoreSelected}
          >
            {restoreMany.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArchiveRestore className="w-4 h-4 mr-2" />
            )}
            Restaurar selecionados
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!hasSelection || !canDelete || purgeMany.isPending}
            onClick={handlePurgeSelected}
          >
            {purgeMany.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Excluir definitivamente
          </Button>
        </div>
      </header>

      <div className="flex-1 min-w-[240px] max-w-md">
        <Input
          placeholder="Buscar na lixeira..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading && !isFetching ? (
        <AssetGridSkeleton viewMode="grid" count={PAGE_SIZE} />
      ) : assets.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          {searchDetails
            ? "Nenhum asset arquivado corresponde à busca"
            : "A lixeira está vazia"}
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Selecionar todos os arquivados da página"
            />
            <span>Selecionar página ({assets.length})</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {assets.map((a) => (
              <div key={a.id} className="relative group">
                {canDelete && (
                  <Checkbox
                    checked={selectedIds.has(a.id)}
                    onCheckedChange={() => toggleOne(a.id)}
                    aria-label={`Selecionar ${a.name}`}
                    className="absolute top-2 left-2 z-10 bg-background/80"
                  />
                )}
                <AssetCard asset={a} onClick={() => setDetail(a)} />
              </div>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-6">
          <Button
            variant="outline"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {detail && (
        <AssetDetailDrawer
          asset={detail}
          onClose={() => setDetail(null)}
          searchQuery={searchDetails}
        />
      )}
    </div>
  );
}
