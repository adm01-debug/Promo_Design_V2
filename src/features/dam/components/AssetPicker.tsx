import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { LayoutGrid, List, Search, Image as ImageIcon } from "lucide-react";
import { useAssets, type Asset, type AssetType } from "../hooks/use-assets";
import { AssetCard } from "./AssetCard";
import { AssetThumbnail } from "./AssetThumbnail";
import { TagFilter } from "./TagFilter";
import { useOrganizations } from "@/hooks/use-organization";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useDebounce } from "@/hooks/use-debounce";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId?: string | null;
  defaultAssetType?: AssetType;
  lockClient?: boolean;
  title?: string;
  onSelect: (asset: Asset) => void;
}

const TYPE_OPTIONS: { value: AssetType | "all"; label: string }[] = [
  { value: "all", label: "Todos os tipos" },
  { value: "logo", label: "Logo" },
  { value: "art", label: "Arte" },
  { value: "photo", label: "Foto" },
  { value: "mockup", label: "Mockup" },
  { value: "document", label: "Documento" },
  { value: "other", label: "Outro" },
];

const PAGE_SIZE = 24;

export function AssetPicker({ open, onOpenChange, clientId, defaultAssetType, lockClient, title, onSelect }: Props) {
  const { currentOrgId } = useOrganizations();
  const { clients } = useClients(currentOrgId);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [assetType, setAssetType] = useState<AssetType | "all">(defaultAssetType ?? "all");
  const [activeClientId, setActiveClientId] = useState<string | "all">(clientId ?? "all");
  const [tags, setTags] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  // Reset on open / when default props change
  useEffect(() => {
    if (open) {
      setSearch("");
      setAssetType(defaultAssetType ?? "all");
      setActiveClientId(clientId ?? "all");
      setTags([]);
      setPage(1);
    }
  }, [open, defaultAssetType, clientId]);

  useEffect(() => { setPage(1); }, [debouncedSearch, assetType, activeClientId, tags]);

  const { assets, total, totalPages, isLoading } = useAssets(currentOrgId, {
    clientId: activeClientId === "all" ? undefined : activeClientId,
    assetType,
    tags,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => a.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [assets]);

  const handlePick = (a: Asset) => {
    onSelect(a);
    onOpenChange(false);
  };

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{title ?? "Selecionar da biblioteca"}</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType | "all")}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {!lockClient && (
            <Select value={activeClientId} onValueChange={setActiveClientId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button variant={view === "grid" ? "secondary" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setView("grid")}><LayoutGrid className="w-4 h-4" /></Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" className="rounded-none h-9" onClick={() => setView("list")}><List className="w-4 h-4" /></Button>
          </div>
        </div>

        {availableTags.length > 0 && (
          <TagFilter availableTags={availableTags} selected={tags} onChange={setTags} />
        )}

        {/* Results */}
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">Nenhum asset encontrado</p>
              <p className="text-xs mt-1">Tente ajustar os filtros ou a busca</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {assets.map((a) => (
                <AssetCard key={a.id} asset={a} onClick={() => handlePick(a)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {assets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handlePick(a)}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                >
                  <AssetThumbnail asset={a} className="w-12 h-12 rounded-md shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {a.asset_type} · v{a.version}{a.tags?.length ? ` · ${a.tags.join(", ")}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer with counter + pagination */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {total === 0 ? "Nenhum resultado" : `Mostrando ${from}–${to} de ${total}`}
          </p>
          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                    aria-disabled={page === 1}
                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>{page}</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }}
                    aria-disabled={page === totalPages}
                    className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
