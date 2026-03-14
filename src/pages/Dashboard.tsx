import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Image, Sparkles, ArrowRight, Clock, TrendingUp } from "lucide-react";

const stats = [
  { label: "Mockups Criados", value: "0", icon: Image },
  { label: "Imagens IA", value: "0", icon: Sparkles },
  { label: "Rascunhos", value: "0", icon: Clock },
];

const quickActions = [
  {
    title: "Novo Mockup",
    description: "Criar layout técnico de personalização",
    icon: Image,
    path: "/mockup/new",
    gradient: "from-primary to-secondary",
  },
  {
    title: "Magic Up",
    description: "Gerar imagem publicitária com IA",
    icon: Sparkles,
    path: "/magicup/generate",
    gradient: "from-secondary to-accent",
  },
];

const Dashboard = () => {
  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-display font-bold text-foreground">
          Bem-vindo ao <span className="text-gradient-primary">MockStudio</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Sistema de Criação para o Time de Artes</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 rounded-xl bg-card border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3">Ações Rápidas</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {quickActions.map((action, i) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
          >
            <Link
              to={action.path}
              className="block p-6 rounded-xl border border-border bg-card hover:border-primary/40 transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4`}>
                <action.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-display font-bold text-foreground mb-1">{action.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
              <span className="inline-flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
                Começar <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
