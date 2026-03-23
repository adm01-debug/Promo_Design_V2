import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Breadcrumbs from "./Breadcrumbs";
import ScrollToTop from "./ScrollToTop";
import CommandPalette from "./CommandPalette";
import OnboardingDialog from "./OnboardingDialog";
import KeyboardShortcutsDialog from "./KeyboardShortcutsDialog";
import { useServiceOrderRealtime } from "@/hooks/use-service-order-realtime";

const AppLayout = () => {
  useServiceOrderRealtime();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    const onOpenShortcuts = () => setShortcutsOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("promo-open-shortcuts", onOpenShortcuts);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("promo-open-shortcuts", onOpenShortcuts);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />
      <OnboardingDialog />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ScrollToTop />

      {isMobile ? (
        <>
          <button
            onClick={() => setMobileOpen(true)}
            className="fixed top-3 left-3 z-50 w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-background/70 z-40"
                  onClick={() => setMobileOpen(false)}
                />
                <motion.div
                  initial={{ x: -260 }}
                  animate={{ x: 0 }}
                  exit={{ x: -260 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed left-0 top-0 z-50 h-screen"
                >
                  <div onClick={() => setMobileOpen(false)}>
                    <AppSidebar />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <main className="flex-1 pt-14">
            <div className="p-4">
              <Breadcrumbs />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </>
      ) : (
        <>
          <AppSidebar onCollapseChange={setCollapsed} />
          <main className={`flex-1 transition-all ${collapsed ? "ml-16" : "ml-[240px]"}`}>
            <div className="p-4 pb-0">
              <Breadcrumbs />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </>
      )}
    </div>
  );
};

export default AppLayout;
