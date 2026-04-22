import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ScrollText,
  Download,
  Eye,
  Copy,
  ExternalLink,
  Bell,
  Keyboard,
  Loader2,
  SearchX,
  Inbox,
  RotateCcw,
} from "lucide-react";
import { useOrganizations, useOrgMembers } from "@/hooks/use-organization";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  type AuditAction,
  type AuditEntry,
  fetchAuditExport,
  useAuditDistinctTables,
  useAuditLog,
} from "../hooks/use-audit-log";
import { AuditFilters, type AuditFilterState } from "../components/AuditFilters";
import { AuditDiffDialog } from "../components/AuditDiffDialog";
import { AuditAlertsManager } from "../components/AuditAlertsManager";
import { AuditSavedViewsMenu } from "../components/AuditSavedViewsMenu";
import { AuditTableSkeleton } from "../components/AuditTableSkeleton";
import { buildAuditCsv, downloadCsv } from "../lib/audit-csv";
import { ResultsPagination } from "@/components/ResultsPagination";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_KEY = "audit-page-size";
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const LS_KEY = "audit-filters-v1";

const ACTION_VARIANT: Record<AuditAction, "default" | "secondary" | "destructive"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

function parseActions(s: string | null): AuditAction[] {
  if (!s) return [];
  return s.split(",").filter((x): x is AuditAction => x === "INSERT" || x === "UPDATE" || x === "DELETE");
}

function parseDate(s: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

interface PersistedFilters {
  from?: string;
  to?: string;
  action?: string;
  table?: string;
  user?: string;
  q?: string;
  vk?: string;
  vq?: string;
  ip?: string;
  ua?: string;
}

function readPersisted(): PersistedFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PersistedFilters) : null;
  } catch {
    return null;
  }
}

function writePersisted(p: PersistedFilters) {
  if (typeof window === "undefined") return;
  try {
    const hasAny = Object.values(p).some((v) => v && v.length > 0);
    if (hasAny) window.localStorage.setItem(LS_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(LS_KEY);
  } catch {
    /* noop */
  }
}

const AuditLogPage = () => {
  const { currentOrgId } = useOrganizations();
  const { user } = useAuth();
  const { members } = useOrgMembers(currentOrgId);
  const { data: tables = [] } = useAuditDistinctTables(currentOrgId);
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
    const stored = Number(localStorage.getItem(PAGE_SIZE_KEY));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  });
  useEffect(() => {
    try { localStorage.setItem(PAGE_SIZE_KEY, String(pageSize)); } catch { /* ignore */ }
    setPage(0);
  }, [pageSize]);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  // Hidrata da URL ou, se URL vazia, do localStorage (uma única vez na montagem).
  useEffect(() => {
    const hasAnyParam = Array.from(params.keys()).length > 0;
    if (hasAnyParam) return;
    const persisted = readPersisted();
    if (!persisted) return;
    const next = new URLSearchParams();
    if (persisted.from) next.set("from", persisted.from);
    if (persisted.to) next.set("to", persisted.to);
    if (persisted.action) next.set("action", persisted.action);
    if (persisted.table) next.set("table", persisted.table);
    if (persisted.user) next.set("user", persisted.user);
    if (persisted.q) next.set("q", persisted.q);
    if (persisted.vk) next.set("vk", persisted.vk);
    if (persisted.vq) next.set("vq", persisted.vq);
    if (persisted.ip) next.set("ip", persisted.ip);
    if (persisted.ua) next.set("ua", persisted.ua);
    if (Array.from(next.keys()).length > 0) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize from querystring (once per param change)
  const filterState: AuditFilterState = useMemo(
    () => ({
      from: parseDate(params.get("from")),
      to: parseDate(params.get("to")),
      actions: parseActions(params.get("action")),
      tableName: params.get("table") ?? undefined,
      userId: params.get("user") ?? undefined,
      recordIdQuery: params.get("q") ?? "",
      valueKey: params.get("vk") ?? "",
      valueQuery: params.get("vq") ?? "",
      ipQuery: params.get("ip") ?? "",
      userAgentQuery: params.get("ua") ?? "",
    }),
    [params],
  );

  const setFilters = (s: AuditFilterState) => {
    const next = new URLSearchParams();
    if (s.from) next.set("from", s.from.toISOString());
    if (s.to) next.set("to", s.to.toISOString());
    if (s.actions.length) next.set("action", s.actions.join(","));
    if (s.tableName) next.set("table", s.tableName);
    if (s.userId) next.set("user", s.userId);
    if (s.recordIdQuery) next.set("q", s.recordIdQuery);
    if (s.valueKey) next.set("vk", s.valueKey);
    if (s.valueQuery) next.set("vq", s.valueQuery);
    if (s.ipQuery) next.set("ip", s.ipQuery);
    if (s.userAgentQuery) next.set("ua", s.userAgentQuery);
    setParams(next, { replace: true });
    setPage(0);
  };

  // Persiste filtros ativos em localStorage para restaurar em navegações internas.
  useEffect(() => {
    writePersisted({
      from: filterState.from?.toISOString(),
      to: filterState.to?.toISOString(),
      action: filterState.actions.length ? filterState.actions.join(",") : undefined,
      table: filterState.tableName,
      user: filterState.userId,
      q: filterState.recordIdQuery || undefined,
      vk: filterState.valueKey || undefined,
      vq: filterState.valueQuery || undefined,
      ip: filterState.ipQuery || undefined,
      ua: filterState.userAgentQuery || undefined,
    });
  }, [filterState]);

  const hasAnyFilter = useMemo(
    () =>
      !!filterState.from ||
      !!filterState.to ||
      filterState.actions.length > 0 ||
      !!filterState.tableName ||
      !!filterState.userId ||
      filterState.recordIdQuery.length > 0 ||
      filterState.valueKey.length > 0 ||
      filterState.valueQuery.length > 0 ||
      filterState.ipQuery.length > 0 ||
      filterState.userAgentQuery.length > 0,
    [filterState],
  );

  // Atalhos de teclado: "/" foca a busca por ID, "Esc" limpa filtros, "g a" abre Alertas.
  useEffect(() => {
    let pendingG = false;
    let pendingGTimer: number | undefined;

    const isEditable = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        node.isContentEditable === true
      );
    };

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const editable = isEditable(e.target);

      if (e.key === "Escape" && !editable) {
        if (hasAnyFilter) {
          e.preventDefault();
          setFilters({
            actions: [],
            recordIdQuery: "",
            valueKey: "",
            valueQuery: "",
            ipQuery: "",
            userAgentQuery: "",
            from: undefined,
            to: undefined,
            tableName: undefined,
            userId: undefined,
          });
          toast({ title: "Filtros limpos" });
        }
        return;
      }

      if (editable) return;

      if (e.key === "/") {
        const input = document.getElementById("audit-record-id-input") as HTMLInputElement | null;
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
        }
        return;
      }

      if (e.key.toLowerCase() === "g") {
        pendingG = true;
        window.clearTimeout(pendingGTimer);
        pendingGTimer = window.setTimeout(() => {
          pendingG = false;
        }, 800);
        return;
      }
      if (pendingG && e.key.toLowerCase() === "a") {
        pendingG = false;
        window.clearTimeout(pendingGTimer);
        if (currentOrgId) {
          e.preventDefault();
          setAlertsOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.clearTimeout(pendingGTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnyFilter, currentOrgId]);

  const memberOpts = useMemo(
    () => members.map((m) => ({ user_id: m.user_id, label: `${m.user_id.slice(0, 8)}… (${m.role})` })),
    [members],
  );

  const userLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const opt of memberOpts) m.set(opt.user_id, opt.label);
    return m;
  }, [memberOpts]);

  const queryFilters = {
    organizationId: currentOrgId,
    from: filterState.from?.toISOString(),
    to: filterState.to?.toISOString(),
    actions: filterState.actions,
    tableName: filterState.tableName,
    userId: filterState.userId,
    recordIdQuery: filterState.recordIdQuery,
    valueKey: filterState.valueKey,
    valueQuery: filterState.valueQuery,
    ipQuery: filterState.ipQuery,
    userAgentQuery: filterState.userAgentQuery,
    page,
    pageSize: pageSize,
  };

  const { data, isLoading, isFetching } = useAuditLog(queryFilters);
  const [loadedPage, setLoadedPage] = useState<number>(page);
  useEffect(() => {
    if (!isFetching) setLoadedPage(page);
  }, [isFetching, page]);
  const isPaginating = isFetching && !isLoading && loadedPage !== page;
  const rawRows = data?.rows ?? [];
  const serverTotal = data?.count ?? 0;

  // Client-side post-filter: aplicado quando há texto sem chave (impossível server-side em jsonb)
  const needsClientValueFilter =
    filterState.valueQuery.trim().length > 0 && filterState.valueKey.trim().length === 0;
  const rows = useMemo(() => {
    if (!needsClientValueFilter) return rawRows;
    const term = filterState.valueQuery.trim().toLowerCase();
    return rawRows.filter((r) => {
      const oldStr = r.old_values ? JSON.stringify(r.old_values).toLowerCase() : "";
      const newStr = r.new_values ? JSON.stringify(r.new_values).toLowerCase() : "";
      return oldStr.includes(term) || newStr.includes(term);
    });
  }, [rawRows, needsClientValueFilter, filterState.valueQuery]);
  const total = needsClientValueFilter ? rows.length : serverTotal;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const userLabel = (uid: string) => userLabelMap.get(uid) ?? `${uid.slice(0, 8)}…`;

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast({ title: "ID copiado", description: id });
    } catch {
      /* noop */
    }
  };

  const handleExport = async () => {
    if (!currentOrgId) return;
    setExporting(true);
    try {
      const all = await fetchAuditExport(queryFilters, 5000);
      const csv = buildAuditCsv(
        all.map((r) => ({
          created_at: r.created_at,
          user_id: r.user_id,
          user_label: userLabel(r.user_id),
          action: r.action,
          table_name: r.table_name,
          record_id: r.record_id,
        })),
      );
      downloadCsv(`auditoria-${format(new Date(), "yyyyMMdd-HHmm")}.csv`, csv);
      toast({ title: "Exportado", description: `${all.length} eventos baixados.` });
    } catch (err) {
      toast({ title: "Erro ao exportar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ScrollText className="h-8 w-8" /> Trilha de auditoria
          </h1>
          <p className="text-muted-foreground">Consulte todas as ações da sua organização com filtros avançados.</p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="hidden md:inline-flex items-center gap-1 font-mono text-[10px] cursor-help"
                aria-label="Atalhos de teclado disponíveis nesta tela"
              >
                <Keyboard className="h-3 w-3" />
                / · Esc · g a
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              <div className="space-y-1">
                <div><kbd className="font-mono">/</kbd> focar busca por ID</div>
                <div><kbd className="font-mono">Esc</kbd> limpar filtros</div>
                <div><kbd className="font-mono">g</kbd> depois <kbd className="font-mono">a</kbd> abrir Alertas</div>
              </div>
            </TooltipContent>
          </Tooltip>
          {currentOrgId && (
            <AuditSavedViewsMenu
              organizationId={currentOrgId}
              currentFilters={filterState}
              currentPage={page}
              currentPageSize={pageSize}
              onApply={(s, opts) => {
                setFilters(s);
                if (opts?.pageSize && PAGE_SIZE_OPTIONS.includes(opts.pageSize)) {
                  setPageSize(opts.pageSize);
                }
                // setFilters resets page to 0; restore desired page on next tick.
                if (typeof opts?.page === "number" && opts.page > 0) {
                  setTimeout(() => setPage(opts.page!), 0);
                }
              }}
            />
          )}
          <Button
            onClick={() => setAlertsOpen(true)}
            disabled={!currentOrgId}
            variant="outline"
            data-testid="audit-alerts-button"
          >
            <Bell className="h-4 w-4" />
            Alertas
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || !currentOrgId || total === 0}
            variant="outline"
            aria-busy={exporting}
            data-testid="audit-export-button"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? "Exportando…" : "Exportar CSV"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <AuditFilters state={filterState} onChange={setFilters} tables={tables} members={memberOpts} />

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ResultsPagination
                page={page + 1}
                pageSize={pageSize}
                total={total}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p - 1)}
                itemNoun="evento"
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={setPageSize}
              />
            </div>
            {isLoading && rows.length > 0 && (
              <span
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                aria-live="polite"
                data-testid="audit-page-loading"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Atualizando…
              </span>
            )}
          </div>

          {!currentOrgId ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
              <Inbox className="h-10 w-10 opacity-40" />
              <p className="text-sm">Selecione uma organização para ver a trilha de auditoria.</p>
            </div>
          ) : (isLoading && rows.length === 0) || isPaginating ? (
            <AuditTableSkeleton rows={Math.min(pageSize, 8)} />
          ) : rows.length === 0 ? (
            (() => {
              const isEmptyFilters =
                total === 0 &&
                filterState.actions.length === 0 &&
                !filterState.from &&
                !filterState.to &&
                !filterState.tableName &&
                !filterState.userId &&
                !filterState.recordIdQuery &&
                !filterState.valueKey &&
                !filterState.valueQuery &&
                !filterState.ipQuery &&
                !filterState.userAgentQuery;
              return isEmptyFilters ? (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
                  <Inbox className="h-10 w-10 opacity-40" />
                  <p className="text-sm font-medium text-foreground">Sem eventos ainda</p>
                  <p className="text-xs max-w-sm">
                    Conforme sua equipe usa o sistema, as ações registradas vão aparecer aqui.
                  </p>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
                  <SearchX className="h-10 w-10 opacity-40" />
                  <p className="text-sm font-medium text-foreground">Nenhum resultado</p>
                  <p className="text-xs max-w-sm">
                    Ajuste ou limpe os filtros acima para ver mais eventos.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setFilters({
                        actions: [],
                        recordIdQuery: "",
                        valueKey: "",
                        valueQuery: "",
                        ipQuery: "",
                        userAgentQuery: "",
                        from: undefined,
                        to: undefined,
                        tableName: undefined,
                        userId: undefined,
                      })
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Limpar filtros
                  </Button>
                </div>
              );
            })()
          ) : (
            <div
              className={cn(
                "transition-opacity",
                isLoading && "opacity-60 pointer-events-none",
              )}
              aria-busy={isLoading}
            >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm">{format(new Date(e.created_at), "dd/MM/yy HH:mm:ss")}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{userLabel(e.user_id)}</TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANT[e.action]}>{e.action}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.table_name}</TableCell>
                    <TableCell>
                      {e.record_id ? (
                        <button
                          onClick={() => copyId(e.record_id!)}
                          className="font-mono text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                          title="Copiar ID"
                        >
                          {e.record_id.slice(0, 8)}…
                          <Copy className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(e)}>
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button asChild size="icon" variant="ghost" aria-label="Abrir página completa">
                              <Link to={`/audit/event/${e.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Abrir página completa</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AuditDiffDialog
        entry={selected}
        userLabel={selected ? userLabel(selected.user_id) : undefined}
        onClose={() => setSelected(null)}
      />

      {currentOrgId && (
        <AuditAlertsManager
          open={alertsOpen}
          onOpenChange={setAlertsOpen}
          organizationId={currentOrgId}
          currentUserId={user?.id}
          tables={tables}
          members={memberOpts}
          prefill={filterState}
        />
      )}
    </div>
  );
};

export default AuditLogPage;
