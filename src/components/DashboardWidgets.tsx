import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Video,
  Film,
  FolderOpen,
  ClipboardList,
  BarChart3,
  Image,
  CalendarDays,
} from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import MockupListItem from "@/components/MockupListItem";
import EmptyState from "@/components/EmptyState";
import { LayoutPopover } from "@/components/LayoutPopover";
import type { ColumnCount } from "@/components/ColumnSelector";
import { StatCardSkeleton } from "@/components/DashboardSkeleton";
import { useCountUp } from "@/hooks/use-count-up";
import MiniSparkline from "@/components/MiniSparkline";
import type { WidgetId } from "@/hooks/use-widget-layout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Constants ────────────────────────────────────────────────────────

export const quickActions = [
  {
    title: "Novo Mockup",
    description: "Layout técnico de personalização",
    icon: Image,
    path: "/mockup/new",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    title: "Magic Up",
    description: "Imagem publicitária com IA",
    icon: Sparkles,
    path: "/magicup/generate",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    title: "Nova OS",
    description: "Ordem de serviço",
    icon: ClipboardList,
    path: "/mockup/service-order",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    title: "Dashboard OS",
    description: "Métricas de produção",
    icon: BarChart3,
    path: "/mockup/service-dashboard",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    title: "Cinema Mode",
    description: "Color grading cinematográfico",
    icon: Film,
    path: "/video/cinema",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    title: "Novo Vídeo",
    description: "Vídeo publicitário animado",
    icon: Video,
    path: "/video/new",
    color: "text-accent",
    bg: "bg-accent/10",
  },
];

export const columnClasses: Record<number, string> = {
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
};

// ─── Helpers ──────────────────────────────────────────────────────────

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function getUserFirstName(email?: string): string {
  if (!email) return "";
  const local = email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1).split(/[._-]/)[0];
}

export function formatRelativeDate(dateStr: string): string {
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

export function buildWeeklyActivity(
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

export function buildMonthlyHeatmap(
  orders: { createdAt: string }[],
  drafts: { createdAt: string }[],
  magicUp: { createdAt: string }[],
) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const allDates = [
    ...orders.map((o) => o.createdAt),
    ...drafts.map((d) => d.createdAt),
    ...magicUp.map((m) => m.createdAt),
  ];
  const countByDay: Record<number, number> = {};
  for (const d of allDates) {
    const date = new Date(d);
    if (date.getFullYear() === year && date.getMonth() === month) {
      const day = date.getDate();
      countByDay[day] = (countByDay[day] || 0) + 1;
    }
  }
  const days: { day: number; count: number; weekday: number; week: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = (firstDayOfWeek + d - 1) % 7;
    const week = Math.floor((firstDayOfWeek + d - 1) / 7);
    days.push({ day: d, count: countByDay[d] || 0, weekday: dayOfWeek, week });
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const monthName = new Date(year, month).toLocaleDateString("pt-BR", { month: "long" });
  return { days, maxCount, monthName, year, today: now.getDate(), firstDayOfWeek };
}

// ─── Sub-components ───────────────────────────────────────────────────

export const StatCard = ({
  label,
  value,
  icon: Icon,
  change,
  index,
  sparkData,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  change: string;
  index: number;
  sparkData?: number[];
}) => {
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
            <p className="text-xl sm:text-2xl font-bold text-foreground font-display tabular-nums">
              {count}
            </p>
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

export interface WidgetProps {
  stats: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    change: string;
    sparkData: number[];
  }[];
  isLoading: boolean;
  weeklyData: { label: string; os: number; mockups: number; ia: number }[];
  hasActivity: boolean;
  heatmapData: ReturnType<typeof buildMonthlyHeatmap>;
  recentProjects: {
    title: string;
    category: string;
    thumbnail: string;
    lastEdited: string;
    views: number;
    path?: string;
  }[];
  viewMode: "grid" | "list";
  setViewMode: (v: "grid" | "list") => void;
  gridColumns: ColumnCount;
  setGridColumns: (c: ColumnCount) => void;
}

export const WIDGET_RENDERERS: Record<WidgetId, (props: WidgetProps) => React.ReactNode> = {
  stats: ({ stats, isLoading }) => (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
      role="region"
      aria-label="Métricas do sistema"
      aria-live="polite"
      data-tour="stats"
    >
      {isLoading
        ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        : stats.map((stat, i) => <StatCard key={stat.label} {...stat} index={i} />)}
    </div>
  ),

  "quick-actions": () => (
    <div className="mb-6 sm:mb-8" data-tour="quick-actions">
      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
        Ações Rápidas
      </h2>
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
                <p className="text-[9px] text-muted-foreground mt-0.5 hidden sm:block">
                  {action.description}
                </p>
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
      data-tour="activity-chart"
    >
      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-4">
        Atividade Semanal
      </h2>
      {hasActivity ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
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
            <Bar
              dataKey="mockups"
              name="Mockups"
              fill="hsl(var(--secondary))"
              radius={[3, 3, 0, 0]}
            />
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

  heatmap: ({ heatmapData }) => {
    const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
    const { days, maxCount, monthName, year, today, firstDayOfWeek } = heatmapData;
    const totalWeeks = Math.ceil((firstDayOfWeek + days.length) / 7);
    const getIntensityClass = (count: number) => {
      if (count === 0) return "bg-muted/50";
      const ratio = count / maxCount;
      if (ratio <= 0.25) return "bg-primary/20";
      if (ratio <= 0.5) return "bg-primary/40";
      if (ratio <= 0.75) return "bg-primary/70";
      return "bg-primary";
    };
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-6 sm:mb-8 rounded-xl bg-card border border-border p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Atividade — {monthName} {year}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Menos</span>
            <div className="w-2.5 h-2.5 rounded-[3px] bg-muted/50" />
            <div className="w-2.5 h-2.5 rounded-[3px] bg-primary/20" />
            <div className="w-2.5 h-2.5 rounded-[3px] bg-primary/40" />
            <div className="w-2.5 h-2.5 rounded-[3px] bg-primary/70" />
            <div className="w-2.5 h-2.5 rounded-[3px] bg-primary" />
            <span>Mais</span>
          </div>
        </div>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 mr-1 pt-0">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="w-4 h-6 flex items-center justify-center text-[9px] text-muted-foreground font-mono"
              >
                {i % 2 === 1 ? label : ""}
              </div>
            ))}
          </div>
          {Array.from({ length: totalWeeks }).map((_, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1 flex-1">
              {Array.from({ length: 7 }).map((_, dayIdx) => {
                const dayNum = weekIdx * 7 + dayIdx - firstDayOfWeek + 1;
                const dayData = days.find((d) => d.day === dayNum);
                if (!dayData) return <div key={dayIdx} className="h-6 rounded-[3px]" />;
                return (
                  <UITooltip key={dayIdx}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: dayData.day * 0.01 }}
                        className={`h-6 rounded-[3px] cursor-default transition-colors ${getIntensityClass(dayData.count)} ${dayData.day === today ? "ring-1 ring-primary ring-offset-1 ring-offset-card" : ""}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <span className="font-semibold">
                        {dayData.day}/{monthName.slice(0, 3)}
                      </span>
                      {" — "}
                      {dayData.count === 0
                        ? "Sem atividade"
                        : `${dayData.count} atividade${dayData.count > 1 ? "s" : ""}`}
                    </TooltipContent>
                  </UITooltip>
                );
              })}
            </div>
          ))}
        </div>
      </motion.div>
    );
  },

  "recent-projects": ({ recentProjects, viewMode, setViewMode, gridColumns, setGridColumns }) => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Projetos Recentes
        </h2>
        <LayoutPopover
          viewMode={viewMode}
          setViewMode={setViewMode}
          gridColumns={gridColumns}
          setGridColumns={setGridColumns}
        />
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
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`grid ${columnClasses[gridColumns] || columnClasses[4]} gap-3 sm:gap-4`}
            >
              {recentProjects.map((project, i) => (
                <ProjectCard key={project.title + i} {...project} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
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
