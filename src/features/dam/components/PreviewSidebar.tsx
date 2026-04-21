import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TagFilter } from "./TagFilter";
import { SORT_OPTIONS, type UseDamFiltersReturn } from "../hooks/use-dam-filters";
import { MIN_SEARCH_LENGTH, type Asset, type AssetType } from "../hooks/use-assets";

interface Client {
  id: string;
  name: string;
}

const TYPES: { value: AssetType; label: string }[] = [
  { value: "logo", label: "Logos" },
  { value: "art", label: "Artes" },
  { value: "photo", label: "Fotos" },
  { value: "mockup", label: "Mockups" },
  { value: "document", label: "Documentos" },
  { value: "other", label: "Outros" },
];

interface Props {
  filters: UseDamFiltersReturn;
  clients: Client[];
  assets: Asset[];
  total: number;
  isLoading: boolean;
}

export function PreviewSidebar({ filters, clients, assets, total, isLoading }: Props) {
  const { state, setSearch, setAssetTypes, setClientId, setTags, setTagsMode, setIncludeArchived, setSort, reset } = filters;

  const availableTags = Array.from(new Set(assets.flatMap((a) => a.tags))).sort();

  return (
    <aside className="w-72 shrink-0 border-r border-border bg-card/40 flex flex-col">
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Buscar</Label>
          <Input
            placeholder="Nome, descrição, tag..."
            value={state.search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
          {state.search.trim().length > 0 && state.search.trim().length < MIN_SEARCH_LENGTH && (
            <p className="text-[11px] text-muted-foreground pt-0.5">
              Digite ao menos {MIN_SEARCH_LENGTH} caracteres para buscar
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => {
              const active = state.assetTypes.includes(t.value);
              return (
                <Badge
                  key={t.value}
                  variant={active ? "default" : "outline"}
                  role="button"
                  aria-pressed={active}
                  className="cursor-pointer select-none text-xs"
                  onClick={() =>
                    setAssetTypes((prev) =>
                      prev.includes(t.value) ? prev.filter((x) => x !== t.value) : [...prev, t.value],
                    )
                  }
                >
                  {t.label}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cliente</Label>
          <Select value={state.clientId} onValueChange={(v) => setClientId(v as typeof state.clientId)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              <SelectItem value="none">Sem cliente</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ordenação</Label>
          <Select value={state.sort} onValueChange={(v) => setSort(v as typeof state.sort)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.filter(
                (o) => o.value !== "relevance" || state.search.trim().length >= MIN_SEARCH_LENGTH,
              ).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {availableTags.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <TagFilter
              availableTags={availableTags}
              selected={state.tags}
              onChange={setTags}
              mode={state.tagsMode}
              onModeChange={setTagsMode}
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Switch
            id="preview-archived"
            checked={state.includeArchived}
            onCheckedChange={setIncludeArchived}
          />
          <Label htmlFor="preview-archived" className="text-xs cursor-pointer">
            Incluir arquivados
          </Label>
        </div>
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>
            {isLoading ? "Carregando..." : `${total} ${total === 1 ? "asset" : "assets"}`}
          </span>
          {state.sort === "relevance" && state.search.trim().length >= MIN_SEARCH_LENGTH && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
              por relevância
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={reset}>
          Limpar filtros
        </Button>
      </div>
    </aside>
  );
}