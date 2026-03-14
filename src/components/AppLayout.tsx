import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const AppLayout = () => {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {isMobile ? (
        <>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="fixed top-3 left-3 z-50 w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          {/* Mobile drawer overlay */}
          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-40"
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
            <Outlet />
          </main>
        </>
      ) : (
        <>
          <AppSidebar />
          <main className="flex-1 ml-[240px] transition-all">
            <Outlet />
          </main>
        </>
      )}
    </div>
  );
};

export default AppLayout;
