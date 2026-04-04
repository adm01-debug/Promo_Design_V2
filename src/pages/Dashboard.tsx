import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Clock, Video, Film, FolderOpen, ClipboardList, BarChart3, Image, Settings2, RotateCcw } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import ProjectCard from "@/components/ProjectCard";
import MockupListItem from "@/components/MockupListItem";
import EmptyState from "@/components/EmptyState";
import { LayoutPopover } from "@/components/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/ColumnSelector";
import { StatCardSkeleton } from "@/components/DashboardSkeleton";
import { useCountUp } from "@/hooks/use-count-up";
import { useServiceOrders } from "@/features/service-orders";
import { useMagicUpHistory } from "@/features/magic-up";
import { useMockupDrafts } from "@/features/mockup";
import { useAuth } from "@/hooks/use-auth";
import MiniSparkline from "@/components/MiniSparkline";
import DashboardWidgetWrapper from "@/components/DashboardWidgetWrapper";
import { useWidgetLayout, type WidgetId } from "@/hooks/use-widget-layout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import heroMockup from "@/assets/hero-mockup.jpg";
import mockupCard from "@/assets/mockup-card.jpg";
import mockupSocial from "@/assets/mockup-social.jpg";
import { Button } from "@/components/ui/button";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Constants ────────────────────────────────────────────────────────

const quickActions = [
  { title: "Novo Mockup", description: "Layout técnico de personalização", icon: Image, path: "/mockup/new", color: "text-primary", bg: "bg-primary/10" },
  { title: "Magic Up", description: "Imagem publicitária com IA", icon: Sparkles, path: "/magicup/generate", color: "text-secondary", bg: "bg-secondary/10" },
  { title: "Nova OS", description: "Ordem de serviço", icon: ClipboardList, path: "/mockup/service-order", color: "text-accent", bg: "bg-accent/10" },
  { title: "Dashboard OS", description: "Métricas de produção", icon: BarChart3, path: "/mockup/service-dashboard", color: "text-primary", bg: "bg-primary/10" },
  { title: "Cinema Mode", description: "Color grading cinematográfico", icon: Film, path: "/video/cinema", color: "text-secondary", bg: "bg-secondary/10" },
  { title: "Novo Vídeo", description: "Vídeo publicitário animado", icon: Video, path: "/video/new", color: "text-accent", bg: "bg-accent/10" },
];

const columnClasses: Record<number, string> = {
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
};

// ─── Helpers ──────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function getUserFirstName(email?: string): string {
  if (!email) return "";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1).split(/[._-]/)[0];
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return date.toLocaleDateString("pt-BR");
}

function buildWeeklyActivity(
  orders: { createdAt: string }[],
  drafts: { createdAt: string }[],
  magicUp: { createdAt: string }[],
) {
  const weeks: { label: string; os: number; mockups: number; ia: number }[] = [];
  const now = new Date();
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const inRange = (d: string) => {
      const date = new Date(d);
      return date >= weekStart && date < weekEnd;
    };
    const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
    weeks.push({
      label,
      os: orders.filter((o) => inRange(o.createdAt)).length,
      mockups: drafts.filter((d) => inRange(d.createdAt)).length,
      ia: magicUp.filter((m) => inRange(m.createdAt)).length,
    });
  }
  return weeks;
}

// ─── Sub-components ───────────────────────────────────────────────────

const StatCard = ({ label, value, icon: Icon, change, index, sparkData }: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; change: string; index: number; sparkData?: number[] }) => {
  const count = useCountUp(value, 1200, index * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-3 sm:p-4 rounded-xl bg-card border border-border"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xl sm:text-2xl font-bold text-foreground font-display tabular-nums">{count}</p>
            {sparkData && <MiniSparkline data={sparkData} />}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </div>
      <p className="text-[9px] sm:text-[10px] text-primary/70 mt-2 font-medium">{change}</p>
    </motion.div>
  );
};

// ─── Widget renderers ─────────────────────────────────────────────────

interface WidgetProps {
  stats: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; change: string; sparkData: number[] }[];
  isLoading: boolean;
  weeklyData: { label: string; os: number; mockups: number; ia: number }[];
  hasActivity: boolean;
  recentProjects: { title: string; category: string; thumbnail: string; lastEdited: string; views: number; path?: string }[];
  viewMode: "grid" | "list";
  setViewMode: (v: "grid" | "list") => void;
  gridColumns: ColumnCount;
  setGridColumns: (c: ColumnCount) => void;
}

const WIDGET_RENDERERS: Record<WidgetId, (props: WidgetProps) => React.ReactNode> = {
  stats: ({ stats, isLoading }) => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8" role="region" aria-label="Métricas do sistema" aria-live="polite">
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        : stats.map((stat, i) => <StatCard key={stat.label} {...stat} index={i} />)}
    </div>
  ),

  "quick-actions": () => (
    <div className="mb-6 sm:mb-8">
      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Ações Rápidas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.03 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              to={action.path}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-glow transition-all group text-center"
            >
              <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">{action.title}</h3>
                <p className="text-[9px] text-muted-foreground mt-0.5 hidden sm:block">{action.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  ),

  "activity-chart": ({ weeklyData, hasActivity }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-6 sm:mb-8 rounded-xl bg-card border border-border p-4"
    >
      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">Atividade Semanal</h2>
      {hasActivity ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={24} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 11,
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar dataKey="os" name="Ordens" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="mockups" name="Mockups" fill="hsl(var(--secondary))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="ia" name="Magic Up" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <BarChart3 className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-xs">Crie mockups, ordens ou imagens para ver sua atividade aqui</p>
        </div>
      )}
    </motion.div>
  ),

  "recent-projects": ({ recentProjects, viewMode, setViewMode, gridColumns, setGridColumns }) => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Projetos Recentes</h2>
        <LayoutPopover viewMode={viewMode} setViewMode={setViewMode} gridColumns={gridColumns} setGridColumns={setGridColumns} />
      </div>
      {recentProjects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum projeto recente"
          description="Comece agora e crie seu primeiro mockup profissional para produção."
          actionLabel="Criar primeiro mockup"
          actionPath="/mockup/new"
        />
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === "grid" ? (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className={`grid ${columnClasses[gridColumns] || columnClasses[4]} gap-3 sm:gap-4`}>
              {recentProjects.map((project, i) => (
                <ProjectCard key={project.title + i} {...project} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-3">
              {recentProjects.map((project, i) => (
                <MockupListItem key={project.title + i} {...project} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  ),
};

// ─── Main component ───────────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [isEditing, setIsEditing] = useState(false);
  const { orders, isLoading: ordersLoading } = useServiceOrders();
  const { items: magicUpItems } = useMagicUpHistory();
  const { drafts, isLoading: draftsLoading } = useMockupDrafts();
  const { widgetOrder, updateOrder, resetOrder, isDefault } = useWidgetLayout();

  const greeting = getGreeting();
  const firstName = getUserFirstName(user?.email ?? undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIdx = widgetOrder.indexOf(active.id as WidgetId);
        const newIdx = widgetOrder.indexOf(over.id as WidgetId);
        updateOrder(arrayMove(widgetOrder, oldIdx, newIdx));
      }
    },
    [widgetOrder, updateOrder],
  );

  const weeklyData = useMemo(() => {
    return buildWeeklyActivity(
      orders.map((o) => ({ createdAt: o.createdAt })),
      (drafts || []).map((d) => ({ createdAt: d.createdAt })),
      magicUpItems.map((m) => ({ createdAt: m.createdAt })),
    );
  }, [orders, drafts, magicUpItems]);

  const stats = useMemo(() => {
    const abertas = orders.filter((o) => o.status === "aberta").length;
    const producao = orders.filter((o) => o.status === "em_producao").length;
    const concluidas = orders.filter((o) => o.status === "concluida").length;
    const draftCount = drafts?.length || 0;
    const weeklyOs = weeklyData.map((w) => w.os);
    const weeklyMockups = weeklyData.map((w) => w.mockups);
    const weeklyIa = weeklyData.map((w) => w.ia);
    return [
      { label: "Ordens de Serviço", value: orders.length, icon: ClipboardList, change: `${abertas} abertas`, sparkData: weeklyOs },
      { label: "Em Produção", value: producao, icon: Clock, change: `${concluidas} concluídas`, sparkData: weeklyOs },
      { label: "Imagens IA", value: magicUpItems.length, icon: Sparkles, change: `${magicUpItems.filter((i) => i.favorite).length} favoritas`, sparkData: weeklyIa },
      { label: "Rascunhos", value: draftCount, icon: FolderOpen, change: draftCount > 0 ? `${draftCount} salvos` : "Sem rascunhos", sparkData: weeklyMockups },
    ];
  }, [orders, magicUpItems, drafts, weeklyData]);

  const isLoading = ordersLoading || draftsLoading;
  const hasActivity = weeklyData.some((w) => w.os + w.mockups + w.ia > 0);

  const recentProjects = useMemo(() => {
    type RecentItem = { title: string; category: string; thumbnail: string; lastEdited: string; views: number; path?: string; _sortDate: string };
    const items: RecentItem[] = [];
    (drafts || []).slice(0, 4).forEach((d) => {
      items.push({ title: d.name, category: "Mockup", thumbnail: d.thumbnailUrl || heroMockup, lastEdited: formatRelativeDate(d.updatedAt), views: 0, path: `/mockup/new?draft=${d.id}`, _sortDate: d.updatedAt });
    });
    orders.slice(0, 4).forEach((o) => {
      items.push({ title: `OS ${o.osNumber} — ${o.productName}`, category: o.technique, thumbnail: o.mockupImageUrl || mockupCard, lastEdited: formatRelativeDate(o.updatedAt), views: parseInt(String(o.quantity)) || 0, path: `/mockup/service-order?edit=${o.id}`, _sortDate: o.updatedAt });
    });
    magicUpItems.slice(0, 4).forEach((m) => {
      items.push({ title: m.productName || m.prompt.slice(0, 40), category: "Magic Up", thumbnail: m.imageUrl || mockupSocial, lastEdited: formatRelativeDate(m.createdAt), views: 0, path: `/magicup/history`, _sortDate: m.createdAt });
    });
    items.sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime());
    return items.slice(0, 6);
  }, [drafts, orders, magicUpItems]);

  const widgetProps: WidgetProps = {
    stats, isLoading, weeklyData, hasActivity, recentProjects,
    viewMode, setViewMode, gridColumns, setGridColumns,
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex flex-wrap items-center gap-1.5">
            <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {greeting}{firstName ? "," : "!"}
            </motion.span>
            {firstName && (
              <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary">
                {firstName}
              </motion.span>
            )}
            <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-muted-foreground font-normal text-base sm:text-lg">
              👋
            </motion.span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Sistema de Criação para o Time de Artes</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditing && !isDefault && (
            <UITooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetOrder}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Restaurar layout padrão"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restaurar layout padrão</TooltipContent>
            </UITooltip>
          )}

          <UITooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                aria-label={isEditing ? "Concluir edição do layout" : "Personalizar layout"}
                className={isEditing ? "bg-primary text-primary-foreground" : ""}
              >
                <Settings2 className="w-4 h-4 mr-1.5" />
                <span className="text-xs hidden sm:inline">{isEditing ? "Concluir" : "Personalizar"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isEditing ? "Salvar e sair do modo de edição" : "Arrastar widgets para reorganizar"}</TooltipContent>
          </UITooltip>
        </div>
      </motion.div>

      {/* Edit mode banner */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
              <Settings2 className="w-4 h-4 shrink-0" />
              <span>Arraste os widgets pelas alças <strong>⠿</strong> para reorganizar o dashboard</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sortable widgets */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-0">
            {widgetOrder.map((widgetId) => (
              <DashboardWidgetWrapper key={widgetId} id={widgetId} isEditing={isEditing}>
                {WIDGET_RENDERERS[widgetId](widgetProps)}
              </DashboardWidgetWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default Dashboard;
