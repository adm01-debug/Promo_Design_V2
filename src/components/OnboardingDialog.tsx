import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image, Sparkles, Video, ArrowRight, Layers } from "lucide-react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "promo-design-onboarded";

const modules = [
  {
    icon: Image,
    title: "Mockup Studio",
    description: "Crie layouts técnicos de personalização com posicionamento de logos, áreas de gravação e export PDF.",
    path: "/mockup/new",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Sparkles,
    title: "Magic Up",
    description: "Gere imagens publicitárias com IA a partir de prompts otimizados para o segmento promocional.",
    path: "/magicup/generate",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: Video,
    title: "Video Studio",
    description: "Produza vídeos publicitários com cinema mode, moodboard e cenários inteligentes.",
    path: "/video/new",
    color: "text-accent",
    bg: "bg-accent/10",
  },
];

const OnboardingDialog = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setOpen(true);
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border">
        <div className="p-6 pb-0 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow"
          >
            <Layers className="w-7 h-7 text-primary-foreground" />
          </motion.div>
          <h2 className="text-xl font-display font-bold text-foreground">
            Bem-vindo ao <span className="text-gradient-primary">Promo Design</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Conheça os módulos criativos do seu novo ambiente de trabalho
          </p>
        </div>

        <div className="px-6 space-y-3">
          {modules.map((mod, i) => (
            <motion.div
              key={mod.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
            >
              <Link
                to={mod.path}
                onClick={handleClose}
                className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg ${mod.bg} flex items-center justify-center shrink-0`}>
                  <mod.icon className={`w-5 h-5 ${mod.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{mod.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="p-6 pt-4 flex justify-center">
          <Button onClick={handleClose} className="bg-gradient-primary text-primary-foreground px-8">
            Começar a criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;
