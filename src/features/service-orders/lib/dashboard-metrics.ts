/**
 * Pure metric aggregators for the Service Order dashboard.
 *
 * Extracted from `ServiceOrderDashboard.tsx` so the transformations
 * (status counts, technique breakdown, monthly trend, overdue detection)
 * can be regression-tested without mounting Recharts or Framer Motion.
 */
import { STATUS_CONFIG, type OsStatus, type StoredServiceOrder } from "../hooks/use-service-orders";

export interface MonthlyTrendPoint {
  month: string;
  total: number;
  concluidas: number;
  [key: string]: string | number;
}

export interface TechniqueBar {
  name: string;
  fullName: string;
  count: number;
  [key: string]: string | number;
}

export interface StatusPieSlice {
  name: string;
  value: number;
  status: OsStatus;
  [key: string]: string | number;
}

export interface DashboardMetrics {
  byStatus: Record<OsStatus, number>;
  techniqueBarData: TechniqueBar[];
  deliveriesThisMonth: StoredServiceOrder[];
  overdue: StoredServiceOrder[];
  totalQty: number;
  monthlyTrend: MonthlyTrendPoint[];
  statusPieData: StatusPieSlice[];
}

/**
 * Compute every dashboard metric. `reference` (defaults to `new Date()`)
 * anchors the "this month" and "overdue" windows so tests are deterministic.
 */
export function computeDashboardMetrics(
  orders: readonly StoredServiceOrder[],
  reference: Date = new Date(),
): DashboardMetrics {
  const currentMonth = reference.getMonth();
  const currentYear = reference.getFullYear();

  const byStatus: Record<OsStatus, number> = {
    aberta: 0,
    aprovada: 0,
    em_producao: 0,
    pronta: 0,
    entregue: 0,
    concluida: 0,
    cancelada: 0,
  };
  orders.forEach((o) => {
    byStatus[o.status]++;
  });

  const byTechnique: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.technique) byTechnique[o.technique] = (byTechnique[o.technique] || 0) + 1;
  });
  const techniqueEntries = Object.entries(byTechnique)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const deliveriesThisMonth = orders.filter((o) => {
    if (!o.deliveryDate) return false;
    const d = new Date(o.deliveryDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const overdue = orders.filter((o) => {
    if (!o.deliveryDate || o.status === "concluida" || o.status === "cancelada") return false;
    return new Date(o.deliveryDate) < reference;
  });

  const totalQty = orders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);

  const monthlyTrend: MonthlyTrendPoint[] = [];
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

  const statusPieData: StatusPieSlice[] = (Object.entries(byStatus) as [OsStatus, number][])
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: STATUS_CONFIG[key].label, value, status: key }));

  const techniqueBarData: TechniqueBar[] = techniqueEntries.map(([name, count]) => ({
    name: name.length > 18 ? name.slice(0, 16) + "…" : name,
    fullName: name,
    count,
  }));

  return {
    byStatus,
    techniqueBarData,
    deliveriesThisMonth,
    overdue,
    totalQty,
    monthlyTrend,
    statusPieData,
  };
}
