import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock, Heart, Eye, Play, Sparkles } from "lucide-react";
type Category = "all" | "produto" | "moda" | "tech" | "food" | "lifestyle";
type SortBy = "trending" | "recent" | "popular";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "produto", label: "Produto" },
  { value: "moda", label: "Moda" },
  { value: "tech", label: "Tecnologia" },
  { value: "food", label: "Food & Drink" },
  { value: "lifestyle", label: "Lifestyle" },
];

// Mock gallery items
const GALLERY_ITEMS = [
  {
    id: 1,
    title: "Sneakers Neon Burst",
    category: "moda",
    views: 12450,
    likes: 892,
    template: "Flash Promo",
    format: "9:16",
    style: "dinamico",
    color: "from-pink-500 to-purple-600",
  },
  {
    id: 2,
    title: "Caneca Minimalista",
    category: "produto",
    views: 8320,
    likes: 634,
    template: "Clean Minimal",
    format: "1:1",
    style: "minimalista",
    color: "from-gray-400 to-gray-600",
  },
  {
    id: 3,
    title: "MacBook Cinematic",
    category: "tech",
    views: 23100,
    likes: 1876,
    template: "Cinematic Bars",
    format: "16:9",
    style: "premium",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: 4,
    title: "Café Artesanal",
    category: "food",
    views: 5640,
    likes: 423,
    template: "Lifestyle Scene",
    format: "4:5",
    style: "elegante",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: 5,
    title: "Perfume Luxo",
    category: "produto",
    views: 18900,
    likes: 1543,
    template: "Product Reveal",
    format: "9:16",
    style: "luxuoso",
    color: "from-yellow-500 to-amber-600",
  },
  {
    id: 6,
    title: "Tênis 360° View",
    category: "moda",
    views: 15200,
    likes: 1120,
    template: "Showcase 360°",
    format: "1:1",
    style: "dinamico",
    color: "from-red-500 to-rose-600",
  },
  {
    id: 7,
    title: "Smart Watch",
    category: "tech",
    views: 9870,
    likes: 756,
    template: "Neon Glow",
    format: "9:16",
    style: "jovem",
    color: "from-green-400 to-emerald-600",
  },
  {
    id: 8,
    title: "Pizza Artesanal",
    category: "food",
    views: 7340,
    likes: 567,
    template: "Social Burst",
    format: "1:1",
    style: "divertido",
    color: "from-orange-500 to-red-500",
  },
  {
    id: 9,
    title: "Bolsa Premium",
    category: "moda",
    views: 11200,
    likes: 934,
    template: "Split Reveal",
    format: "4:5",
    style: "sofisticado",
    color: "from-rose-400 to-pink-600",
  },
  {
    id: 10,
    title: "Headphone Pro",
    category: "tech",
    views: 21300,
    likes: 1678,
    template: "Glitch Effect",
    format: "16:9",
    style: "jovem",
    color: "from-violet-500 to-purple-700",
  },
  {
    id: 11,
    title: "Vinho Reserva",
    category: "food",
    views: 6780,
    likes: 512,
    template: "Cinematic Bars",
    format: "16:9",
    style: "elegante",
    color: "from-red-800 to-rose-900",
  },
  {
    id: 12,
    title: "Mochila Explorer",
    category: "lifestyle",
    views: 4560,
    likes: 345,
    template: "Floating Particles",
    format: "9:16",
    style: "natural",
    color: "from-teal-500 to-green-600",
  },
];

const VideoGallery = () => {
  const [category, setCategory] = useState<Category>("all");
  const [sortBy, setSortBy] = useState<SortBy>("trending");

  const filtered = GALLERY_ITEMS.filter(
    (item) => category === "all" || item.category === category,
  ).sort((a, b) => {
    if (sortBy === "trending") return b.views - a.views;
    if (sortBy === "popular") return b.likes - a.likes;
    return b.id - a.id;
  });

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-display font-semibold text-foreground">
            Galeria de Inspiração
          </h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-2 py-0.5 rounded border border-border">
            {filtered.length} exemplos
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    category === cat.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {[
                { value: "trending" as SortBy, icon: TrendingUp, label: "Trending" },
                { value: "popular" as SortBy, icon: Heart, label: "Popular" },
                { value: "recent" as SortBy, icon: Clock, label: "Recente" },
              ].map((sort) => (
                <button
                  key={sort.value}
                  onClick={() => setSortBy(sort.value)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                    sortBy === sort.value
                      ? "bg-surface-2 text-foreground border border-primary/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <sort.icon className="w-3 h-3" />
                  {sort.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card overflow-hidden group cursor-pointer hover:border-primary/40 transition-all"
              >
                <div
                  className={`aspect-[4/5] bg-gradient-to-br ${item.color} relative flex items-center justify-center`}
                >
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="relative z-10 text-center px-4">
                    <Play className="w-10 h-10 text-white/80 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-display font-bold drop-shadow-lg">
                      {item.title}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 z-10">
                    <span className="text-[8px] font-mono text-white/80 bg-black/40 px-1.5 py-0.5 rounded">
                      {item.format}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-primary">{item.template}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {item.style}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Eye className="w-3 h-3" /> {(item.views / 1000).toFixed(1)}k
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Heart className="w-3 h-3" /> {item.likes}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGallery;
