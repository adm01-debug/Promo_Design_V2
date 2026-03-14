import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useServiceOrders, STATUS_CONFIG, type OsStatus } from "@/hooks/use-service-orders";
import {
  BarChart3, ClipboardList, TrendingUp, Calendar, ArrowRight,
  FileText, Package, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ServiceOrderDashboard = () => {
  const { orders } = useServiceOrders();
  const navigate = useNavigate();

  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Status counts
    const byStatus: Record<OsStatus, number> = {
      aberta: 0,
      em_producao: 0,
      concluida: 0,
      cancelada: 0,
    };
    orders.forEach((o) => { byStatus[o.status]++; });

    // By technique
    const byTechnique: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.technique) {
        byTechnique[o.technique] = (byTechnique[o.technique] || 0) + 1;
      }
    });
    const techniqueEntries = Object.entries(byTechnique)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const maxTechCount = techniqueEntries.length > 0 ? techniqueEntries[0][1] : 1;

    // Deliveries this month
    const deliveriesThisMonth = orders.filter((o) => {
      if (!o.deliveryDate) return false;
      const d = new Date(o.deliveryDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Overdue (delivery date passed, not concluded/cancelled)
    const overdue = orders.filter((o) => {
      if (!o.deliveryDate || o.status === "concluida" || o.status === "cancelada") return false;
      return new Date(o.deliveryDate) < now;
    });

    // Total quantity
    const totalQty = orders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);

    return { byStatus, techniqueEntries, maxTechCount, deliveriesThisMonth, overdue, totalQty };
  }, [orders]);

  const statusCards: { key: OsStatus; icon: React.ReactNode }[] = [
    { key: "aberta", icon: <FileText className="w-5 h-5" /> },
    { key: "em_producao", icon: <Clock className="w-5 h-5" /> },
    { key: "concluida", icon: <TrendingUp className="w-5 h-5" /> },
    { key: "cancelada", icon: <Package className="w-5 h-5" /> },
  ];

  const techniqueColors = [
    "bg-emerald-500", "bg-cyan-500", "bg-amber-500", "bg-rose-500",
    "bg-violet-500", "bg-blue-500", "bg-orange-500", "bg-pink-500",
  ];

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
                className={`relative overflow-hidden rounded-xl border border-border bg-card p-5 cursor-pointer hover:border-primary/40 transition-colors`}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Technique Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-5"
          >
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-primary" />
              OS por Técnica de Gravação
            </h2>
            {metrics.techniqueEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma OS registrada ainda</p>
            ) : (
              <div className="space-y-3">
                {metrics.techniqueEntries.map(([name, count], i) => (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[200px]">{name}</span>
                      <span className="font-mono font-semibold text-foreground">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / metrics.maxTechCount) * 100}%` }}
                        transition={{ delay: 0.4 + i * 0.05, duration: 0.5 }}
                        className={`h-full rounded-full ${techniqueColors[i % techniqueColors.length]}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Deliveries this month + Overdue */}
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
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma entrega programada para este mês</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
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
                {metrics.deliveriesThisMonth.length} entrega(s) programada(s)
              </p>
            </motion.div>

            {/* Overdue */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`rounded-xl border p-5 ${
                metrics.overdue.length > 0
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-card border-border"
              }`}
            >
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-red-400" />
                Entregas Atrasadas
              </h2>
              {metrics.overdue.length === 0 ? (
                <p className="text-xs text-emerald-400 text-center py-2">✓ Nenhuma entrega atrasada</p>
              ) : (
                <div className="space-y-2">
                  {metrics.overdue.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between bg-red-500/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-red-500/15 transition-colors"
                      onClick={() => navigate(`/mockup/service-order?edit=${o.id}`)}
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">{o.productName}</p>
                        <p className="text-[10px] text-red-400">{o.clientName} • Entrega: {o.deliveryDate}</p>
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
