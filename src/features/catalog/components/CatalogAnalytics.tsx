import { useMemo } from "react";
import { motion } from "framer-motion";
import { Tag, Package } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { CatalogProduct } from "@/features/catalog";

const CHART_COLORS = ["hsl(190, 95%, 55%)", "hsl(260, 60%, 60%)", "hsl(330, 80%, 60%)", "hsl(38, 92%, 50%)", "hsl(152, 60%, 45%)", "hsl(210, 65%, 55%)"];

interface CatalogAnalyticsProps {
  products: CatalogProduct[];
  categories: { id: string; name: string }[];
}

const CatalogAnalytics = ({ products, categories }: CatalogAnalyticsProps) => {
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => { const cat = p.categoryName || "Sem categoria"; map[cat] = (map[cat] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [products]);

  const materialChartData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => { if (p.material) map[p.material] = (map[p.material] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
  }, [products]);

  const activeCount = products.filter((p) => p.active).length;
  const inactiveCount = products.length - activeCount;

  if (products.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-2xl font-bold text-foreground">{products.length}</p><p className="text-xs text-muted-foreground">Total de Produtos</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-2xl font-bold text-foreground">{activeCount}</p><p className="text-xs text-muted-foreground">Ativos</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-2xl font-bold text-foreground">{inactiveCount}</p><p className="text-xs text-muted-foreground">Inativos</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-2xl font-bold text-foreground">{categories.length}</p><p className="text-xs text-muted-foreground">Categorias</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryChartData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Produtos por Categoria</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart><Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">{categoryChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} /></PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">{categoryChartData.map((d, i) => <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />{d.name} ({d.value})</span>)}</div>
          </div>
        )}
        {materialChartData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Produtos por Material</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={materialChartData} layout="vertical" margin={{ left: 10, right: 20 }}><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} /><Bar dataKey="count" name="Produtos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} /></BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CatalogAnalytics;
