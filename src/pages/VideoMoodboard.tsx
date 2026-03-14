import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useMoodboardStore } from "@/hooks/use-moodboard-preferences";
import {
  Palette, Sparkles, Sun, Moon, Zap, Heart, Eye, Target,
  ArrowRight, Plus, X, Check, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tone = "energetico" | "sofisticado" | "minimalista" | "divertido" | "luxuoso" | "natural";
type Mood = "quente" | "frio" | "neutro" | "vibrante" | "pastel" | "escuro";

const TONES: { value: Tone; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "energetico", label: "Energético", icon: Zap, desc: "Cores vibrantes, movimento" },
  { value: "sofisticado", label: "Sofisticado", icon: Eye, desc: "Elegante, refinado" },
  { value: "minimalista", label: "Minimalista", icon: Target, desc: "Limpo, essencial" },
  { value: "divertido", label: "Divertido", icon: Sparkles, desc: "Lúdico, colorido" },
  { value: "luxuoso", label: "Luxuoso", icon: Heart, desc: "Premium, dourado" },
  { value: "natural", label: "Natural", icon: Sun, desc: "Orgânico, terroso" },
];

const MOODS: { value: Mood; label: string; colors: string[]; desc: string }[] = [
  { value: "quente", label: "Quente", colors: ["#FF6B35", "#F7931E", "#FFD23F"], desc: "Laranja, amarelo, vermelho" },
  { value: "frio", label: "Frio", colors: ["#4ECDC4", "#45B7D1", "#96CEB4"], desc: "Azul, verde-água, ciano" },
  { value: "neutro", label: "Neutro", colors: ["#9B9B9B", "#D4D4D4", "#F5F5F5"], desc: "Cinza, branco, bege" },
  { value: "vibrante", label: "Vibrante", colors: ["#FF006E", "#8338EC", "#3A86FF"], desc: "Magenta, roxo, azul" },
  { value: "pastel", label: "Pastel", colors: ["#FFB5E8", "#B5DEFF", "#E8FFB5"], desc: "Rosa, azul, verde suave" },
  { value: "escuro", label: "Escuro", colors: ["#1A1A2E", "#16213E", "#0F3460"], desc: "Preto, azul escuro" },
];

const REFERENCE_SCENES = [
  { id: "studio", label: "Estúdio", emoji: "📸", desc: "Fundo infinito, iluminação profissional" },
  { id: "outdoor", label: "Ao Ar Livre", emoji: "🌿", desc: "Natureza, luz natural" },
  { id: "urban", label: "Urbano", emoji: "🏙️", desc: "Cidade, concreto, moderno" },
  { id: "abstract", label: "Abstrato", emoji: "🎨", desc: "Formas, gradientes, texturas" },
  { id: "lifestyle", label: "Lifestyle", emoji: "☕", desc: "Contexto de uso real" },
  { id: "tech", label: "Tecnológico", emoji: "💻", desc: "Futurista, digital, neon" },
  { id: "vintage", label: "Vintage", emoji: "📻", desc: "Retrô, analógico, filme" },
  { id: "festive", label: "Festivo", emoji: "🎉", desc: "Celebração, confete, brilho" },
];

const VideoMoodboard = () => {
  const [selectedTone, setSelectedTone] = useState<Tone | null>(null);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");

  const toggleScene = (id: string) => {
    setSelectedScenes((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id].slice(0, 4)
    );
  };

  const addKeyword = () => {
    if (newKeyword.trim() && keywords.length < 8) {
      setKeywords((prev) => [...prev, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const addCustomColor = (color: string) => {
    if (customColors.length < 5) {
      setCustomColors((prev) => [...prev, color]);
    }
  };

  const isComplete = selectedTone && selectedMood && selectedScenes.length > 0;

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Palette className="w-4 h-4 text-secondary" />
          <h1 className="text-sm font-display font-semibold text-foreground">Moodboard Creator</h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-2 py-0.5 rounded border border-border">
            Inspirado no Higgsfield
          </span>
        </div>
        <Link to="/video/new">
          <Button size="sm" className="text-xs gap-1.5 bg-gradient-primary text-primary-foreground" disabled={!isComplete}>
            Aplicar ao Vídeo <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-xl font-display font-bold text-foreground">
              Defina sua <span className="text-gradient-primary">Direção Criativa</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Monte seu moodboard para guiar a geração do vídeo publicitário
            </p>
          </motion.div>

          {/* Tom Visual */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
              Tom Visual
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {TONES.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setSelectedTone(tone.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedTone === tone.value
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <tone.icon className={`w-6 h-6 ${selectedTone === tone.value ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-semibold text-foreground">{tone.label}</span>
                  <span className="text-[9px] text-muted-foreground text-center">{tone.desc}</span>
                </button>
              ))}
            </div>
          </motion.section>

          {/* Paleta de Cores */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
              Paleta de Cores
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {MOODS.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedMood === mood.value
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex gap-1">
                    {mood.colors.map((c, i) => (
                      <div key={i} className="w-5 h-5 rounded-full border border-border/50" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-foreground">{mood.label}</span>
                  <span className="text-[9px] text-muted-foreground text-center">{mood.desc}</span>
                </button>
              ))}
            </div>

            {/* Custom Colors */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Cores customizadas:</span>
              <div className="flex items-center gap-1.5">
                {customColors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setCustomColors((prev) => prev.filter((_, j) => j !== i))}
                    className="w-6 h-6 rounded-full border-2 border-border hover:border-destructive transition-colors relative group"
                    style={{ backgroundColor: c }}
                  >
                    <X className="w-3 h-3 text-white absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
                {customColors.length < 5 && (
                  <label className="w-6 h-6 rounded-full border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition-colors">
                    <Plus className="w-3 h-3 text-muted-foreground" />
                    <input
                      type="color"
                      className="sr-only"
                      onChange={(e) => addCustomColor(e.target.value)}
                    />
                  </label>
                )}
              </div>
            </div>
          </motion.section>

          {/* Cenários de Referência */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
              Cenários de Referência
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3">Selecione até 4 cenários</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {REFERENCE_SCENES.map((scene) => {
                const isSelected = selectedScenes.includes(scene.id);
                return (
                  <button
                    key={scene.id}
                    onClick={() => toggleScene(scene.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-2xl">{scene.emoji}</span>
                    <div>
                      <span className="text-xs font-semibold text-foreground block">{scene.label}</span>
                      <span className="text-[9px] text-muted-foreground">{scene.desc}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.section>

          {/* Keywords */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
              Palavras-Chave (opcional)
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                placeholder="Ex: promoção, verão, premium..."
                className="flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <Button size="sm" variant="outline" onClick={addKeyword} disabled={!newKeyword.trim()}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-2 border border-border text-xs text-foreground"
                >
                  {kw}
                  <button onClick={() => setKeywords((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </span>
              ))}
            </div>
          </motion.section>

          {/* Preview Moodboard */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
              Preview do Moodboard
            </h3>
            <div className="rounded-2xl border-2 border-border bg-card p-6">
              <div className="grid grid-cols-3 gap-4">
                {/* Tone */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Tom</span>
                  {selectedTone ? (
                    <div className="p-3 rounded-lg bg-surface-2 border border-border">
                      <span className="text-sm font-semibold text-foreground capitalize">{selectedTone}</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-dashed border-border text-center">
                      <span className="text-[10px] text-muted-foreground">Selecione um tom</span>
                    </div>
                  )}
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Cores</span>
                  {selectedMood ? (
                    <div className="p-3 rounded-lg bg-surface-2 border border-border">
                      <div className="flex gap-1.5 mb-1">
                        {MOODS.find((m) => m.value === selectedMood)?.colors.map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-full" style={{ backgroundColor: c }} />
                        ))}
                        {customColors.map((c, i) => (
                          <div key={`c${i}`} className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize">{selectedMood}</span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-dashed border-border text-center">
                      <span className="text-[10px] text-muted-foreground">Selecione uma paleta</span>
                    </div>
                  )}
                </div>

                {/* Scenes */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Cenários</span>
                  {selectedScenes.length > 0 ? (
                    <div className="p-3 rounded-lg bg-surface-2 border border-border">
                      <div className="flex gap-1">
                        {selectedScenes.map((s) => {
                          const scene = REFERENCE_SCENES.find((r) => r.id === s);
                          return <span key={s} className="text-lg">{scene?.emoji}</span>;
                        })}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {selectedScenes.length} cenário{selectedScenes.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-dashed border-border text-center">
                      <span className="text-[10px] text-muted-foreground">Selecione cenários</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Keywords */}
              {keywords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Keywords</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          {/* Action */}
          <div className="flex items-center justify-center pb-8">
            <Link to="/video/new">
              <Button
                size="lg"
                className="gap-2 bg-gradient-primary text-primary-foreground px-8"
                disabled={!isComplete}
              >
                <Sparkles className="w-4 h-4" />
                Aplicar Moodboard e Criar Vídeo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoMoodboard;
