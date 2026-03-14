import { motion } from "framer-motion";
import { FolderOpen, Image, Palette, TrendingUp } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";

const stats = [
  { icon: FolderOpen, label: "Projetos", value: 24, color: "text-primary" },
  { icon: Image, label: "Mockups", value: 87, color: "text-secondary" },
  { icon: Palette, label: "Arte Final", value: 42, color: "text-accent" },
  { icon: TrendingUp, label: "Este mês", value: 12, prefix: "+", color: "text-primary" },
];

const StatItem = ({ stat, index }: { stat: typeof stats[0]; index: number }) => {
  const count = useCountUp(stat.value, 1000, index * 80);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex items-center gap-3 p-4 rounded-xl bg-surface-1 border border-border"
    >
      <div className={`p-2 rounded-lg bg-surface-2 ${stat.color}`}>
        <stat.icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-lg font-display font-bold text-foreground tabular-nums">
          {("prefix" in stat && stat.prefix) || ""}{count}
        </p>
        <p className="text-xs text-muted-foreground">{stat.label}</p>
      </div>
    </motion.div>
  );
};

const StatsBar = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <StatItem key={stat.label} stat={stat} index={i} />
      ))}
    </div>
  );
};

export default StatsBar;
