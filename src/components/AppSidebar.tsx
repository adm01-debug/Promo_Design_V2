import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import NotificationPanel from "./NotificationPanel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  const toggleModule = (id: string) => {
    setExpandedModule(expandedModule === id ? null : id);
  };

  const ModuleButton = ({ mod }: { mod: (typeof modules)[0] }) => {
    const isActive = location.pathname.startsWith(mod.path);
    const btn = (
      <button
        onClick={() => (collapsed ? undefined : toggleModule(mod.id))}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        }`}
      >
        <mod.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
        {!collapsed && (
          <>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold">{mod.label}</div>
              <div className="text-[10px] text-sidebar-foreground/60">{mod.description}</div>
            </div>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${expandedModule === mod.id ? "rotate-90" : ""}`}
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
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-40"
    >
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-primary-foreground" />
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

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
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
                  >
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                      {mod.children.map((child) => {
                        const childActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                              childActive
                                ? "text-sidebar-primary bg-sidebar-accent/60 font-medium"
                                : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/30"
                            }`}
                          >
                            <child.icon className="w-3.5 h-3.5" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground">
                {user?.email?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-sidebar" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">
                {user?.email ?? "Usuário"}
              </p>
              <p className="text-[10px] text-sidebar-foreground/60">Online</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-1">
          {!collapsed && <span className="text-[10px] font-mono text-sidebar-foreground/50 uppercase">Tema</span>}
          <ThemeToggle />
        </div>

        {!collapsed && (
          <div className="flex items-center justify-center gap-1 py-1">
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-sidebar-accent text-sidebar-foreground/60 rounded border border-sidebar-border">
              ⌘K
            </kbd>
            <span className="text-[9px] text-sidebar-foreground/40">Busca rápida</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1">
          <NotificationPanel />

          <button
            onClick={openShortcuts}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
          >
            <Keyboard className="w-4 h-4" />
            {!collapsed && <span className="text-xs">Atalhos</span>}
          </button>
        </div>

        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors"
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm">Configurações</span>}
        </Link>

        <button
          onClick={signOut}
          aria-label="Sair da conta"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>

        <button
          onClick={() => {
            const next = !collapsed;
            setCollapsedState(next);
            onCollapseChange?.(next);
          }}
          aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default AppSidebar;
