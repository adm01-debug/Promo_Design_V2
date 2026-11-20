import { useCallback } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  CalendarDays,
  Eye,
  EyeOff,
  Flame,
  FolderOpen,
  LayoutDashboard,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWidgetLayout, type WidgetId } from "@/hooks/use-widget-layout";

const WIDGET_META: Record<WidgetId, { label: string; description: string; icon: React.ReactNode }> =
  {
    stats: {
      label: "Estatísticas",
      description: "Resumo das métricas do sistema",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    "quick-actions": {
      label: "Ações rápidas",
      description: "Atalhos para as principais ações",
      icon: <Flame className="w-5 h-5" />,
    },
    "activity-chart": {
      label: "Atividade recente",
      description: "Gráfico de atividade semanal",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    heatmap: {
      label: "Mapa de calor",
      description: "Distribuição de atividade por dia e hora",
      icon: <CalendarDays className="w-5 h-5" />,
    },
    "recent-projects": {
      label: "Projetos recentes",
      description: "Seus projetos e artes mais recentes",
      icon: <FolderOpen className="w-5 h-5" />,
    },
  };

const DashboardWidgetsPage = () => {
  const {
    widgetOrder,
    hiddenWidgets,
    updateOrder,
    toggleHidden,
    replaceHidden,
    resetOrder,
    isDefault,
  } = useWidgetLayout();

  const visibleCount = widgetOrder.filter((id) => !hiddenWidgets.includes(id)).length;

  const move = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= widgetOrder.length) return;
      const next = [...widgetOrder];
      [next[index], next[target]] = [next[target], next[index]];
      updateOrder(next);
    },
    [widgetOrder, updateOrder],
  );

  const toggleVisibility = useCallback(
    (id: WidgetId) => {
      toggleHidden(id);
    },
    [toggleHidden],
  );

  const handleReset = useCallback(() => {
    resetOrder();
    toast.success("Layout restaurado ao padrão");
  }, [resetOrder]);

  const handleShowAll = useCallback(() => {
    replaceHidden([]);
    toast.success("Todos os widgets visíveis");
  }, [replaceHidden]);

  return (
    <div className="container mx-auto max-w-3xl py-6 sm:py-10 px-4 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Widgets do Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Escolha quais widgets aparecem no seu dashboard e a ordem em que são exibidos.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Layout do dashboard</CardTitle>
          <CardDescription>
            {visibleCount} de {widgetOrder.length} widgets visíveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1">
            {widgetOrder.map((id, index) => {
              const meta = WIDGET_META[id];
              const hidden = hiddenWidgets.includes(id);
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 py-2.5 rounded-lg px-2 hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="shrink-0 w-10 h-10 grid place-items-center rounded-lg bg-muted text-muted-foreground"
                    aria-hidden="true"
                  >
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{meta.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{meta.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Mover ${meta.label} para cima`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => move(index, 1)}
                      disabled={index === widgetOrder.length - 1}
                      aria-label={`Mover ${meta.label} para baixo`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <Switch
                    checked={!hidden}
                    onCheckedChange={() => toggleVisibility(id)}
                    aria-label={hidden ? `Mostrar ${meta.label}` : `Ocultar ${meta.label}`}
                  />
                  <span className="sr-only">{hidden ? "Oculto" : "Visível"}</span>
                </li>
              );
            })}
          </ul>

          <Separator className="my-4" />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isDefault}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar padrão
            </Button>
            {hiddenWidgets.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleShowAll}>
                <Eye className="w-4 h-4 mr-2" />
                Mostrar todos
              </Button>
            )}
            <p className="text-xs text-muted-foreground ml-auto flex items-center gap-1.5">
              {hiddenWidgets.length > 0 ? (
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              As mudanças são salvas automaticamente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardWidgetsPage;
