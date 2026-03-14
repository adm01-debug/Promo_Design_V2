import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCinemaStore } from "@/hooks/use-cinema-preferences";
import {
  Film, Sun, Moon, Contrast, Droplets, Thermometer,
  SlidersHorizontal, RotateCcw, Download, Sparkles, Eye, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useProducts, getProductImageUrl } from "@/hooks/use-products";

type GradingPreset = {
  id: string;
  label: string;
  desc: string;
  colors: [string, string, string];
  filters: { temperature: number; contrast: number; saturation: number; brightness: number; vignette: number };
};

const GRADING_PRESETS: GradingPreset[] = [
  {
    id: "teal-orange",
    label: "Teal & Orange",
    desc: "Blockbuster look — sombras frias, tons quentes na pele",
    colors: ["#008080", "#FF8C42", "#2C3E50"],
    filters: { temperature: 65, contrast: 70, saturation: 55, brightness: 50, vignette: 40 },
  },
  {
    id: "moody-blue",
    label: "Moody Blue",
    desc: "Tons azulados, dramático e introspectivo",
    colors: ["#1B3A5C", "#4A7FB5", "#0D1B2A"],
    filters: { temperature: 30, contrast: 65, saturation: 40, brightness: 42, vignette: 55 },
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    desc: "Luz dourada do pôr do sol, quente e acolhedor",
    colors: ["#F4A261", "#E9C46A", "#264653"],
    filters: { temperature: 75, contrast: 55, saturation: 65, brightness: 58, vignette: 25 },
  },
  {
    id: "noir",
    label: "Film Noir",
    desc: "Alto contraste, preto e branco dramático",
    colors: ["#1A1A1A", "#808080", "#F5F5F5"],
    filters: { temperature: 50, contrast: 85, saturation: 0, brightness: 45, vignette: 70 },
  },
  {
    id: "vintage-film",
    label: "Vintage Film",
    desc: "Estética de filme analógico dos anos 70",
    colors: ["#C9ADA7", "#9A8C98", "#4A4E69"],
    filters: { temperature: 60, contrast: 50, saturation: 35, brightness: 52, vignette: 35 },
  },
  {
    id: "neon-nights",
    label: "Neon Nights",
    desc: "Cyberpunk — neons vibrantes em escuridão",
    colors: ["#FF006E", "#8338EC", "#0A0A1A"],
    filters: { temperature: 45, contrast: 75, saturation: 80, brightness: 38, vignette: 60 },
  },
];

type LightingSetup = {
  id: string;
  label: string;
  emoji: string;
  desc: string;
};

const LIGHTING_SETUPS: LightingSetup[] = [
  { id: "three-point", label: "Three-Point", emoji: "💡", desc: "Key, fill e backlight clássico" },
  { id: "rembrandt", label: "Rembrandt", emoji: "🎨", desc: "Triângulo de luz na bochecha" },
  { id: "silhouette", label: "Silhueta", emoji: "🌑", desc: "Backlight forte, sujeito escuro" },
  { id: "rim", label: "Rim Light", emoji: "✨", desc: "Contorno brilhante nas bordas" },
  { id: "natural", label: "Luz Natural", emoji: "☀️", desc: "Janela lateral, suave e difusa" },
  { id: "dramatic", label: "Dramática", emoji: "🔦", desc: "Alto contraste, sombras pesadas" },
];

const VideoCinema = () => {
  const navigate = useNavigate();
  const setCinemaPrefs = useCinemaStore((s) => s.setPreferences);
  const [selectedPreset, setSelectedPreset] = useState<GradingPreset>(GRADING_PRESETS[0]);
  const [lighting, setLighting] = useState("three-point");
  const [temperature, setTemperature] = useState(selectedPreset.filters.temperature);
  const [contrast, setContrast] = useState(selectedPreset.filters.contrast);
  const [saturation, setSaturation] = useState(selectedPreset.filters.saturation);
  const [brightness, setBrightness] = useState(selectedPreset.filters.brightness);
  const [vignette, setVignette] = useState(selectedPreset.filters.vignette);
  const [letterbox, setLetterbox] = useState(true);
  const [grain, setGrain] = useState(true);
  const [selectedProductIdx, setSelectedProductIdx] = useState(0);

  const { data: productsData } = useProducts({ page: 0, pageSize: 8, onlyWithImages: true });
  const products = productsData?.products || [];
  const selectedProduct = products[selectedProductIdx] || null;

  const applyPreset = (preset: GradingPreset) => {
    setSelectedPreset(preset);
    setTemperature(preset.filters.temperature);
    setContrast(preset.filters.contrast);
    setSaturation(preset.filters.saturation);
    setBrightness(preset.filters.brightness);
    setVignette(preset.filters.vignette);
  };

  const resetAll = () => applyPreset(GRADING_PRESETS[0]);

  const tempHue = ((temperature - 50) * 0.6).toFixed(1);
  const filterStyle = {
    filter: `contrast(${(contrast / 50).toFixed(2)}) saturate(${(saturation / 50).toFixed(2)}) brightness(${(brightness / 50).toFixed(2)}) hue-rotate(${tempHue}deg)`,
  };

  const vignetteStyle = {
    background: `radial-gradient(ellipse at center, transparent ${100 - vignette}%, rgba(0,0,0,0.7) 100%)`,
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Film className="w-4 h-4 text-primary" />
          <h1 className="text-sm font-semibold text-foreground">Cinema Mode</h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
            Color Grading & Iluminação
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={resetAll}>
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          <Button size="sm" className="text-xs gap-1.5" onClick={() => {
            const lightingSetup = LIGHTING_SETUPS.find(l => l.id === lighting);
            setCinemaPrefs({
              presetId: selectedPreset.id,
              presetLabel: selectedPreset.label,
              lighting,
              lightingLabel: lightingSetup?.label || lighting,
              letterbox,
              grain,
              filters: { temperature, contrast, saturation, brightness, vignette },
            });
            navigate("/video/new");
          }}>
            <Sparkles className="w-3.5 h-3.5" /> Aplicar ao Vídeo
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Preview */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
          {letterbox && (
            <>
              <div className="absolute top-0 left-0 right-0 h-[12%] bg-black z-20" />
              <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-black z-20" />
            </>
          )}

          <div className="relative w-full max-w-4xl aspect-video mx-auto">
            <div className="absolute inset-0 rounded-sm overflow-hidden" style={filterStyle}>
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg, ${selectedPreset.colors[2]} 0%, ${selectedPreset.colors[0]} 40%, ${selectedPreset.colors[1]} 70%, ${selectedPreset.colors[2]} 100%)`,
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="text-center z-10">
                    <motion.div
                      key={selectedPreset.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Film className="w-16 h-16 text-white/40 mx-auto mb-4" />
                      <h2 className="text-2xl font-bold text-white/90 mb-1">
                        {selectedPreset.label}
                      </h2>
                      <p className="text-sm text-white/50 font-mono">
                        Preview cinematográfico
                      </p>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 pointer-events-none z-10" style={vignetteStyle} />

            {grain && (
              <div
                className="absolute inset-0 pointer-events-none z-10 opacity-[0.08] mix-blend-overlay"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />
            )}

            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3">
              <span className="text-[10px] font-mono text-white/50 bg-black/50 px-2 py-1 rounded">
                2.39:1 Anamorphic
              </span>
              <span className="text-[10px] font-mono text-white/50 bg-black/50 px-2 py-1 rounded">
                24fps
              </span>
              <span className="text-[10px] font-mono text-white/50 bg-black/50 px-2 py-1 rounded">
                LOG → {selectedPreset.label}
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-[340px] border-l border-border overflow-y-auto shrink-0 bg-card">
          <div className="p-4 space-y-6">
            {/* Color Grading Presets */}
            <section>
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Color Grading
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {GRADING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${selectedPreset.id === preset.id
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      {preset.colors.map((c, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-border/30"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-foreground block">
                      {preset.label}
                    </span>
                    <span className="text-[8px] text-muted-foreground leading-tight block mt-0.5">
                      {preset.desc}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Manual Controls */}
            <section>
              <div className="flex items-center gap-1.5 mb-3">
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Ajustes Manuais
                </h3>
              </div>
              <div className="space-y-4">
                {[
                  { icon: Thermometer, label: "Temperatura", value: temperature, onChange: setTemperature, leftLabel: "Frio", rightLabel: "Quente" },
                  { icon: Contrast, label: "Contraste", value: contrast, onChange: setContrast, leftLabel: "Baixo", rightLabel: "Alto" },
                  { icon: Droplets, label: "Saturação", value: saturation, onChange: setSaturation, leftLabel: "P&B", rightLabel: "Vívido" },
                  { icon: Sun, label: "Brilho", value: brightness, onChange: setBrightness, leftLabel: "Escuro", rightLabel: "Claro" },
                  { icon: Moon, label: "Vinheta", value: vignette, onChange: setVignette, leftLabel: "Nenhuma", rightLabel: "Intensa" },
                ].map((ctrl) => (
                  <div key={ctrl.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <ctrl.icon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-mono text-foreground">{ctrl.label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-primary">{ctrl.value}</span>
                    </div>
                    <Slider
                      value={[ctrl.value]}
                      onValueChange={(v) => ctrl.onChange(v[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[8px] text-muted-foreground">{ctrl.leftLabel}</span>
                      <span className="text-[8px] text-muted-foreground">{ctrl.rightLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Lighting Setup */}
            <section>
              <div className="flex items-center gap-1.5 mb-3">
                <Sun className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Iluminação
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LIGHTING_SETUPS.map((setup) => (
                  <button
                    key={setup.id}
                    onClick={() => setLighting(setup.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all ${lighting === setup.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-lg">{setup.emoji}</span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold text-foreground block truncate">
                        {setup.label}
                      </span>
                      <span className="text-[8px] text-muted-foreground block truncate">
                        {setup.desc}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Extras */}
            <section>
              <div className="flex items-center gap-1.5 mb-3">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Efeitos
                </h3>
              </div>
              <div className="space-y-2">
                <label className="flex items-center justify-between p-2.5 rounded-lg border border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Letterbox (2.39:1)</span>
                    <span className="text-[9px] text-muted-foreground block">Barras cinematográficas</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={letterbox}
                    onChange={(e) => setLetterbox(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between p-2.5 rounded-lg border border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <div>
                    <span className="text-xs font-semibold text-foreground">Film Grain</span>
                    <span className="text-[9px] text-muted-foreground block">Textura analógica sutil</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={grain}
                    onChange={(e) => setGrain(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                </label>
              </div>
            </section>

            <p className="text-[10px] text-muted-foreground text-center pb-4">
              Aplique este preset ao gerar seu vídeo no Video Studio
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCinema;
