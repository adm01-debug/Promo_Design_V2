import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const suggestions = [
  { label: "Dashboard", path: "/", icon: Home },
  { label: "Novo Mockup", path: "/mockup/new", icon: Layers },
  { label: "Magic Up", path: "/magicup/generate", icon: Search },
];

const NotFound = () => {
  const location = useLocation();

  // 404 tracking would go to an analytics/error service in production.

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        {/* Animated 404 number */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="relative mb-6"
        >
          <span className="text-[120px] md:text-[160px] font-display font-bold text-gradient-primary leading-none select-none">
            404
          </span>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Layers className="w-8 h-8 text-primary-foreground" />
            </div>
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-display font-bold text-foreground mb-2"
        >
          Página não encontrada
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-8"
        >
          A rota{" "}
          <code className="font-mono text-primary text-sm bg-muted px-2 py-0.5 rounded">
            {location.pathname}
          </code>{" "}
          não existe.
        </motion.p>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6"
        >
          {suggestions.map((s) => (
            <Link key={s.path} to={s.path}>
              <Button
                variant="outline"
                className="gap-2 border-border hover:border-primary/40 hover:bg-muted transition-all"
              >
                <s.icon className="w-4 h-4 text-primary" />
                {s.label}
              </Button>
            </Link>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao início
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
