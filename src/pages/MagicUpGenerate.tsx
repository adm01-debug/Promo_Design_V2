import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wand2, Sparkles, Send, Image, RefreshCw, Heart,
  Download, Copy, ChevronDown, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAMPLE_PRODUCTS, SAMPLE_PROMPTS, PROMPT_CATEGORIES } from "@/lib/mockup-types";

const MagicUpGenerate = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generations, setGenerations] = useState<{ id: string; prompt: string; imageUrl: string; favorite: boolean }[]>([]);
  const [showPromptBank, setShowPromptBank] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    // Simulate generation - will use edge function when Cloud is enabled
    setTimeout(() => {
      setGenerations((prev) => [
        {
          id: Date.now().toString(),
          prompt,
          imageUrl: "/placeholder.svg",
          favorite: false,
        },
        ...prev,
      ]);
      setIsGenerating(false);
    }, 2000);
  };

  const toggleFavorite = (id: string) => {
    setGenerations((prev) =>
      prev.map((g) => (g.id === id ? { ...g, favorite: !g.favorite } : g))
    );
  };

  const filteredPrompts = SAMPLE_PROMPTS.filter(
    (p) => selectedCategory === "Todos" || p.category === selectedCategory
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="h-12 bg-surface-1 border-b border-border flex items-center px-4 shrink-0">
        <Sparkles className="w-4 h-4 text-primary mr-2" />
        <h1 className="text-sm font-display font-semibold text-foreground">Magic Up — Gerador de Imagens IA</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main area */}
        <div className="flex-1 flex flex-col">
          {/* Prompt input */}
          <div className="p-4 border-b border-border">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Descreva a imagem publicitária que você deseja gerar..."
                  className="w-full h-24 px-4 py-3 rounded-xl bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary"
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowPromptBank(!showPromptBank)}
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Prompts
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5 bg-gradient-primary text-primary-foreground"
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Gerar
                  </Button>
                </div>
              </div>
            </div>

            {/* Smart prompt helpers */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {["Mockup Premium", "Flat Lay", "Lifestyle", "Kit Corporativo"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    const template = SAMPLE_PROMPTS.find((p) => p.title.includes(tag.split(" ")[0]));
                    if (template) setPrompt(template.prompt);
                  }}
                  className="px-3 py-1 rounded-full bg-surface-2 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Bank panel */}
          {showPromptBank && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 240, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="p-4 h-full overflow-auto">
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedCategory("Todos")}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                      selectedCategory === "Todos" ? "bg-primary/20 text-primary" : "bg-surface-2 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Todos
                  </button>
                  {PROMPT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
                        selectedCategory === cat ? "bg-primary/20 text-primary" : "bg-surface-2 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filteredPrompts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setPrompt(p.prompt); setShowPromptBank(false); }}
                      className="text-left p-3 rounded-lg bg-surface-2 border border-border hover:border-primary/40 transition-colors"
                    >
                      <h4 className="text-xs font-semibold text-foreground">{p.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{p.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Generated images */}
          <div className="flex-1 overflow-auto p-4">
            {generations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                  <Image className="w-9 h-9 text-muted-foreground" />
                </div>
                <p className="text-sm font-display font-semibold text-foreground mb-1">Nenhuma geração ainda</p>
                <p className="text-xs text-muted-foreground">Digite um prompt e clique em Gerar</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {generations.map((gen, i) => (
                  <motion.div
                    key={gen.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-card overflow-hidden group"
                  >
                    <div className="aspect-square bg-surface-2 relative flex items-center justify-center">
                      {isGenerating && i === 0 ? (
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      ) : (
                        <img src={gen.imageUrl} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" className="text-white h-8 w-8 p-0">
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-white h-8 w-8 p-0">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 ${gen.favorite ? "text-accent" : "text-white"}`}
                          onClick={() => toggleFavorite(gen.id)}
                        >
                          <Heart className={`w-4 h-4 ${gen.favorite ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground line-clamp-2">{gen.prompt}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagicUpGenerate;
