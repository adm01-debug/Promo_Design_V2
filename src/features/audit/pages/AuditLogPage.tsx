import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollText, Download, Eye, Copy } from "lucide-react";
import { useOrganizations, useOrgMembers } from "@/hooks/use-organization";
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
import { buildAuditCsv, downloadCsv } from "../lib/audit-csv";
import { ResultsPagination } from "@/components/ResultsPagination";

const PAGE_SIZE = 50;

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

const AuditLogPage = () => {
  const { currentOrgId } = useOrganizations();
  const { members } = useOrgMembers(currentOrgId);
  const { data: tables = [] } = useAuditDistinctTables(currentOrgId);
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [exporting, setExporting] = useState(false);

  // Initialize from querystring (once per param change)
  const filterState: AuditFilterState = useMemo(
    () => ({
      from: parseDate(params.get("from")),
      to: parseDate(params.get("to")),
      actions: parseActions(params.get("action")),
      tableName: params.get("table") ?? undefined,
      userId: params.get("user") ?? undefined,
      recordIdQuery: params.get("q") ?? "",
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
    setParams(next, { replace: true });
    setPage(0);
  };

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
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useAuditLog(queryFilters);
  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
        <Button onClick={handleExport} disabled={exporting || !currentOrgId || total === 0} variant="outline">
          <Download className="h-4 w-4" />
          {exporting ? "Exportando…" : "Exportar CSV"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <AuditFilters state={filterState} onChange={setFilters} tables={tables} members={memberOpts} />

          <ResultsPagination
            page={page + 1}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p - 1)}
            itemNoun="evento"
          />

          {!currentOrgId ? (
            <p className="text-muted-foreground py-8 text-center">Selecione uma organização.</p>
          ) : isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              {total === 0 && filterState.actions.length === 0 && !filterState.from && !filterState.tableName && !filterState.userId && !filterState.recordIdQuery
                ? "Sem eventos ainda."
                : "Nenhum resultado para os filtros aplicados."}
            </p>
          ) : (
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
                      <Button size="sm" variant="ghost" onClick={() => setSelected(e)}>
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AuditDiffDialog
        entry={selected}
        userLabel={selected ? userLabel(selected.user_id) : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};

export default AuditLogPage;
