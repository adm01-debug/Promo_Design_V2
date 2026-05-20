import { useState } from "react";
import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Plus, Search, Trash2, Eye, MoreHorizontal,
  Package, Calendar, ArrowUpDown, CheckCircle2,
  ChevronLeft, ChevronRight, Download, Loader2, X, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  useServiceOrders, STATUS_CONFIG, getNextStatuses,
  type OsStatus,
  generateBatchPdf, getLogoDataUrl,
} from "@/features/service-orders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PdfProgressOverlay, { type PdfProgress } from "@/components/PdfProgressOverlay";

const PAGE_SIZE = 20;

const STATUS_FILTERS: { value: OsStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "aberta", label: "Abertas" },
  { value: "em_producao", label: "Em Produção" },
  { value: "concluida", label: "Concluídas" },
  { value: "cancelada", label: "Canceladas" },
];

const ServiceOrderList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Hydrate every filter from URL so deep links restore the exact view.
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<OsStatus | "all">(() => {
    const v = searchParams.get("status") as OsStatus | "all" | null;
    return v && STATUS_FILTERS.some((f) => f.value === v) ? v : "all";
  });
  const [sortDesc, setSortDesc] = useState(() => searchParams.get("sort") !== "asc");
  const [page, setPage] = useState(() => {
    const p = Number(searchParams.get("page"));
    return Number.isFinite(p) && p > 0 ? p : 1;
  });
  const [productQuery, setProductQuery] = useState(() => searchParams.get("product") ?? "");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(() => {
    const v = searchParams.get("from");
    if (!v) return undefined;
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  });
  const [dateTo, setDateTo] = useState<Date | undefined>(() => {
    const v = searchParams.get("to");
    if (!v) return undefined;
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  });
  const [exporting, setExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<PdfProgress | null>(null);

  // Convert local Date -> inclusive day range ISO bounds for the query.
  const dateFromIso = useMemo(() => {
    if (!dateFrom) return undefined;
    const d = new Date(dateFrom);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [dateFrom]);
  const dateToIso = useMemo(() => {
    if (!dateTo) return undefined;
    const d = new Date(dateTo);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [dateTo]);

  // Persist all filters in the URL so refresh/back-button restore the view.
  // We compare against `window.location.search` (not the React Router
  // `searchParams` value) and omit it from deps so a `setSearchParams` call
  // can't re-trigger this effect through identity changes — preventing loops.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search.trim()) next.set("q", search.trim());
    if (statusFilter !== "all") next.set("status", statusFilter);
    if (!sortDesc) next.set("sort", "asc");
    if (page > 1) next.set("page", String(page));
    if (productQuery.trim()) next.set("product", productQuery.trim());
    if (dateFrom) next.set("from", formatDate(dateFrom, "yyyy-MM-dd"));
    if (dateTo) next.set("to", formatDate(dateTo, "yyyy-MM-dd"));
    const desired = next.toString();
    const current = window.location.search.replace(/^\?/, "");
    if (desired === current) return;
    setSearchParams(next, { replace: true });
  }, [search, statusFilter, sortDesc, page, productQuery, dateFrom, dateTo, setSearchParams]);

  const { orders: paginated, total, totalPages, updateStatus, deleteOrder, addOrder } = useServiceOrders({
    page,
    pageSize: PAGE_SIZE,
    search,
    status: statusFilter,
    sortAsc: !sortDesc,
    productQuery,
    dateFrom: dateFromIso,
    dateTo: dateToIso,
  });

  // Also fetch total unfiltered count for display
  const { total: allTotal } = useServiceOrders({ pageSize: 1 });

  const handleChangeStatus = (id: string, status: OsStatus) => {
    try {
      updateStatus(id, status);
      toast.success(`Status atualizado para "${STATUS_CONFIG[status].label}"`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar status");
    }
  };

  const handleDelete = (id: string) => {
    deleteOrder(id);
    toast.success("Ordem de Serviço excluída");
  };

  const handleDuplicate = async (order: any) => {
    try {
      const { id: _id, osNumber: _os, createdAt: _ca, updatedAt: _ua, ...clonedData } = order;
      const newOrder = await addOrder({
        ...clonedData,
        status: "aberta",
        observations: `Cópia da OS ${order.osNumber}. ${clonedData.observations || ""}`,
      });
      toast.success(`OS ${order.osNumber} duplicada com sucesso!`);
      navigate(`/mockup/service-order?edit=${newOrder.id}`);
    } catch (e) {
      toast.error("Erro ao duplicar OS");
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    setPdfProgress({ stage: "Buscando OSs", current: 0, total: 0, percent: 0 });
    try {
      // Buscar todas as OSs respeitando filtros (até 1000)
      let query = supabase.from("service_orders").select("*");
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) {
        query = query.or(
          `os_number.ilike.%${search}%,client_name.ilike.%${search}%,client_company.ilike.%${search}%,product_name.ilike.%${search}%`
        );
      }
      query = query.order("created_at", { ascending: !sortDesc }).limit(1000);
      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.warning("Nenhuma OS para exportar com os filtros atuais");
        return;
      }
      setPdfProgress({
        stage: "Preparando dados",
        current: data.length,
        total: data.length,
        percent: 3,
      });
      const orders = data.map((row) => ({
        id: row.id,
        osNumber: row.os_number,
        status: row.status as OsStatus,
        date: row.date,
        deliveryDate: row.delivery_date ?? "",
        clientName: row.client_name,
        clientCompany: row.client_company ?? "",
        clientPhone: row.client_phone ?? "",
        clientEmail: row.client_email ?? "",
        productName: row.product_name,
        productSku: row.product_sku ?? "",
        productMaterial: row.product_material ?? "",
        productColors: row.product_colors ?? "",
        technique: row.technique,
        areaName: row.area_name ?? "",
        areaWidth: row.area_width ?? "",
        areaHeight: row.area_height ?? "",
        areaShape: row.area_shape ?? "",
        artColors: row.art_colors ?? "",
        artDpi: row.art_dpi ?? "",
        artFile: row.art_file ?? "",
        artFileDataUrl: row.art_file_data_url ?? "",
        quantity: String(row.quantity),
        observations: row.observations ?? "",
        mockupImageUrl: row.mockup_image_url ?? "",
        identificacaoCaixa: row.identificacao_caixa ?? "",
        materialEvento: row.material_evento ?? false,
        aprovarPrimeiraPeca: row.aprovar_primeira_peca ?? false,
        qtdCompra: row.qtd_compra ?? "",
        qtdLiberada: row.qtd_liberada ?? "",
        fazParteKit: row.faz_parte_kit ?? false,
        gravacaoDetalhe: row.gravacao_detalhe ?? "",
        artAssetId: row.art_asset_id ?? null,
        lockVersion: (row as any).lock_version ?? 1,
        deletedAt: (row as any).deleted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      const logo = await getLogoDataUrl().catch(() => undefined);
      const doc = await generateBatchPdf(
        orders,
        { status: statusFilter, search },
        logo,
        (p) => setPdfProgress(p),
      );
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      doc.save(`ordens-servico-${today}.pdf`);
      toast.success(`PDF gerado com ${orders.length} OS(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF");
    } finally {
      setExporting(false);
      setPdfProgress(null);
    }
  };

  // Reset page when filters change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleFilterChange = (v: OsStatus | "all") => { setStatusFilter(v); setPage(1); };
  const handleProductChange = (v: string) => { setProductQuery(v); setPage(1); };
  const handleDateFromChange = (d: Date | undefined) => { setDateFrom(d); setPage(1); };
  const handleDateToChange = (d: Date | undefined) => { setDateTo(d); setPage(1); };
  /** True whenever any filter (basic or advanced) is active. */
  const hasActiveFilters = !!(
    search || statusFilter !== "all" || !sortDesc || page > 1 ||
    productQuery || dateFrom || dateTo
  );
  /** Single "Clear filters" entry point — wipes URL params and resets state. */
  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSortDesc(true);
    setPage(1);
    setProductQuery("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">Ordens de Serviço</h1>
            <p className="text-xs text-muted-foreground">{total} de {allTotal} ordem(ns)</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={handleExportPdf} disabled={exporting || total === 0}>
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Exportar PDF
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate("/mockup/service-order")}>
              <Plus className="w-3.5 h-3.5" /> Nova OS
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nº, cliente ou produto..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => handleFilterChange(f.value)}
              >
                {f.label}
              </Button>
            ))}
            <Button variant="ghost" size="icon" onClick={() => setSortDesc(!sortDesc)}>
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Advanced filters: product + creation date range — all URL-synced */}
        <div className="flex flex-wrap items-end gap-2 mt-3">
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Produto</label>
            <div className="relative">
              <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={productQuery}
                onChange={(e) => handleProductChange(e.target.value)}
                placeholder="Nome ou SKU…"
                className="h-8 w-[200px] pl-7 text-xs"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Criada de</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 w-[160px] justify-start text-left text-xs font-normal", !dateFrom && "text-muted-foreground")}>
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  {dateFrom ? formatDate(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={dateFrom} onSelect={handleDateFromChange} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Criada até</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 w-[160px] justify-start text-left text-xs font-normal", !dateTo && "text-muted-foreground")}>
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  {dateTo ? formatDate(dateTo, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={dateTo} onSelect={handleDateToChange} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-muted-foreground ml-auto"
              onClick={clearAllFilters}
              title="Remove todos os filtros e limpa a URL"
            >
              <X className="w-3.5 h-3.5" /> Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-w-5xl mx-auto p-6">
        {paginated.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              {allTotal === 0
                ? "Nenhuma ordem de serviço criada ainda"
                : "Nenhum resultado para os filtros aplicados"}
            </p>
            {allTotal === 0 && (
              <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate("/mockup/new")}>
                <Plus className="w-4 h-4" /> Criar do Mockup Studio
              </Button>
            )}
          </motion.div>
        ) : (
          <>
            <div className="space-y-3">
              <AnimatePresence>
                {paginated.map((order) => {
                  const cfg = STATUS_CONFIG[order.status];
                  const nextStatuses = getNextStatuses(order.status);
                  return (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/mockup/service-order?edit=${order.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-sm font-semibold text-foreground">{order.osNumber}</span>
                            <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-0 text-[10px]`}>
                              {cfg.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {order.productName || "Sem produto"}
                            </span>
                            {order.clientName && (
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {order.clientName}
                                {order.clientCompany && ` • ${order.clientCompany}`}
                              </span>
                            )}
                            {order.technique && (
                              <span className="hidden md:inline">{order.technique}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Criada: {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                            {order.deliveryDate && (
                              <span>Entrega: {order.deliveryDate}</span>
                            )}
                            {order.quantity && <span>Qtd: {order.quantity}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/mockup/service-order?edit=${order.id}`)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {nextStatuses.length > 0 ? (
                                <>
                                  {nextStatuses.map((s) => (
                                    <DropdownMenuItem key={s} onClick={() => handleChangeStatus(order.id, s)}>
                                      <CheckCircle2 className={`w-3.5 h-3.5 mr-2 ${STATUS_CONFIG[s].color}`} />
                                      {STATUS_CONFIG[s].label}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                </>
                              ) : (
                                <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                                  Sem transições disponíveis
                                </DropdownMenuItem>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir OS {order.osNumber}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(order.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground font-mono">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <PdfProgressOverlay
        open={!!pdfProgress}
        title="Gerando PDF consolidado…"
        progress={pdfProgress}
      />
    </div>
  );
};

export default ServiceOrderList;
