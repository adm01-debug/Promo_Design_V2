import { motion } from "framer-motion";

import { Search, Filter } from "lucide-react";
import mockupPhone from "@/assets/mockup-phone.jpg";
import mockupLaptop from "@/assets/mockup-laptop.jpg";
import mockupCard from "@/assets/mockup-card.jpg";
import mockupTshirt from "@/assets/mockup-tshirt.jpg";
import mockupSocial from "@/assets/mockup-social.jpg";

const categories = ["Todos", "Mobile", "Web", "Print", "Vestuário", "Social Media", "Embalagens"];

const templates = [
  { title: "iPhone 15 Pro - Perspectiva", category: "Mobile", image: mockupPhone, premium: true },
  { title: "MacBook Air - Floating", category: "Web", image: mockupLaptop, premium: false },
  { title: "Cartão Corporativo", category: "Print", image: mockupCard, premium: false },
  { title: "Camiseta Básica", category: "Vestuário", image: mockupTshirt, premium: true },
  { title: "Post Instagram Feed", category: "Social Media", image: mockupSocial, premium: false },
  { title: "iPhone Flat Lay", category: "Mobile", image: mockupPhone, premium: false },
  { title: "Laptop Workspace", category: "Web", image: mockupLaptop, premium: true },
  { title: "Cartão Minimalista", category: "Print", image: mockupCard, premium: false },
];

const Templates = () => {
  return (
    <div className="p-4 sm:p-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Templates de <span className="text-gradient-primary">Mockup</span>
          </h1>
          <p className="text-muted-foreground mb-8">
            Escolha um template e comece a criar seu mockup profissional.
          </p>

          {/* Search & Filter */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar templates..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-1 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-body"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface-1 border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Filter className="w-4 h-4" />
              Filtrar
            </button>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {categories.map((cat, i) => (
              <button
                key={cat}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  i === 0
                    ? "bg-gradient-primary text-primary-foreground"
                    : "bg-surface-1 text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="group relative rounded-xl overflow-hidden bg-card border border-border hover:border-glow shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                  <img src={t.image} alt={t.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {t.premium && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-gradient-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider">
                      Pro
                    </span>
                  )}
                  <div className="absolute inset-0 bg-card/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground text-xs font-semibold">
                      Usar Template
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-display font-semibold text-foreground truncate">{t.title}</h3>
                  <span className="text-xs font-mono text-primary">{t.category}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
    </div>
  );
};

export default Templates;
