import { WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useOnlineStatus } from "@/hooks/use-online-status";

const OnlineIndicator = () => {
  const { online } = useOnlineStatus();

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground text-xs font-mono text-center py-1.5 flex items-center justify-center gap-2"
        >
          <WifiOff className="w-3.5 h-3.5" />
          Você está offline — navegação continua, mas alterações não serão salvas
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnlineIndicator;
