import { motion } from "framer-motion";
import TopNav from "@/components/TopNav";
import ProjectCard from "@/components/ProjectCard";
import StatsBar from "@/components/StatsBar";
import heroImg from "@/assets/hero-mockup.jpg";
import mockupPhone from "@/assets/mockup-phone.jpg";
import mockupLaptop from "@/assets/mockup-laptop.jpg";
import mockupCard from "@/assets/mockup-card.jpg";
import mockupTshirt from "@/assets/mockup-tshirt.jpg";
import mockupSocial from "@/assets/mockup-social.jpg";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const projects = [
  { title: "App Fintech - Telas", category: "Mobile", thumbnail: mockupPhone, lastEdited: "2h atrás", views: 234 },
  { title: "Landing Page Startup", category: "Web", thumbnail: mockupLaptop, lastEdited: "5h atrás", views: 189 },
  { title: "Cartão de Visita Premium", category: "Print", thumbnail: mockupCard, lastEdited: "1d atrás", views: 92 },
  { title: "Coleção Streetwear", category: "Vestuário", thumbnail: mockupTshirt, lastEdited: "2d atrás", views: 156 },
  { title: "Kit Social Media", category: "Social", thumbnail: mockupSocial, lastEdited: "3d atrás", views: 310 },
  { title: "App Dashboard UI", category: "Mobile", thumbnail: mockupPhone, lastEdited: "4d atrás", views: 78 },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      {/* Hero */}
      <section className="relative pt-14 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-border mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono text-muted-foreground">Crie mockups profissionais em minutos</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight mb-4">
              Do conceito à{" "}
              <span className="text-gradient-primary">arte final</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mb-8">
              Ferramenta definitiva para designers criarem mockups de alta qualidade e prepararem arte final para produção.
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/editor"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                Começar Agora
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/templates"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-surface-2 text-foreground font-semibold border border-border hover:bg-surface-3 transition-colors"
              >
                Ver Templates
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <StatsBar />

        <div className="mt-10 flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Projetos Recentes</h2>
            <p className="text-sm text-muted-foreground mt-1">Continue de onde parou</p>
          </div>
          <Link
            to="/templates"
            className="text-sm text-primary hover:underline font-medium"
          >
            Ver todos →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project, i) => (
            <ProjectCard key={project.title} {...project} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
