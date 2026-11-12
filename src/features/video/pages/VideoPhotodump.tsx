import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Sparkles,
  Camera,
  Download,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts, getProductImageUrl } from "@/features/mockup";
import type { DbProduct } from "@/features/mockup";

const SCENARIOS = [
  {
    id: "studio-white",
    label: "Estúdio Branco",
    emoji: "⬜",
    desc: "Fundo infinito branco profissional",
  },
  {
    id: "studio-dark",
    label: "Estúdio Escuro",
    emoji: "⬛",
    desc: "Fundo preto com iluminação dramática",
  },
  {
    id: "lifestyle-desk",
    label: "Mesa de Trabalho",
    emoji: "🖥️",
    desc: "Ambiente de escritório moderno",
  },
  { id: "outdoor-nature", label: "Natureza", emoji: "🌿", desc: "Jardim, parque ou floresta" },
  { id: "urban-street", label: "Rua Urbana", emoji: "🏙️", desc: "Cenário urbano com concreto" },
  { id: "cafe", label: "Cafeteria", emoji: "☕", desc: "Ambiente aconchegante de café" },
  { id: "beach", label: "Praia", emoji: "🏖️", desc: "Areia, mar e céu azul" },
  { id: "neon", label: "Neon City", emoji: "🌃", desc: "Luzes neon noturnas" },
  { id: "marble", label: "Mármore", emoji: "🏛️", desc: "Superfície de mármore luxuosa" },
  { id: "wood", label: "Madeira", emoji: "🪵", desc: "Mesa ou fundo de madeira rústica" },
  { id: "gradient", label: "Gradiente", emoji: "🌈", desc: "Fundo gradiente colorido" },
  { id: "christmas", label: "Natal", emoji: "🎄", desc: "Decoração e luzes natalinas" },
  // ── Novos cenários inspirados no Higgsfield ──
  {
    id: "desert-dusk",
    label: "Deserto ao Entardecer",
    emoji: "🏜️",
    desc: "Areia dourada, céu alaranjado",
  },
  { id: "rain-city", label: "Chuva Urbana", emoji: "🌧️", desc: "Reflexos na chuva, luzes de rua" },
  {
    id: "museum",
    label: "Galeria de Arte",
    emoji: "🖼️",
    desc: "Paredes brancas, iluminação de museu",
  },
  { id: "gym", label: "Academia", emoji: "🏋️", desc: "Ambiente fitness, energia" },
  { id: "airport", label: "Aeroporto", emoji: "✈️", desc: "Terminal moderno, viagem" },
  { id: "subway", label: "Metrô", emoji: "🚇", desc: "Plataforma urbana, gritty" },
  { id: "rooftop", label: "Rooftop", emoji: "🌆", desc: "Terraço com vista da cidade" },
  { id: "garden-party", label: "Garden Party", emoji: "🎉", desc: "Festa ao ar livre, festivo" },
];

const VideoPhotodump = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(null);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([
    "studio-white",
    "studio-dark",
    "lifestyle-desk",
    "outdoor-nature",
    "urban-street",
    "neon",
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{ scenario: string; url: string }[]>([]);

  const { data: productsData, isLoading } = useProducts({
    search,
    page,
    pageSize: 20,
    onlyWithImages: true,
  });
  const products = productsData?.products || [];
  const totalPages = Math.ceil((productsData?.total || 0) / 20);

  const toggleScenario = (id: string) => {
    setSelectedScenarios((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id].slice(0, 8),
    );
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate generation — real implementation requires Cloud
    setTimeout(() => {
      setGeneratedImages(
        selectedScenarios.map((s) => ({
          scenario: s,
          url: selectedProduct ? getProductImageUrl(selectedProduct) : "",
        })),
      );
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Camera className="w-4 h-4 text-accent" />
          <h1 className="text-sm font-display font-semibold text-foreground">Product Photodump</h1>
          <span className="text-[10px] font-mono text-muted-foreground bg-surface-2 px-2 py-0.5 rounded border border-border">
            Cenas Diferentes, Mesmo Produto
          </span>
        </div>
        {selectedProduct && (
          <Button
            size="sm"
            className="text-xs gap-1.5 bg-gradient-accent text-accent-foreground"
            onClick={handleGenerate}
            disabled={isGenerating || selectedScenarios.length === 0}
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isGenerating ? "Gerando..." : `Gerar ${selectedScenarios.length} Cenas`}
          </Button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedProduct ? (
            <motion.div
              key="select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-border shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Package className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Adicione produtos no catálogo para começar
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {products.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => setSelectedProduct(product)}
                          className="group rounded-lg border border-border hover:border-primary/40 transition-all overflow-hidden text-left"
                        >
                          <div className="aspect-square bg-surface-2 flex items-center justify-center p-2">
                            <img
                              src={getProductImageUrl(product)}
                              alt={product.name}
                              className="w-full h-full object-contain"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                          </div>
                          <div className="p-2 bg-card">
                            <h3 className="text-xs font-semibold text-foreground truncate">
                              {product.name}
                            </h3>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {product.sku}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 0}
                          onClick={() => setPage((p) => p - 1)}
                          className="text-xs"
                        >
                          <ChevronLeft className="w-3 h-3" /> Anterior
                        </Button>
                        <span className="text-xs text-muted-foreground font-mono">
                          {page + 1} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages - 1}
                          onClick={() => setPage((p) => p + 1)}
                          className="text-xs"
                        >
                          Próximo <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="config"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Left: Config */}
              <div className="w-[360px] border-r border-border overflow-y-auto p-4 space-y-6 shrink-0">
                {/* Selected Product */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-border">
                  <div className="w-14 h-14 rounded-lg bg-surface-1 border border-border flex items-center justify-center p-1 shrink-0">
                    <img
                      src={getProductImageUrl(selectedProduct)}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-display font-semibold text-foreground truncate">
                      {selectedProduct.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">{selectedProduct.sku}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs shrink-0"
                    onClick={() => {
                      setSelectedProduct(null);
                      setGeneratedImages([]);
                    }}
                  >
                    Trocar
                  </Button>
                </div>

                {/* Scenarios */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Cenários ({selectedScenarios.length}/8)
                    </p>
                    <button
                      onClick={() => setSelectedScenarios(SCENARIOS.slice(0, 6).map((s) => s.id))}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Resetar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SCENARIOS.map((scenario) => {
                      const isSelected = selectedScenarios.includes(scenario.id);
                      return (
                        <button
                          key={scenario.id}
                          onClick={() => toggleScenario(scenario.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <span className="text-lg">{scenario.emoji}</span>
                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold text-foreground block truncate">
                              {scenario.label}
                            </span>
                            <span className="text-[8px] text-muted-foreground block truncate">
                              {scenario.desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  className="w-full gap-2 bg-gradient-accent text-accent-foreground h-11"
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedScenarios.length === 0}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {isGenerating ? "Gerando..." : `Gerar ${selectedScenarios.length} Variações`}
                </Button>

                <p className="text-[10px] text-muted-foreground text-center">
                  Geração real requer Lovable Cloud ativo
                </p>
              </div>

              {/* Right: Grid */}
              <div className="flex-1 overflow-auto p-4 bg-surface-1">
                {generatedImages.length > 0 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {generatedImages.map((img, i) => {
                      const scenario = SCENARIOS.find((s) => s.id === img.scenario);
                      return (
                        <motion.div
                          key={img.scenario}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="rounded-xl border border-border bg-card overflow-hidden group"
                        >
                          <div className="aspect-square bg-surface-2 flex items-center justify-center p-6 relative">
                            <img
                              src={img.url}
                              alt=""
                              className="max-w-[70%] max-h-[70%] object-contain drop-shadow-xl"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                              <Button size="sm" variant="outline" className="text-xs gap-1">
                                <Download className="w-3 h-3" /> Baixar
                              </Button>
                            </div>
                          </div>
                          <div className="p-3 border-t border-border">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{scenario?.emoji}</span>
                              <span className="text-xs font-semibold text-foreground">
                                {scenario?.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {scenario?.desc}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Grid3X3 className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <h3 className="text-sm font-display font-semibold text-foreground mb-1">
                      Selecione cenários e gere
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      O produto será inserido em cada cenário selecionado usando IA generativa
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VideoPhotodump;
