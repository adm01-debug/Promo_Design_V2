import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, Plus, Copy, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAMPLE_PROMPTS, PROMPT_CATEGORIES } from "@/lib/mockup-types";
import { useNavigate } from "react-router-dom";

const MagicUpPrompts = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const navigate = useNavigate();

  const filtered = SAMPLE_PROMPTS.filter((p) => {
    const matchCategory = category === "Todos" || p.category === category;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.prompt.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const usePrompt = (prompt: string) => {
    navigate("/magicup/generate", { state: { prompt } });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Banco de Prompts</h1>
          <p className="text-sm text-muted-foreground">Templates prontos para geração de imagens</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Novo Prompt
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setCategory("Todos")}
          className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
            category === "Todos" ? "bg-primary/20 text-primary border border-primary/40" : "bg-surface-2 text-muted-foreground border border-border hover:text-foreground"
          }`}
        >
          Todos
        </button>
        {PROMPT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              category === cat ? "bg-primary/20 text-primary border border-primary/40" : "bg-surface-2 text-muted-foreground border border-border hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Prompts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-[10px] font-mono uppercase text-primary bg-primary/10 px-2 py-0.5 rounded">{p.category}</span>
                <h3 className="text-sm font-semibold text-foreground mt-2">{p.title}</h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3 font-mono leading-relaxed">{p.prompt}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-gradient-primary text-primary-foreground"
                onClick={() => usePrompt(p.prompt)}
              >
                <Wand2 className="w-3 h-3" /> Usar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => navigator.clipboard.writeText(p.prompt)}
              >
                <Copy className="w-3 h-3" /> Copiar
              </Button>
            </div>
            {p.tags.length > 0 && (
              <div className="flex gap-1 mt-3 flex-wrap">
                {p.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MagicUpPrompts;
