import { useMemo, useState } from "react";
import { Bookmark, BookmarkPlus, Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useAuditSavedViews,
  useCreateAuditSavedView,
  useDeleteAuditSavedView,
  type AuditSavedView,
  type AuditSavedViewFilters,
} from "../hooks/use-audit-views";
import type { AuditFilterState } from "./AuditFilters";

const MAX_VIEWS = 50;

function toFiltersPayload(
  s: AuditFilterState,
  page: number,
  pageSize: number,
): AuditSavedViewFilters {
  return {
    from: s.from?.toISOString(),
    to: s.to?.toISOString(),
    actions: s.actions.length ? s.actions : undefined,
    tableName: s.tableName,
    userId: s.userId,
    recordIdQuery: s.recordIdQuery || undefined,
    valueKey: s.valueKey || undefined,
    valueQuery: s.valueQuery || undefined,
    ipQuery: s.ipQuery || undefined,
    userAgentQuery: s.userAgentQuery || undefined,
    page: page > 0 ? page : undefined,
    pageSize: pageSize,
  };
}

function fromFiltersPayload(f: AuditSavedViewFilters): AuditFilterState {
  const parseDate = (s?: string) => {
    if (!s) return undefined;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  return {
    from: parseDate(f.from),
    to: parseDate(f.to),
    actions: (f.actions ?? []).filter(
      (a): a is "INSERT" | "UPDATE" | "DELETE" =>
        a === "INSERT" || a === "UPDATE" || a === "DELETE",
    ),
    tableName: f.tableName,
    userId: f.userId,
    recordIdQuery: f.recordIdQuery ?? "",
    valueKey: f.valueKey ?? "",
    valueQuery: f.valueQuery ?? "",
    ipQuery: f.ipQuery ?? "",
    userAgentQuery: f.userAgentQuery ?? "",
  };
}

function filtersEqual(a: AuditSavedViewFilters, b: AuditSavedViewFilters): boolean {
  // Compare only filter shape (ignore page/pageSize) so the active-view
  // indicator stays stable while the user paginates.
  const strip = ({ page: _p, pageSize: _ps, ...rest }: AuditSavedViewFilters) => rest;
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

function hasActiveFilters(s: AuditFilterState): boolean {
  return (
    !!s.from ||
    !!s.to ||
    s.actions.length > 0 ||
    !!s.tableName ||
    !!s.userId ||
    s.recordIdQuery.length > 0 ||
    s.valueKey.length > 0 ||
    s.valueQuery.length > 0 ||
    s.ipQuery.length > 0 ||
    s.userAgentQuery.length > 0
  );
}

interface Props {
  organizationId: string;
  currentFilters: AuditFilterState;
  currentPage: number;
  currentPageSize: number;
  onApply: (s: AuditFilterState, opts?: { page?: number; pageSize?: number }) => void;
}

export function AuditSavedViewsMenu({
  organizationId,
  currentFilters,
  currentPage,
  currentPageSize,
  onApply,
}: Props) {
  const { toast } = useToast();
  const { data: views = [], isLoading } = useAuditSavedViews(organizationId);
  const create = useCreateAuditSavedView();
  const remove = useDeleteAuditSavedView();

  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");

  const currentPayload = useMemo(
    () => toFiltersPayload(currentFilters, currentPage, currentPageSize),
    [currentFilters, currentPage, currentPageSize],
  );
  const activeView = useMemo(
    () => views.find((v) => filtersEqual(v.filters ?? {}, currentPayload)),
    [views, currentPayload],
  );

  const canSave = hasActiveFilters(currentFilters);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Dê um nome para a vista", variant: "destructive" });
      return;
    }
    if (views.length >= MAX_VIEWS) {
      toast({
        title: "Limite atingido",
        description: `Você já tem ${MAX_VIEWS} vistas salvas.`,
        variant: "destructive",
      });
      return;
    }
    if (views.some((v) => v.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Já existe uma vista com esse nome", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        organization_id: organizationId,
        name: trimmed,
        filters: currentPayload,
      });
      toast({ title: "Vista salva", description: trimmed });
      setName("");
      setSaveOpen(false);
    } catch (err) {
      toast({
        title: "Erro ao salvar vista",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (v: AuditSavedView, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await remove.mutateAsync(v.id);
      toast({ title: "Vista removida", description: v.name });
    } catch (err) {
      toast({
        title: "Erro ao remover",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" data-testid="audit-views-button">
            <Bookmark className="h-4 w-4" />
            {activeView ? activeView.name : "Vistas"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Vistas salvas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setSaveOpen(true);
            }}
            disabled={!canSave}
            data-testid="audit-views-save-current"
          >
            <BookmarkPlus className="h-4 w-4" />
            Salvar filtros atuais…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isLoading ? (
            <div className="py-3 text-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            </div>
          ) : views.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground text-center">
              Nenhuma vista salva ainda.
            </div>
          ) : (
            views.map((v) => {
              const isActive = activeView?.id === v.id;
              return (
                <DropdownMenuItem
                  key={v.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    const f = v.filters ?? {};
                    onApply(fromFiltersPayload(f), {
                      page: typeof f.page === "number" ? f.page : 0,
                      pageSize: typeof f.pageSize === "number" ? f.pageSize : undefined,
                    });
                  }}
                  data-testid={`audit-view-${v.id}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {isActive ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <span className="w-3.5" />
                    )}
                    <span className="truncate">{v.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(v, e)}
                    className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remover vista ${v.name}`}
                    data-testid={`audit-view-delete-${v.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-sm" data-testid="audit-views-save-dialog">
          <DialogHeader>
            <DialogTitle>Salvar vista</DialogTitle>
            <DialogDescription>
              Reaplique os filtros atuais a qualquer momento com um clique.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="audit-view-name">Nome</Label>
            <Input
              id="audit-view-name"
              data-testid="audit-views-save-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !create.isPending) handleSave();
              }}
              placeholder="Ex.: DELETEs em service_orders"
              maxLength={120}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)} disabled={create.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={create.isPending}
              data-testid="audit-views-save-submit"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}