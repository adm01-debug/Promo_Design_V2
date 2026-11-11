import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Loader2, LineChart, TrendingUp, TrendingDown, Minus, RefreshCcw, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SnapshotRow {
  id: string;
  table_name: string;
  total_bytes: number;
  table_bytes: number;
  index_bytes: number;
  row_estimate: number;
  captured_at: string;
}

interface SnapshotsResponse {
  ok: true;
  rows: SnapshotRow[];
  total: number;
  page: number;
  page_size: number;
  tables: string[];
}

const ALL_TABLES = "__all__";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function toIsoOrUndef(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

async function invoke(body: Record<string, unknown>): Promise<SnapshotsResponse> {
  const { data, error } = await supabase.functions.invoke("admin-maintenance", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as SnapshotsResponse;
}

export function SnapshotHistoryDialog() {
  const [open, setOpen] = useState(false);
  const [tableFilter, setTableFilter] = useState<string>(ALL_TABLES);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const fromIso = useMemo(() => toIsoOrUndef(fromDate ? `${fromDate}T00:00:00` : ""), [fromDate]);
  const toIso = useMemo(() => toIsoOrUndef(toDate ? `${toDate}T23:59:59` : ""), [toDate]);

  const query = useQuery({
    enabled: open,
    queryKey: ["snapshots-list", tableFilter, fromIso, toIso, page],
    staleTime: 30_000,
    queryFn: () =>
      invoke({
        action: "snapshots_list",
        snapshots_table_name: tableFilter === ALL_TABLES ? undefined : tableFilter,
        snapshots_from: fromIso,
        snapshots_to: toIso,
        snapshots_page: page,
        snapshots_page_size: pageSize,
      }),
  });

  const rows = useMemo<SnapshotRow[]>(() => query.data?.rows ?? [], [query.data?.rows]);
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const tables = query.data?.tables ?? [];

  // Compute delta relative to the previous row of the same table within current page.
  const rowsWithDelta = useMemo(() => {
    // rows come in DESC order. Delta = current - next (older).
    const byTable = new Map<string, SnapshotRow[]>();
    for (const r of rows) {
      const arr = byTable.get(r.table_name) ?? [];
      arr.push(r);
      byTable.set(r.table_name, arr);
    }
    return rows.map((r) => {
      const arr = byTable.get(r.table_name) ?? [];
      const idx = arr.findIndex((x) => x.id === r.id);
      const prev = arr[idx + 1]; // older snapshot in DESC order
      if (!prev) return { ...r, delta: null as number | null, deltaPct: null as number | null };
      const delta = r.total_bytes - prev.total_bytes;
      const pct = prev.total_bytes > 0 ? (delta / prev.total_bytes) * 100 : null;
      return { ...r, delta, deltaPct: pct };
    });
  }, [rows]);

  const resetFilters = () => {
    setTableFilter(ALL_TABLES);
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasFilters = tableFilter !== ALL_TABLES || !!fromDate || !!toDate;

  const goToPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  // Compact pagination window
  const paginationWindow = useMemo(() => {
    const items: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) items.push(i);
    return items;
  }, [page, totalPages]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
          <LineChart className="h-3 w-3" />
          Ver histórico completo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LineChart className="h-4 w-4" /> Histórico de snapshots de crescimento
          </DialogTitle>
          <DialogDescription>
            Inspecione tamanhos, linhas e deltas por período. Deltas são calculados contra o
            snapshot imediatamente anterior da mesma tabela.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 pb-3 border-b">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground font-mono">Tabela</label>
            <Select
              value={tableFilter}
              onValueChange={(v) => {
                setTableFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[220px] h-8 text-xs">
                <SelectValue placeholder="Todas as tabelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TABLES}>Todas as tabelas</SelectItem>
                {tables.map((t) => (
                  <SelectItem key={t} value={t} className="font-mono text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground font-mono">De</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-[150px] h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground font-mono">Até</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-[150px] h-8 text-xs"
            />
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 gap-1.5 text-xs"
            >
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {total.toLocaleString("pt-BR")} registro(s)
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              title="Recarregar"
              className="h-8 w-8"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {query.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-10 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando snapshots…
            </div>
          ) : query.isError ? (
            <p className="text-sm text-destructive py-6 text-center">
              Falha ao carregar histórico. Verifique se você é owner/admin.
            </p>
          ) : rowsWithDelta.length === 0 ? (
            <p className="text-xs text-muted-foreground py-10 text-center">
              Nenhum snapshot encontrado para os filtros atuais.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase">Capturado em</TableHead>
                  <TableHead className="text-[10px] uppercase">Tabela</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Total</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Tabela</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Índices</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Linhas</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Δ vs. anterior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsWithDelta.map((r) => {
                  const hasDelta = r.delta !== null;
                  const positive = (r.delta ?? 0) > 0;
                  const negative = (r.delta ?? 0) < 0;
                  const Icon = !hasDelta
                    ? Minus
                    : positive
                      ? TrendingUp
                      : negative
                        ? TrendingDown
                        : Minus;
                  const color = !hasDelta
                    ? "text-muted-foreground"
                    : positive
                      ? "text-amber-500"
                      : negative
                        ? "text-emerald-500"
                        : "text-muted-foreground";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {format(parseISO(r.captured_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.table_name}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatBytes(r.total_bytes)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatBytes(r.table_bytes)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatBytes(r.index_bytes)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {r.row_estimate.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs ${color}`}
                        >
                          <Icon className="h-3 w-3" />
                          {!hasDelta
                            ? "—"
                            : `${positive ? "+" : ""}${formatBytes(Math.abs(r.delta ?? 0))}${
                                r.deltaPct !== null
                                  ? ` (${r.deltaPct > 0 ? "+" : ""}${r.deltaPct.toFixed(1)}%)`
                                  : ""
                              }`}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pt-3 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(page - 1);
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {paginationWindow[0] > 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => goToPage(1)} className="cursor-pointer">
                      1
                    </PaginationLink>
                  </PaginationItem>
                )}
                {paginationWindow.map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === page}
                      onClick={() => goToPage(p)}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {paginationWindow[paginationWindow.length - 1] < totalPages && (
                  <PaginationItem>
                    <PaginationLink onClick={() => goToPage(totalPages)} className="cursor-pointer">
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(page + 1);
                    }}
                    className={
                      page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
