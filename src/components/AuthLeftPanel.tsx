import { motion } from "framer-motion";
import { Layers, Palette, BarChart3, Users, Shield } from "lucide-react";

const features = [
  {
    icon: Palette,
    title: "Mockups profissionais",
    description: "Crie apresentações visuais de produtos",
  },
  { icon: BarChart3, title: "Ordens de serviço", description: "Gerencie todo o fluxo de produção" },
  { icon: Users, title: "Catálogo inteligente", description: "Organize produtos e categorias" },
];

const AuthLeftPanel = () => (
  <div
    className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-10"
    aria-hidden="true"
  >
    <div className="absolute inset-0 canvas-grid opacity-30" />
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 4 + i * 3,
            height: 4 + i * 3,
            left: `${15 + i * 14}%`,
            top: `${10 + i * 12}%`,
            background: `hsl(var(--${i % 3 === 0 ? "primary" : i % 3 === 1 ? "secondary" : "accent"}) / 0.4)`,
          }}
          animate={{ y: [0, -20 - i * 5, 0], x: [0, 10 + i * 3, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
        />
      ))}
    </div>
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-1/4 right-0 w-72 h-72 rounded-full bg-secondary/5 blur-[100px]" />
      <div className="absolute top-2/3 left-1/3 w-64 h-64 rounded-full bg-accent/3 blur-[100px]" />
    </div>
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="flex items-center gap-3 relative z-10"
    >
      <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
        <Layers className="w-5 h-5 text-primary-foreground" />
      </div>
      <div>
        <span className="text-lg font-display font-bold text-foreground">Promo Design</span>
        <span className="block text-[11px] font-mono tracking-[0.3em] uppercase text-primary">
          Design Suite
        </span>
      </div>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative z-10 space-y-6"
    >
      <h2 className="text-4xl xl:text-5xl font-display font-bold text-foreground leading-tight">
        Gerencie seus brindes
        <br />
        com{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
          inteligência
        </span>
      </h2>
      <p className="text-muted-foreground text-base max-w-md">
        Crie mockups, controle ordens de serviço e organize seu catálogo de produtos em um só lugar.
      </p>
      <ul className="space-y-3 pt-2" role="list">
        {features.map((feature, i) => (
          <motion.li
            key={feature.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <feature.icon className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.div>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="relative z-10 flex items-center gap-2 text-xs text-muted-foreground"
    >
      <Shield className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Conexão segura · Dados criptografados</span>
    </motion.div>
  </div>
);

export default AuthLeftPanel;
