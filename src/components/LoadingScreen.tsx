import { motion } from "framer-motion";
import { Layers } from "lucide-react";

const LoadingScreen = () => (
  <div
    className="flex flex-col items-center justify-center min-h-[60vh] gap-5"
    role="status"
    aria-label="Carregando conteúdo"
  >
    {/* Animated logo */}
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute -inset-3 rounded-2xl border-2 border-transparent"
        style={{
          borderImage:
            "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent))) 1",
          borderRadius: "1rem",
        }}
      />
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow"
      >
        <Layers className="w-7 h-7 text-primary-foreground" />
      </motion.div>
    </motion.div>

    {/* Progress bar */}
    <div className="w-40 h-1 bg-muted rounded-full overflow-hidden">
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
        className="h-full w-1/2 bg-gradient-primary rounded-full"
      />
    </div>

    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-sm text-muted-foreground font-mono"
    >
      Carregando...
    </motion.p>
  </div>
);

export default LoadingScreen;
