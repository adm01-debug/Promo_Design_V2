import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  useAuditDistinctTables,
  useAuditLog,
} from "../hooks/use-audit-log";
import { AuditFilters } from "../components/AuditFilters";
import { AuditDiffDialog } from "../components/AuditDiffDialog";
import { AuditAlertsManager } from "../components/AuditAlertsManager";
import { AuditSavedViewsMenu } from "../components/AuditSavedViewsMenu";
import { AuditTableSkeleton } from "../components/AuditTableSkeleton";
import { ResultsPagination } from "@/components/ResultsPagination";
import { cn } from "@/lib/utils";
import { useAuditFilters } from "../hooks/use-audit-filters";
import { useAuditShortcuts } from "../hooks/use-audit-shortcuts";
import { useAuditExport } from "../hooks/use-audit-export";

const ACTION_VARIANT: Record<AuditAction, "default" | "secondary" | "destructive"> = {
  INSERT: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
};

const AuditLogPage = () => {
  const { currentOrgId } = useOrganizations();
  const { user } = useAuth();
  const { members } = useOrgMembers(currentOrgId);
  const { data: tables = [] } = useAuditDistinctTables(currentOrgId);
  const { toast } = useToast();
  
  const { 
    filterState, setFilters, page, setPage, pageSize, setPageSize, hasAnyFilter, pageSizeOptions 
  } = useAuditFilters();

  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);

  useAuditShortcuts({
    currentOrgId,
    hasAnyFilter,
    setFilters,
    setAlertsOpen
  });

  const memberOpts = useMemo(
    () => members.map((m) => ({ user_id: m.user_id, label: `${m.user_id.slice(0, 8)}… (${m.role})` })),
    [members],
  );

  const userLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const opt of memberOpts) m.set(opt.user_id, opt.label);
    return m;
  }, [memberOpts]);

  const userLabel = (uid: string | null | undefined) => {
    if (!uid) return "— (sistema)";
    return userLabelMap.get(uid) ?? `${uid.slice(0, 8)}…`;
  };

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
    pageSize,
  };

  const { exporting, handleExport } = useAuditExport({
    currentOrgId,
    queryFilters,
    userLabel
  });

  const { data, isLoading, isFetching } = useAuditLog(queryFilters);
  const [loadedPage, setLoadedPage] = useState<number>(page);
  useEffect(() => {
    if (!isFetching) setLoadedPage(page);
  }, [isFetching, page]);
  const isPaginating = isFetching && !isLoading && loadedPage !== page;

  const filtersKey = useMemo(
    () => JSON.stringify({ ...filterState, pageSize }),
    [filterState, pageSize],
  );
  const [appliedFiltersKey, setAppliedFiltersKey] = useState(filtersKey);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  useEffect(() => {
    if (filtersKey === appliedFiltersKey) return;
    const t = window.setTimeout(() => setIsApplyingFilters(true), 120);
    return () => window.clearTimeout(t);
  }, [filtersKey, appliedFiltersKey]);
  useEffect(() => {
    if (!isFetching && filtersKey !== appliedFiltersKey) {
      setAppliedFiltersKey(filtersKey);
      setIsApplyingFilters(false);
    }
  }, [isFetching, filtersKey, appliedFiltersKey]);

  const rawRows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const serverTotal = data?.count ?? 0;

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
  }, [page, totalPages, setPage]);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast({ title: "ID copiado", description: id });
    } catch { /* noop */ }
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
                if (opts?.pageSize) setPageSize(opts.pageSize);
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
                pageSizeOptions={pageSizeOptions}
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
          ) : (isLoading && rows.length === 0) || isPaginating || isApplyingFilters ? (
            <div className="animate-fade-in">
              <AuditTableSkeleton rows={Math.min(pageSize, 8)} />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
              <SearchX className="h-10 w-10 opacity-40" />
              <p className="text-sm font-medium text-foreground">Nenhum resultado</p>
              <p className="text-xs max-w-sm">Ajuste ou limpe os filtros acima para ver mais eventos.</p>
              <Button size="sm" variant="outline" onClick={() => setFilters({
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
              })}>
                <RotateCcw className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            </div>
          ) : (
            <div className={cn("transition-opacity animate-fade-in", isLoading && "opacity-60 pointer-events-none")} aria-busy={isLoading}>
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
                          <TooltipContent>{formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{userLabel(e.user_id)}</TableCell>
                      <TableCell>
                        <Badge variant={ACTION_VARIANT[e.action]}>{e.action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{e.table_name}</TableCell>
                      <TableCell>
                        {e.record_id ? (
                          <button onClick={() => copyId(e.record_id!)} className="font-mono text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1" title="Copiar ID">
                            {e.record_id.slice(0, 8)}… <Copy className="h-3 w-3" />
                          </button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(e)}><Eye className="h-4 w-4" /> Ver</Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild size="icon" variant="ghost" aria-label="Abrir página completa">
                                <Link to={`/audit/event/${e.id}`}><ExternalLink className="h-4 w-4" /></Link>
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
