import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History, Search, Heart, Download, Eye, Trash2,
  Calendar, Package, Filter, X, SlidersHorizontal, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useMagicUpHistory, type MagicUpHistoryItem } from "@/features/magic-up";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";

const MagicUpHistory = () => {
  const { items, toggleFavorite, deleteItem } = useMagicUpHistory();
  const [search, setSearch] = useState("");
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterProduct, setFilterProduct] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MagicUpHistoryItem | null>(null);

  // Unique product names for filter
  const productNames = useMemo(() => {
    const names = new Set(items.filter(i => i.productName).map(i => i.productName!));
    return Array.from(names).sort();
  }, [items]);

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterFavorites && !item.favorite) return false;
      if (filterProduct && item.productName !== filterProduct) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchPrompt = item.prompt.toLowerCase().includes(q);
        const matchProduct = item.productName?.toLowerCase().includes(q);
        const matchSku = item.productSku?.toLowerCase().includes(q);
        if (!matchPrompt && !matchProduct && !matchSku) return false;
      }
      if (dateFrom) {
        const itemDate = new Date(item.createdAt);
        if (itemDate < dateFrom) return false;
      }
      if (dateTo) {
        const itemDate = new Date(item.createdAt);
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59);
        if (itemDate > endOfDay) return false;
      }
      return true;
    });
  }, [items, search, filterFavorites, filterProduct, dateFrom, dateTo]);

  const handleDelete = (id: string) => {
    deleteItem(id);
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  const clearFilters = () => {
    setFilterFavorites(false);
    setFilterProduct(null);
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch("");
  };

  const hasActiveFilters = filterFavorites || filterProduct || dateFrom || dateTo;

  const CHART_COLORS = ["hsl(190, 95%, 55%)", "hsl(260, 60%, 60%)", "hsl(330, 80%, 60%)", "hsl(38, 92%, 50%)", "hsl(152, 60%, 45%)"];

  const styleChartData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => { const s = i.style || "Padrão"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [items]);

  const dailyChartData = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let d = 13; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(now.getDate() - d);
      const key = format(date, "dd/MM");
      map[key] = 0;
    }
    items.forEach((i) => {
      const key = format(new Date(i.createdAt), "dd/MM");
      if (key in map) map[key]++;
    });
    return Object.entries(map).map(([day, count]) => ({ day, count }));
  }, [items]);

  const favCount = items.filter((i) => i.favorite).length;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-display font-semibold text-foreground">Histórico Magic Up</h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-2 py-0.5 rounded">
            {filtered.length} de {items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
              <X className="w-3 h-3" /> Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Section */}
      {items.length > 0 && (
        <div className="px-4 pt-3 border-b border-border pb-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xl font-bold text-foreground">{items.length}</p>
              <p className="text-xs text-muted-foreground">Total Geradas</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xl font-bold text-foreground">{favCount}</p>
              <p className="text-xs text-muted-foreground">Favoritas</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xl font-bold text-foreground">{productNames.length}</p>
              <p className="text-xs text-muted-foreground">Produtos</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Gerações (14 dias)
              </h3>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="magicGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="count" name="Gerações" stroke="hsl(var(--primary))" fill="url(#magicGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {styleChartData.length > 1 && (
              <div className="rounded-lg border border-border bg-card p-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Por Estilo</h3>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={styleChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                      {styleChartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center">
                  {styleChartData.map((d, i) => (
                    <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por prompt, produto ou SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <Button
            variant={filterFavorites ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setFilterFavorites(!filterFavorites)}
          >
            <Heart className={`w-3.5 h-3.5 ${filterFavorites ? "fill-current" : ""}`} /> Favoritos
          </Button>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
          </Button>
        </div>

        {/* Extended filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-3 flex-wrap pt-1">
                {/* Product filter */}
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Produto</label>
                  <select
                    value={filterProduct || ""}
                    onChange={(e) => setFilterProduct(e.target.value || null)}
                    className="px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-foreground focus:outline-none focus:border-primary min-w-[180px]"
                  >
                    <option value="">Todos os produtos</option>
                    {productNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Date from */}
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Data início</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[160px] justify-start text-left text-xs font-normal",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date to */}
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Data fim</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-[160px] justify-start text-left text-xs font-normal",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                <History className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-display font-semibold text-foreground mb-1">
                {items.length === 0 ? "Nenhuma geração ainda" : "Nenhum resultado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {items.length === 0
                  ? "Suas imagens geradas com IA aparecerão aqui"
                  : "Tente ajustar os filtros"
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-xl border overflow-hidden group cursor-pointer transition-all ${
                    selectedItem?.id === item.id
                      ? "border-primary shadow-glow bg-card"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="aspect-square bg-surface-2 relative flex items-center justify-center">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />

                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" className="text-white h-8 w-8 p-0">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-white h-8 w-8 p-0">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 ${item.favorite ? "text-accent" : "text-white"}`}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                      >
                        <Heart className={`w-4 h-4 ${item.favorite ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white h-8 w-8 p-0 hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      {item.favorite && (
                        <span className="bg-accent/90 text-accent-foreground text-[8px] px-1.5 py-0.5 rounded font-mono">
                          ★ FAV
                        </span>
                      )}
                      {item.style && (
                        <span className="bg-primary/80 text-primary-foreground text-[8px] px-1.5 py-0.5 rounded font-mono">
                          {item.style}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    {item.productName && (
                      <p className="text-[10px] text-primary font-mono mb-1 truncate">{item.productName}</p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.prompt}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-mono">
                      {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-surface-1 border-l border-border flex flex-col overflow-hidden shrink-0"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Detalhes</h3>
                <button onClick={() => setSelectedItem(null)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                {/* Preview */}
                <div className="aspect-square bg-surface-2 flex items-center justify-center">
                  <img src={selectedItem.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="p-4 space-y-4">
                  {selectedItem.productName && (
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Produto</label>
                      <p className="text-xs font-semibold text-foreground">{selectedItem.productName}</p>
                      {selectedItem.productSku && (
                        <p className="text-[10px] text-muted-foreground font-mono">{selectedItem.productSku}</p>
                      )}
                    </div>
                  )}

                  {selectedItem.style && (
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Estilo</label>
                      <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary border border-primary/30">
                        {selectedItem.style}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Prompt</label>
                    <p className="text-xs text-foreground leading-relaxed bg-surface-2 rounded-lg p-2 border border-border font-mono">
                      {selectedItem.prompt}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Data</label>
                    <p className="text-xs text-foreground font-mono">
                      {format(new Date(selectedItem.createdAt), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border space-y-2">
                <Button className="w-full gap-2 text-xs bg-gradient-primary text-primary-foreground" size="sm">
                  <Download className="w-3.5 h-3.5" /> Baixar Imagem
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 gap-1.5 text-xs ${selectedItem.favorite ? "text-accent border-accent/40" : ""}`}
                    onClick={() => toggleFavorite(selectedItem.id)}
                  >
                    <Heart className={`w-3.5 h-3.5 ${selectedItem.favorite ? "fill-current" : ""}`} />
                    {selectedItem.favorite ? "Desfav." : "Favoritar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(selectedItem.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MagicUpHistory;
