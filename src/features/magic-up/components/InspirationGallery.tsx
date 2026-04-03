import { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Copy, Send, Search } from "lucide-react";
import { INSPIRATION_GALLERY, PROMPT_CATEGORIES } from "@/lib/mockup-types";
import { toast } from "sonner";

interface Props {
  onUsePrompt: (prompt: string) => void;
}

const InspirationGallery = ({ onUsePrompt }: Props) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  const filtered = INSPIRATION_GALLERY.filter((item) => {
    const matchCat = category === "Todos" || item.category === category;
    const matchSearch =
      !search ||
      item.prompt.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const categories = ["Todos", ...Array.from(new Set(INSPIRATION_GALLERY.map((i) => i.category)))];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Lightbulb className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Galeria de Inspiração
        </h3>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar inspiração..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-md bg-surface-2 border border-border text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-1 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-2 py-0.5 rounded-full text-[9px] transition-colors ${
              category === cat
                ? "bg-primary/20 text-primary"
                : "bg-surface-2 text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-lg border border-border bg-surface-2 p-2 hover:border-primary/40 transition-all group cursor-pointer"
            onClick={() => onUsePrompt(item.prompt)}
          >
            <div className="text-2xl text-center mb-1.5">{item.thumbnail}</div>
            <p className="text-[9px] text-muted-foreground line-clamp-3 leading-relaxed mb-2">
              {item.prompt}
            </p>
            <div className="flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUsePrompt(item.prompt);
                }}
                className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-primary/10 text-primary text-[9px] hover:bg-primary/20 transition-colors"
              >
                <Send className="w-2.5 h-2.5" /> Usar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(item.prompt);
                  toast.success("Prompt copiado!");
                }}
                className="px-1.5 py-1 rounded bg-surface-2 border border-border text-muted-foreground text-[9px] hover:text-foreground transition-colors"
              >
                <Copy className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {item.tags.map((tag) => (
                <span key={tag} className="text-[8px] px-1 py-0.5 rounded bg-card border border-border text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default InspirationGallery;
