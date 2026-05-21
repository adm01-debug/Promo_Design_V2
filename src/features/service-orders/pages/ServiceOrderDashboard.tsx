import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useServiceOrders, STATUS_CONFIG, type OsStatus } from "@/features/service-orders";
import {
  BarChart3, ClipboardList, TrendingUp, Calendar, ArrowRight,
  FileText, Package, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(160, 60%, 45%)", "hsl(190, 70%, 50%)", "hsl(40, 80%, 55%)", "hsl(350, 65%, 55%)",
  "hsl(270, 55%, 55%)", "hsl(210, 65%, 55%)", "hsl(25, 75%, 55%)", "hsl(330, 60%, 55%)",
];

const STATUS_CHART_COLORS: Record<OsStatus, string> = {
  aberta: "hsl(210, 70%, 55%)",
  em_producao: "hsl(40, 80%, 55%)",
  concluida: "hsl(155, 60%, 45%)",
  cancelada: "hsl(0, 65%, 55%)",
};

const ServiceOrderDashboard = () => {
  const { orders } = useServiceOrders({ fetchAll: true });
  const navigate = useNavigate();

  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const byStatus: Record<OsStatus, number> = { aberta: 0, em_producao: 0, concluida: 0, cancelada: 0 };
    orders.forEach((o) => { byStatus[o.status]++; });

    const byTechnique: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.technique) byTechnique[o.technique] = (byTechnique[o.technique] || 0) + 1;
    });
    const techniqueEntries = Object.entries(byTechnique).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const deliveriesThisMonth = orders.filter((o) => {
      if (!o.deliveryDate) return false;
      const d = new Date(o.deliveryDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const overdue = orders.filter((o) => {
      if (!o.deliveryDate || o.status === "concluida" || o.status === "cancelada") return false;
      return new Date(o.deliveryDate) < now;
    });

    const totalQty = orders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);

    // Monthly trend (last 6 months)
    const monthlyTrend: { month: string; total: number; concluidas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const monthOrders = orders.filter((o) => {
        const od = new Date(o.createdAt);
        return od.getMonth() === m && od.getFullYear() === y;
      });
      monthlyTrend.push({
        month: label,
        total: monthOrders.length,
        concluidas: monthOrders.filter((o) => o.status === "concluida").length,
      });
    }

    // Status pie data
    const statusPieData = (Object.entries(byStatus) as [OsStatus, number][])
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: STATUS_CONFIG[key].label, value, status: key }));

    // Technique bar data
    const techniqueBarData = techniqueEntries.map(([name, count]) => ({
      name: name.length > 18 ? name.slice(0, 16) + "…" : name,
      fullName: name,
      count,
    }));

    return { byStatus, techniqueBarData, deliveriesThisMonth, overdue, totalQty, monthlyTrend, statusPieData };
  }, [orders]);

  const statusCards: { key: OsStatus; icon: React.ReactNode }[] = [
    { key: "aberta", icon: <FileText className="w-5 h-5" /> },
    { key: "em_producao", icon: <Clock className="w-5 h-5" /> },
    { key: "concluida", icon: <TrendingUp className="w-5 h-5" /> },
    { key: "cancelada", icon: <Package className="w-5 h-5" /> },
  ];

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; payload?: { fullName?: string } }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-foreground mb-1">{payload[0]?.payload?.fullName || label}</p>
        {payload.map((p, i: number) => (
          <p key={i} className="text-muted-foreground">
            {p.name}: <span className="font-mono font-semibold text-foreground">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Dashboard — Ordens de Serviço
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {orders.length} ordem(ns) registrada(s) • {metrics.totalQty.toLocaleString("pt-BR")} peças no total
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => navigate("/mockup/service-orders")}>
          Ver Todas <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statusCards.map(({ key, icon }, i) => {
            const cfg = STATUS_CONFIG[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden rounded-xl border border-border bg-card p-5 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate("/mockup/service-orders")}
              >
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full ${cfg.bg} opacity-50`} />
                <div className={`${cfg.color} mb-2`}>{icon}</div>
                <p className="text-3xl font-bold text-foreground">{metrics.byStatus[key]}</p>
                <p className="text-xs text-muted-foreground mt-1">{cfg.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-primary" />
              Distribuição por Status
            </h2>
            {metrics.statusPieData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">Nenhuma OS registrada</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={metrics.statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {metrics.statusPieData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status as OsStatus]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Technique Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-5 lg:col-span-2"
          >
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-primary" />
              OS por Técnica de Gravação
            </h2>
            {metrics.techniqueBarData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">Nenhuma OS registrada</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={metrics.techniqueBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Ordens" radius={[0, 4, 4, 0]} barSize={18}>
                    {metrics.techniqueBarData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        {/* Monthly Trend + Deliveries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              Evolução Mensal (6 meses)
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics.monthlyTrend} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                <Line type="monotone" dataKey="concluidas" name="Concluídas" stroke="hsl(155, 60%, 45%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(155, 60%, 45%)" }} />
                <Legend formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Deliveries + Overdue */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card rounded-xl border border-border p-5"
            >
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                Entregas do Mês
              </h2>
              {metrics.deliveriesThisMonth.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma entrega programada</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {metrics.deliveriesThisMonth.map((o) => {
                    const cfg = STATUS_CONFIG[o.status];
                    return (
                      <div
                        key={o.id}
                        className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/mockup/service-order?edit=${o.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{o.productName}</p>
                          <p className="text-[10px] text-muted-foreground">{o.clientName} • {o.deliveryDate}</p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {metrics.deliveriesThisMonth.length} entrega(s)
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`rounded-xl border p-5 ${
                metrics.overdue.length > 0 ? "bg-destructive/5 border-destructive/20" : "bg-card border-border"
              }`}
            >
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-destructive" />
                Entregas Atrasadas
              </h2>
              {metrics.overdue.length === 0 ? (
                <p className="text-xs text-emerald-400 text-center py-2">✓ Nenhuma entrega atrasada</p>
              ) : (
                <div className="space-y-2">
                  {metrics.overdue.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between bg-destructive/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-destructive/15 transition-colors"
                      onClick={() => navigate(`/mockup/service-order?edit=${o.id}`)}
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">{o.productName}</p>
                        <p className="text-[10px] text-destructive">{o.clientName} • Entrega: {o.deliveryDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2 text-center font-mono">
                {metrics.overdue.length} atrasada(s)
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceOrderDashboard;
