import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultsPagination } from "@/components/ResultsPagination";
import { LayoutGrid, List, Search, Image as ImageIcon, Check } from "lucide-react";
import { useAssets, MIN_SEARCH_LENGTH, type Asset, type AssetType } from "../hooks/use-assets";
import { AssetCard } from "./AssetCard";
import { AssetThumbnail } from "./AssetThumbnail";
import { TagFilter } from "./TagFilter";
import { useOrganizations } from "@/hooks/use-organization";
import { useClients } from "@/features/clients/hooks/use-clients";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

/**
 * AssetPicker — modal reutilizável para escolher um (ou vários) asset(s) do DAM.
 *
 * Props principais:
 * - `defaultClientId` pré-seleciona o filtro de cliente (não trava — use `lockClient` para isso).
 * - `clientId` (legado) mantido por compatibilidade; equivalente a `defaultClientId`.
 *   Se ambos forem passados, `defaultClientId` tem precedência.
 * - `lockClient` esconde o seletor de cliente (útil em telas com cliente fixo, ex. brand kit).
 * - `defaultAssetType` pré-filtra por tipo (logo/art/photo/...).
 * - `excludeAssetIds` esconde assets já vinculados (filtro client-side, sem round-trip).
 * - `multiSelect=false` (default): callback `onSelect(asset: Asset)` ao clicar — fecha modal.
 * - `multiSelect=true`: cards mostram checkbox; header exibe contador + botão "Confirmar" que emite `onSelect(assets: Asset[])`.
 *
 * Exemplo:
 * ```tsx
 * <AssetPicker
 *   open={open}
 *   onOpenChange={setOpen}
 *   defaultAssetType="logo"
 *   onSelect={(asset) => loadLogo(asset as Asset)}
 * />
 * ```
 */
type SingleSelectProps = {
  multiSelect?: false;
  onSelect: (asset: Asset) => void;
};
type MultiSelectProps = {
  multiSelect: true;
  onSelect: (assets: Asset[]) => void;
};

type CommonProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Pré-seleciona o filtro de cliente (editável pelo usuário, salvo se `lockClient`). */
  defaultClientId?: string | null;
  /** @deprecated Use `defaultClientId`. Mantido por compatibilidade. */
  clientId?: string | null;
  defaultAssetType?: AssetType;
  lockClient?: boolean;
  title?: string;
  excludeAssetIds?: string[];
};

export type AssetPickerProps = CommonProps & (SingleSelectProps | MultiSelectProps);

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

export function AssetPicker(props: AssetPickerProps) {
  const { open, onOpenChange, defaultClientId, clientId, defaultAssetType, lockClient, title, excludeAssetIds } = props;
  // `defaultClientId` é o nome canônico; `clientId` permanece como fallback (legado).
  const initialClientId = defaultClientId ?? clientId ?? "all";
  const multiSelect = props.multiSelect === true;

  // Validação dev-only: garante que `onSelect` casa com o modo selecionado.
  if (import.meta.env.DEV && typeof props.onSelect !== "function") {
    // eslint-disable-next-line no-console
    console.error(
      `[AssetPicker] prop \`onSelect\` deve ser uma função. ` +
        `Em multiSelect=${multiSelect ? "true" : "false"}, espera-se ` +
        `\`(${multiSelect ? "assets: Asset[]" : "asset: Asset"}) => void\`.`,
    );
  }

  const { currentOrgId } = useOrganizations();
  const { clients } = useClients(currentOrgId);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [assetType, setAssetType] = useState<AssetType | "all">(defaultAssetType ?? "all");
  const [activeClientId, setActiveClientId] = useState<string | "all">(initialClientId);
  const [tags, setTags] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMap, setSelectedMap] = useState<Map<string, Asset>>(new Map());

  // Reset on open / when default props change
  useEffect(() => {
    if (open) {
      setSearch("");
      setAssetType(defaultAssetType ?? "all");
      setActiveClientId(initialClientId);
      setTags([]);
      setPage(1);
      setSelectedIds(new Set());
      setSelectedMap(new Map());
    }
  }, [open, defaultAssetType, initialClientId]);

  useEffect(() => { setPage(1); }, [debouncedSearch, assetType, activeClientId, tags]);

  const { assets: rawAssets, total: rawTotal, totalPages, isLoading } = useAssets(currentOrgId, {
    clientId: activeClientId === "all" ? undefined : activeClientId,
    assetType,
    tags,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const excludeSet = useMemo(() => new Set(excludeAssetIds ?? []), [excludeAssetIds]);
  const assets = useMemo(
    () => (excludeSet.size === 0 ? rawAssets : rawAssets.filter((a) => !excludeSet.has(a.id))),
    [rawAssets, excludeSet],
  );
  const total = excludeSet.size === 0 ? rawTotal : Math.max(0, rawTotal - rawAssets.filter((a) => excludeSet.has(a.id)).length);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => a.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [assets]);

  const toggleSelected = (a: Asset) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(a.id)) next.delete(a.id);
      else next.add(a.id);
      return next;
    });
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(a.id)) next.delete(a.id);
      else next.set(a.id, a);
      return next;
    });
  };

  const handlePick = (a: Asset) => {
    if (multiSelect) {
      toggleSelected(a);
      return;
    }
    (props as SingleSelectProps).onSelect(a);
    onOpenChange(false);
  };

  const confirmMulti = () => {
    if (!multiSelect) return;
    (props as MultiSelectProps).onSelect(Array.from(selectedMap.values()));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>{title ?? "Selecionar da biblioteca"}</DialogTitle>
            {multiSelect && (
              <div className="flex items-center gap-2 mr-6">
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} selecionado{selectedIds.size === 1 ? "" : "s"}
                </span>
                <Button size="sm" disabled={selectedIds.size === 0} onClick={confirmMulti}>
                  Confirmar
                </Button>
              </div>
            )}
          </div>
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
            {search.trim().length > 0 && search.trim().length < MIN_SEARCH_LENGTH && (
              <p className="text-[11px] text-muted-foreground pt-0.5 pl-1">
                Digite ao menos {MIN_SEARCH_LENGTH} caracteres para buscar
              </p>
            )}
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
              {assets.map((a) => {
                const isSelected = selectedIds.has(a.id);
                return (
                  <div key={a.id} className="relative">
                    <AssetCard asset={a} onClick={() => handlePick(a)} />
                    {multiSelect && (
                      <div
                        className={cn(
                          "absolute top-2 right-2 w-6 h-6 rounded-md border-2 flex items-center justify-center pointer-events-none transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-background/80 border-border",
                        )}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {assets.map((a) => {
                const isSelected = selectedIds.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => handlePick(a)}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors",
                      isSelected && "bg-accent",
                    )}
                  >
                    <AssetThumbnail asset={a} className="w-12 h-12 rounded-md shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.asset_type} · v{a.version}{a.tags?.length ? ` · ${a.tags.join(", ")}` : ""}
                      </p>
                    </div>
                    {multiSelect && (
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with counter + pagination */}
        <div className="pt-2 border-t border-border">
          <ResultsPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            itemNoun="asset"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
