import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "react-router-dom";
import { useServiceOrders } from "@/features/service-orders";
import { motion, AnimatePresence } from "framer-motion";

import {
  Layers,
  Image,
  Sparkles,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Palette,
  Wand2,
  BookOpen,
  Video,
  Film,
  Camera,
  Eye,
  User,
  ClipboardList,
  BarChart3,
  Keyboard,
  LogOut,
  Package,
  GraduationCap,
  Building2,
  Users,
  ScrollText,
  FolderArchive,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import NotificationPanel from "./NotificationPanel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const modules = [
  {
    id: "mockup",
    label: "Mockup Studio",
    icon: Image,
    path: "/mockup",
    description: "Layout Técnico",
    children: [
      { label: "Novo Mockup", path: "/mockup/new", icon: Palette },
      { label: "Rascunhos", path: "/mockup/drafts", icon: FolderOpen },
      { label: "Ordens de Serviço", path: "/mockup/service-orders", icon: ClipboardList },
      { label: "Dashboard OS", path: "/mockup/service-dashboard", icon: BarChart3 },
      { label: "Catálogo", path: "/catalog", icon: Package },
      { label: "Clientes", path: "/clients", icon: Users },
      { label: "Biblioteca (DAM)", path: "/dam", icon: FolderArchive },
      { label: "Histórico", path: "/mockup/history", icon: History },
    ],
  },
  {
    id: "magicup",
    label: "Magic Up",
    icon: Sparkles,
    path: "/magicup",
    description: "Suíte Publicitária IA",
    children: [
      { label: "Gerar Imagem", path: "/magicup/generate", icon: Wand2 },
      { label: "Banco de Prompts", path: "/magicup/prompts", icon: BookOpen },
      { label: "Histórico", path: "/magicup/history", icon: History },
    ],
  },
  {
    id: "video",
    label: "Video Studio",
    icon: Video,
    path: "/video",
    description: "Vídeos Publicitários",
    children: [
      { label: "Novo Vídeo", path: "/video/new", icon: Film },
      { label: "Cinema Mode", path: "/video/cinema", icon: Eye },
      { label: "Moodboard", path: "/video/moodboard", icon: Palette },
      { label: "Photodump", path: "/video/photodump", icon: Camera },
      { label: "Character Studio", path: "/video/characters", icon: User },
      { label: "Inspiração", path: "/video/gallery", icon: Eye },
      { label: "Histórico", path: "/video/history", icon: History },
    ],
  },
];

const AppSidebar = ({ onCollapseChange }: { onCollapseChange?: (collapsed: boolean) => void }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsedState] = useState(false);

  const [expandedModule, setExpandedModule] = useState<string | null>(() => {
    if (location.pathname.startsWith("/magicup")) return "magicup";
    if (location.pathname.startsWith("/video")) return "video";
    return "mockup";
  });

  // Badge counts (over the full order set, not just the first page)
  const { orders } = useServiceOrders({ fetchAll: true });
  const badgeCounts = useMemo(() => {
    const abertas = orders.filter(
      (o) => o.status === "aberta" || o.status === "em_producao",
    ).length;
    return { mockup: abertas };
  }, [orders]);

  const userInitials = useMemo(() => {
    const email = user?.email ?? "";
    const parts = email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return email.slice(0, 2).toUpperCase() || "U";
  }, [user?.email]);

  const toggleModule = (id: string) => {
    setExpandedModule(expandedModule === id ? null : id);
  };

  const ModuleButton = ({ mod }: { mod: (typeof modules)[0] }) => {
    const isActive = location.pathname.startsWith(mod.path);
    const isExpanded = expandedModule === mod.id && !collapsed;
    const btn = (
      <button
        onClick={() => (collapsed ? undefined : toggleModule(mod.id))}
        aria-expanded={isExpanded}
        aria-controls={`submenu-${mod.id}`}
        aria-label={collapsed ? mod.label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        }`}
      >
        <mod.icon
          className={`w-5 h-5 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`}
          aria-hidden="true"
        />
        {!collapsed && (
          <>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold">{mod.label}</div>
              <div className="text-[11px] text-sidebar-foreground/60">{mod.description}</div>
            </div>
            {badgeCounts[mod.id as keyof typeof badgeCounts] > 0 && (
              <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold px-1">
                {badgeCounts[mod.id as keyof typeof badgeCounts]}
              </span>
            )}
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              aria-hidden="true"
            />
          </>
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" className="font-semibold">
            {mod.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return btn;
  };

  const openShortcuts = () => {
    window.dispatchEvent(new Event("promo-open-shortcuts"));
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2 }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-40 touch-none"
      role="navigation"
      aria-label="Barra lateral principal"
    >
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Link
          to="/"
          className="flex items-center gap-2.5 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          aria-label="Ir para o Dashboard — Promo Design"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="font-display font-bold text-2xl text-foreground tracking-tight whitespace-nowrap"
              >
                Promo <span className="text-gradient-primary">Design</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <nav
        className="flex-1 overflow-y-auto py-3 px-2 space-y-1"
        aria-label="Módulos"
        data-tour="sidebar-nav"
      >
        {modules.map((mod) => {
          const isExpanded = expandedModule === mod.id && !collapsed;

          return (
            <div key={mod.id}>
              <ModuleButton mod={mod} />

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                    id={`submenu-${mod.id}`}
                    role="region"
                    aria-label={`Submenu de ${mod.label}`}
                  >
                    <ul
                      className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3"
                      role="list"
                    >
                      {mod.children.map((child) => {
                        const childActive = location.pathname === child.path;
                        return (
                          <li key={child.path}>
                            <Link
                              to={child.path}
                              aria-current={childActive ? "page" : undefined}
                              className={`relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                childActive
                                  ? "text-sidebar-primary bg-sidebar-accent/60 font-medium"
                                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/30"
                              }`}
                            >
                              {childActive && (
                                <motion.span
                                  layoutId="active-child-indicator"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-primary"
                                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                />
                              )}
                              <child.icon className="w-3.5 h-3.5" aria-hidden="true" />
                              {child.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2" aria-label="Informações do usuário">
          <div className="relative shrink-0">
            <div
              className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-xs font-bold text-primary-foreground">{userInitials}</span>
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-sidebar"
              aria-label="Online"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">
                {user?.email ?? "Usuário"}
              </p>
              <p className="text-[11px] text-sidebar-foreground/60" aria-live="polite">
                Online
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-1">
          {!collapsed && (
            <span
              className="text-[11px] font-mono text-sidebar-foreground/50 uppercase"
              id="theme-label"
            >
              Tema
            </span>
          )}
          <ThemeToggle />
        </div>

        {!collapsed && (
          <div className="flex items-center justify-center gap-1 py-1" aria-hidden="true">
            <kbd className="px-1.5 py-0.5 text-[11px] font-mono bg-sidebar-accent text-sidebar-foreground/60 rounded border border-sidebar-border">
              ⌘K
            </kbd>
            <span className="text-[11px] text-sidebar-foreground/40">Busca rápida</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1">
          <NotificationPanel />

          <button
            onClick={openShortcuts}
            aria-label="Abrir atalhos de teclado"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Keyboard className="w-4 h-4" aria-hidden="true" />
            {!collapsed && <span className="text-xs sr-only sm:not-sr-only">Atalhos</span>}
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("promo-tour-completed");
              window.location.href = "/";
            }}
            aria-label="Reiniciar tour de onboarding"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <GraduationCap className="w-4 h-4" aria-hidden="true" />
            {!collapsed && <span className="text-xs sr-only sm:not-sr-only">Tour</span>}
          </button>
        </div>

        <Link
          to="/settings"
          aria-label="Configurações"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Settings className="w-5 h-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="text-sm">Configurações</span>}
        </Link>

        <Link
          to="/organization"
          aria-label="Organização"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Building2 className="w-5 h-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="text-sm">Organização</span>}
        </Link>

        <Link
          to="/audit"
          aria-label="Trilha de auditoria"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ScrollText className="w-5 h-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="text-sm">Auditoria</span>}
        </Link>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              aria-label="Sair da conta"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="text-sm">Sair</span>}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deseja sair?</AlertDialogTitle>
              <AlertDialogDescription>
                Você será desconectado da sua conta. Tem certeza que deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={signOut}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <button
          onClick={() => {
            const next = !collapsed;
            setCollapsedState(next);
            onCollapseChange?.(next);
          }}
          aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 shrink-0" aria-hidden="true" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default AppSidebar;
