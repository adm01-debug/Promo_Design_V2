import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Image, Sparkles, Clock, Video, Film, Palette, Camera, FolderOpen, ClipboardList, BarChart3 } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import MockupListItem from "@/components/MockupListItem";
import EmptyState from "@/components/EmptyState";
import { LayoutPopover } from "@/components/LayoutPopover";
import { getDefaultColumns, type ColumnCount } from "@/components/ColumnSelector";
import { useCountUp } from "@/hooks/use-count-up";
import { useServiceOrders, STATUS_CONFIG } from "@/hooks/use-service-orders";
import { useMagicUpHistory } from "@/hooks/use-magicup-history";
import heroMockup from "@/assets/hero-mockup.jpg";
import mockupPhone from "@/assets/mockup-phone.jpg";
import mockupLaptop from "@/assets/mockup-laptop.jpg";
import mockupCard from "@/assets/mockup-card.jpg";
import mockupTshirt from "@/assets/mockup-tshirt.jpg";
import mockupSocial from "@/assets/mockup-social.jpg";

const quickActions = [
  { title: "Novo Mockup", description: "Layout técnico de personalização", icon: Image, path: "/mockup/new", color: "text-primary", bg: "bg-primary/10" },
  { title: "Magic Up", description: "Imagem publicitária com IA", icon: Sparkles, path: "/magicup/generate", color: "text-secondary", bg: "bg-secondary/10" },
  { title: "Nova OS", description: "Ordem de serviço", icon: ClipboardList, path: "/mockup/service-order", color: "text-accent", bg: "bg-accent/10" },
  { title: "Dashboard OS", description: "Métricas de produção", icon: BarChart3, path: "/mockup/service-dashboard", color: "text-primary", bg: "bg-primary/10" },
  { title: "Cinema Mode", description: "Color grading cinematográfico", icon: Film, path: "/video/cinema", color: "text-secondary", bg: "bg-secondary/10" },
  { title: "Novo Vídeo", description: "Vídeo publicitário animado", icon: Video, path: "/video/new", color: "text-accent", bg: "bg-accent/10" },
];

const fallbackProjects = [
  { title: "Camiseta Polo Premium", category: "Vestuário", thumbnail: mockupTshirt, lastEdited: "2h atrás", views: 45 },
  { title: "iPhone 15 Pro Case", category: "Mobile", thumbnail: mockupPhone, lastEdited: "5h atrás", views: 32 },
  { title: "Post Instagram Feed", category: "Social Media", thumbnail: mockupSocial, lastEdited: "1d atrás", views: 78 },
  { title: "MacBook Workspace", category: "Web", thumbnail: mockupLaptop, lastEdited: "2d atrás", views: 19 },
  { title: "Cartão Corporativo", category: "Print", thumbnail: mockupCard, lastEdited: "3d atrás", views: 56 },
  { title: "Banner Campanha", category: "Social Media", thumbnail: heroMockup, lastEdited: "4d atrás", views: 112 },
];

const columnClasses: Record<number, string> = {
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
};

const headingWords = ["Bem-vindo", "ao"];

const StatCard = ({ label, value, icon: Icon, change, index }: { label: string; value: number; icon: any; change: string; index: number }) => {
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
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-bold text-foreground font-display tabular-nums">{count}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </div>
      <p className="text-[9px] sm:text-[10px] text-primary/70 mt-2 font-medium">{change}</p>
    </motion.div>
  );
};

const Dashboard = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const { orders } = useServiceOrders();
  const { items: magicUpItems } = useMagicUpHistory();

  const stats = useMemo(() => {
    const abertas = orders.filter((o) => o.status === "aberta").length;
    const producao = orders.filter((o) => o.status === "em_producao").length;
    const concluidas = orders.filter((o) => o.status === "concluida").length;

    return [
      { label: "Ordens de Serviço", value: orders.length, icon: ClipboardList, change: `${abertas} abertas` },
      { label: "Em Produção", value: producao, icon: Clock, change: `${concluidas} concluídas` },
      { label: "Imagens IA", value: magicUpItems.length, icon: Sparkles, change: `${magicUpItems.filter((i) => i.favorite).length} favoritas` },
      { label: "Rascunhos", value: 0, icon: FolderOpen, change: "Sem rascunhos" },
    ];
  }, [orders, magicUpItems]);

  // Build recent activity from real service orders
  const recentProjects = useMemo(() => {
    if (orders.length === 0) return fallbackProjects;
    return orders.slice(0, 6).map((o) => ({
      title: `OS ${o.osNumber} - ${o.productName}`,
      category: o.technique,
      thumbnail: o.mockupImageUrl || heroMockup,
      lastEdited: new Date(o.updatedAt).toLocaleDateString("pt-BR"),
      views: parseInt(o.quantity) || 0,
    }));
  }, [orders]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex flex-wrap items-center gap-1.5">
          {headingWords.map((word, i) => (
            <motion.span key={word} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}>
              {word}
            </motion.span>
          ))}
          <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-primary">
            Promo Design
          </motion.span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Sistema de Criação para o Time de Artes</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} index={i} />
        ))}
      </div>

      <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Ações Rápidas</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 sm:mb-8">
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

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {orders.length > 0 ? "Ordens Recentes" : "Projetos Recentes"}
        </h2>
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
  );
};

export default Dashboard;
