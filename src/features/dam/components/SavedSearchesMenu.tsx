import { useMemo, useState } from "react";
import { Bookmark, Pin, PinOff, Pencil, Trash2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useOrganizations } from "@/hooks/use-organization";
import { useAuth } from "@/hooks/use-auth";
import {
  useSavedSearches,
  type SavedFiltersPayload,
  type SavedSearch,
  PINNED_LIMIT,
  SAVED_SEARCH_LIMIT,
} from "../hooks/use-saved-searches";

interface Props {
  currentFilters: SavedFiltersPayload;
  onApply: (filters: SavedFiltersPayload) => void;
}

const FIELD_LABELS: Record<string, string> = {
  search: "Busca",
  clientId: "Cliente",
  assetTypes: "Tipos",
  tags: "Tags",
  tagsMode: "Modo (E/OU)",
  includeArchived: "Arquivados",
  sort: "Ordenação",
};

function diffFilters(a: SavedFiltersPayload, b: SavedFiltersPayload): string[] {
  const diffs: string[] = [];
  if (a.search.trim() !== b.search.trim()) diffs.push("search");
  if (a.clientId !== b.clientId) diffs.push("clientId");
  if (
    a.assetTypes.length !== b.assetTypes.length ||
    !a.assetTypes.every((t) => b.assetTypes.includes(t))
  )
    diffs.push("assetTypes");
  const tagsDiffer =
    a.tags.length !== b.tags.length || !a.tags.every((t) => b.tags.includes(t));
  if (tagsDiffer) diffs.push("tags");
  // tagsMode só conta como diff se ambos têm 2+ tags (caso contrário é irrelevante)
  if (
    a.tagsMode !== b.tagsMode &&
    a.tags.length > 1 &&
    b.tags.length > 1
  )
    diffs.push("tagsMode");
  if (a.includeArchived !== b.includeArchived) diffs.push("includeArchived");
  if (a.sort !== b.sort) diffs.push("sort");
  return diffs;
}

export function SavedSearchesMenu({ currentFilters, onApply }: Props) {
  const { currentOrgId } = useOrganizations();
  const { user } = useAuth();
  const { toast } = useToast();
  const { items, isLoading, create, update, remove } = useSavedSearches(
    currentOrgId,
    user?.id ?? null,
  );

  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const matches = useMemo(
    () =>
      items.map((s) => {
        const diffs = diffFilters(s.filters, currentFilters);
        return { id: s.id, diffs, exact: diffs.length === 0 };
      }),
    [items, currentFilters],
  );
  const matchById = useMemo(
    () => new Map(matches.map((m) => [m.id, m])),
    [matches],
  );
  const activeId = matches.find((m) => m.exact)?.id ?? null;
  // Best partial match: smallest diff count (>0), preferring fewer changes
  const partialMatch = useMemo(() => {
    if (activeId) return null;
    const partials = matches
      .filter((m) => m.diffs.length > 0 && m.diffs.length <= 2)
      .sort((a, b) => a.diffs.length - b.diffs.length);
    return partials[0] ?? null;
  }, [matches, activeId]);

  const pinnedCount = items.filter((s) => s.is_pinned).length;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast({ title: "Nome muito curto", description: "Use pelo menos 2 caracteres.", variant: "destructive" });
      return;
    }
    if (items.length >= SAVED_SEARCH_LIMIT) {
      toast({ title: "Limite atingido", description: `Máximo de ${SAVED_SEARCH_LIMIT} filtros salvos.`, variant: "destructive" });
      return;
    }
    if (items.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Nome duplicado", description: "Já existe um filtro com esse nome.", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({ name: trimmed, filters: currentFilters });
      toast({ title: "Filtros salvos", description: `"${trimmed}" foi adicionado.` });
      setName("");
      setSaveOpen(false);
    } catch (e) {
      toast({ title: "Erro ao salvar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed.length < 2) return;
    if (items.some((s) => s.id !== id && s.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Nome duplicado", variant: "destructive" });
      return;
    }
    try {
      await update.mutateAsync({ id, patch: { name: trimmed } });
      toast({ title: "Renomeado" });
      setRenameId(null);
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleTogglePin = async (s: SavedSearch) => {
    if (!s.is_pinned && pinnedCount >= PINNED_LIMIT) {
      toast({
        title: "Limite de fixados",
        description: `Máximo de ${PINNED_LIMIT} filtros fixados.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await update.mutateAsync({ id: s.id, patch: { is_pinned: !s.is_pinned } });
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: "Excluído" });
      setConfirmDeleteId(null);
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };

  const sorted = useMemo(() => {
    const pinned = items.filter((s) => s.is_pinned);
    const recent = items.filter((s) => !s.is_pinned);
    return [...pinned, ...recent];
  }, [items]);

  return (
    <>
      <TooltipProvider delayDuration={150}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="default" aria-label="Filtros salvos">
            <Bookmark className="w-4 h-4 mr-2" />
            Filtros salvos
            {activeId && (
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                Ativo
              </Badge>
            )}
            {!activeId && partialMatch && (
              <Badge
                variant="outline"
                className="ml-2 text-[10px] px-1.5 py-0 border-warning/40 text-warning"
                title={`Quase: ${partialMatch.diffs.length} diferença(s)`}
              >
                ~{partialMatch.diffs.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Filtros salvos</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setSaveOpen(true)} className="cursor-pointer">
            <Plus className="w-4 h-4 mr-2" />
            Salvar filtros atuais…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isLoading && (
            <div className="px-2 py-3 text-xs text-muted-foreground">Carregando…</div>
          )}
          {!isLoading && sorted.length === 0 && (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              Nenhum filtro salvo ainda.
            </div>
          )}
          {sorted.map((s) => {
            const match = matchById.get(s.id);
            const isActive = s.id === activeId;
            const diffs = match?.diffs ?? [];
            const isPartial = !isActive && diffs.length > 0 && diffs.length <= 2;
            const isRenaming = renameId === s.id;
            const isConfirmingDelete = confirmDeleteId === s.id;
            return (
              <div key={s.id} className="px-1 py-0.5">
                {isRenaming ? (
                  <div className="flex items-center gap-1 px-1 py-1">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(s.id);
                        if (e.key === "Escape") setRenameId(null);
                      }}
                      className="h-7 text-xs"
                      autoFocus
                      maxLength={80}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(s.id)} aria-label="Confirmar">
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : isConfirmingDelete ? (
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                    <span>Excluir "{s.name}"?</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="destructive" className="h-6 px-2 text-[11px]" onClick={() => handleDelete(s.id)}>
                        Sim
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setConfirmDeleteId(null)}>
                        Não
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group">
                    <button
                      type="button"
                      onClick={() => onApply(s.filters)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left min-w-0"
                    >
                      {s.is_pinned && <Pin className="w-3 h-3 text-muted-foreground shrink-0" />}
                      <span className="truncate flex-1">{s.name}</span>
                      {isActive && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
                          Ativo
                        </Badge>
                      )}
                      {isPartial && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 shrink-0 border-warning/40 text-warning"
                              aria-label={`${diffs.length} diferença(s)`}
                            >
                              ~{diffs.length}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            Difere em:{" "}
                            {diffs.map((d) => FIELD_LABELS[d] ?? d).join(", ")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </button>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleTogglePin(s)}
                        aria-label={s.is_pinned ? "Desafixar" : "Fixar"}
                        title={s.is_pinned ? "Desafixar" : "Fixar"}
                      >
                        {s.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setRenameId(s.id);
                          setRenameValue(s.name);
                        }}
                        aria-label="Renomear"
                        title="Renomear"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setConfirmDeleteId(s.id)}
                        aria-label="Excluir"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      </TooltipProvider>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar filtros atuais</DialogTitle>
            <DialogDescription>
              Dê um nome curto para reaplicar essa combinação de filtros depois.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Ex.: Logos do cliente Acme"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            maxLength={80}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={create.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}