import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/use-count-up";
import MiniSparkline from "@/components/MiniSparkline";

export const StatCard = ({
  label,
  value,
  icon: Icon,
  change,
  index,
  sparkData,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  change: string;
  index: number;
  sparkData?: number[];
}) => {
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
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xl sm:text-2xl font-bold text-foreground font-display tabular-nums">
              {count}
            </p>
            {sparkData && <MiniSparkline data={sparkData} />}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </div>
      <p className="text-[9px] sm:text-[10px] text-primary/70 mt-2 font-medium">{change}</p>
    </motion.div>
  );
};
