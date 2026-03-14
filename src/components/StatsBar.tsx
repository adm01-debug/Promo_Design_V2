import { motion } from "framer-motion";
import { FolderOpen, Image, Palette, TrendingUp } from "lucide-react";

const stats = [
  { icon: FolderOpen, label: "Projetos", value: "24", color: "text-primary" },
  { icon: Image, label: "Mockups", value: "87", color: "text-secondary" },
  { icon: Palette, label: "Arte Final", value: "42", color: "text-accent" },
  { icon: TrendingUp, label: "Este mês", value: "+12", color: "text-primary" },
];

const StatsBar = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-surface-1 border border-border"
        >
          <div className={`p-2 rounded-lg bg-surface-2 ${stat.color}`}>
            <stat.icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-lg font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsBar;
