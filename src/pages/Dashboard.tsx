import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, ClipboardList, Sparkles, Clock, Settings2, RotateCcw, Building2, Check, Loader2 } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { getDefaultColumns, type ColumnCount } from "@/components/ColumnSelector";
import { useServiceOrders } from "@/features/service-orders";
import { useMagicUpHistory } from "@/features/magic-up";
import { useMockupDrafts } from "@/features/mockup";
import { useAuth } from "@/hooks/use-auth";
import DashboardWidgetWrapper from "@/components/DashboardWidgetWrapper";
import { useWidgetLayout, type WidgetId } from "@/hooks/use-widget-layout";
import { useOrganizationInvites } from "@/features/organization/hooks/use-invites";
import heroMockup from "@/assets/hero-mockup.jpg";
import mockupCard from "@/assets/mockup-card.jpg";
import mockupSocial from "@/assets/mockup-social.jpg";
import { Button } from "@/components/ui/button";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getGreeting, getUserFirstName, formatRelativeDate,
  buildWeeklyActivity, buildMonthlyHeatmap,
  WIDGET_RENDERERS, type WidgetProps,
} from "@/components/DashboardWidgets";

const Dashboard = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [isEditing, setIsEditing] = useState(false);
  const { orders, isLoading: ordersLoading } = useServiceOrders();
  const { items: magicUpItems } = useMagicUpHistory();
  const { drafts, isLoading: draftsLoading } = useMockupDrafts();
  const { widgetOrder, updateOrder, resetOrder, isDefault } = useWidgetLayout();
  const { invites, acceptInvite } = useOrganizationInvites(null); // Fetch all invites for current user email
  
  const userInvites = useMemo(() => {
    if (!user?.email) return [];
    return invites.filter(i => i.email.toLowerCase() === user.email?.toLowerCase() && !i.accepted_at);
  }, [invites, user?.email]);

  const greeting = getGreeting();
  const firstName = getUserFirstName(user?.email ?? undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = widgetOrder.indexOf(active.id as WidgetId);
      const newIdx = widgetOrder.indexOf(over.id as WidgetId);
      updateOrder(arrayMove(widgetOrder, oldIdx, newIdx));
    }
  }, [widgetOrder, updateOrder]);

  const weeklyData = useMemo(() => buildWeeklyActivity(
    orders.map((o) => ({ createdAt: o.createdAt })),
    (drafts || []).map((d) => ({ createdAt: d.createdAt })),
    magicUpItems.map((m) => ({ createdAt: m.createdAt })),
  ), [orders, drafts, magicUpItems]);

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
    (drafts || []).slice(0, 4).forEach((d) => { items.push({ title: d.name, category: "Mockup", thumbnail: d.thumbnailUrl || heroMockup, lastEdited: formatRelativeDate(d.updatedAt), views: 0, path: `/mockup/new?draft=${d.id}`, _sortDate: d.updatedAt }); });
    orders.slice(0, 4).forEach((o) => { items.push({ title: `OS ${o.osNumber} — ${o.productName}`, category: o.technique, thumbnail: o.mockupImageUrl || mockupCard, lastEdited: formatRelativeDate(o.updatedAt), views: parseInt(String(o.quantity)) || 0, path: `/mockup/service-order?edit=${o.id}`, _sortDate: o.updatedAt }); });
    magicUpItems.slice(0, 4).forEach((m) => { items.push({ title: m.productName || m.prompt.slice(0, 40), category: "Magic Up", thumbnail: m.imageUrl || mockupSocial, lastEdited: formatRelativeDate(m.createdAt), views: 0, path: `/magicup/history`, _sortDate: m.createdAt }); });
    items.sort((a, b) => new Date(b._sortDate).getTime() - new Date(a._sortDate).getTime());
    return items.slice(0, 6);
  }, [drafts, orders, magicUpItems]);

  const heatmapData = useMemo(() => buildMonthlyHeatmap(
    orders.map((o) => ({ createdAt: o.createdAt })),
    (drafts || []).map((d) => ({ createdAt: d.createdAt })),
    magicUpItems.map((m) => ({ createdAt: m.createdAt })),
  ), [orders, drafts, magicUpItems]);

  const widgetProps: WidgetProps = { stats, isLoading, weeklyData, hasActivity, heatmapData, recentProjects, viewMode, setViewMode, gridColumns, setGridColumns };

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8 flex items-start justify-between">
        <div data-tour="greeting" className="flex-1">
          {userInvites.length > 0 && (
            <div className="mb-6 space-y-3">
              {userInvites.map(inv => (
                <motion.div 
                  key={inv.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Convite de Organização</p>
                      <p className="text-xs text-muted-foreground">Você foi convidado para participar de uma nova organização.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button 
                      size="sm" 
                      className="flex-1 sm:flex-none gap-1.5"
                      onClick={() => acceptInvite.mutate(inv.token)}
                      disabled={acceptInvite.isPending}
                    >
                      {acceptInvite.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Aceitar Convite
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex flex-wrap items-center gap-1.5">
            <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{greeting}{firstName ? "," : "!"}</motion.span>
            {firstName && <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary">{firstName}</motion.span>}
            <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-muted-foreground font-normal text-base sm:text-lg">👋</motion.span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Sistema de Criação para o Time de Artes</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing && !isDefault && (
            <UITooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={resetOrder} className="text-muted-foreground hover:text-foreground" aria-label="Restaurar layout padrão"><RotateCcw className="w-4 h-4" /></Button></TooltipTrigger><TooltipContent>Restaurar layout padrão</TooltipContent></UITooltip>
          )}
          <UITooltip>
            <TooltipTrigger asChild>
              <Button variant={isEditing ? "default" : "outline"} size="sm" onClick={() => setIsEditing(!isEditing)} aria-label={isEditing ? "Concluir edição do layout" : "Personalizar layout"} className={isEditing ? "bg-primary text-primary-foreground" : ""} data-tour="customize">
                <Settings2 className="w-4 h-4 mr-1.5" /><span className="text-xs hidden sm:inline">{isEditing ? "Concluir" : "Personalizar"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isEditing ? "Salvar e sair do modo de edição" : "Arrastar widgets para reorganizar"}</TooltipContent>
          </UITooltip>
        </div>
      </motion.div>

      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
              <Settings2 className="w-4 h-4 shrink-0" /><span>Arraste os widgets pelas alças <strong>⠿</strong> para reorganizar o dashboard</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
