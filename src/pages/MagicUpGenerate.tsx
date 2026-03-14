import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, Sparkles, Send, Image, Heart,
  Copy, ChevronDown, Loader2,
  Search, Package, ChevronLeft, X, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAMPLE_PROMPTS, PROMPT_CATEGORIES } from "@/lib/mockup-types";
import { useProducts, useCategories, useProductVariants, getProductImageUrl } from "@/hooks/use-products";
import type { DbProduct } from "@/lib/db-types";
import { useMagicUpHistory } from "@/hooks/use-magicup-history";
import PromptGenerator from "@/components/PromptGenerator";
import DownloadMenu from "@/components/DownloadMenu";

/** Build a context-aware prompt from product data + user intent */
function buildSmartPrompt(product: DbProduct, style: string, customText: string): string {
  const productDesc = product.short_description || product.name;
  const colors = product.colors?.length ? product.colors.join(", ") : "";
  const material = product.engraving_type || "";
  const shape = product.shape_type || "";

  const styleMap: Record<string, string> = {
    "premium": `Professional product photography of "${product.name}" on a dark executive desk, warm ambient lighting, shallow depth of field, premium corporate feel, photorealistic`,
    "flatlay": `Clean flat lay product photography of "${product.name}" on white marble surface, centered with minimal props, soft natural overhead light, e-commerce ready, ultra sharp`,
    "lifestyle": `Modern lifestyle scene with "${product.name}" in daily use, natural environment, authentic feel, bokeh background, Instagram-worthy composition`,
    "corporate": `Corporate gift set arrangement featuring "${product.name}", elegant presentation, branded items, professional studio lighting, catalog quality`,
    "ecommerce": `E-commerce product photo of "${product.name}" on pure white background, centered, even lighting, high resolution, Amazon/Shopify ready`,
    "social": `Eye-catching social media post featuring "${product.name}", vibrant colors, modern design, trending aesthetic, square format`,
    "outdoor": `${product.name} photographed in outdoor natural setting, golden hour lighting, depth of field, lifestyle brand aesthetic`,
    "minimal": `Minimalist product shot of "${product.name}", negative space, single accent color, editorial magazine style`,
  };

  let base = styleMap[style] || styleMap["premium"];

  if (colors) base += `, product colors: ${colors}`;
  if (material) base += `, customization: ${material}`;
  if (shape) base += `, ${shape} shape`;
  if (customText) base += `. ${customText}`;

  return base;
}

const STYLE_OPTIONS = [
  { id: "premium", label: "Premium", emoji: "✨" },
  { id: "flatlay", label: "Flat Lay", emoji: "📐" },
  { id: "lifestyle", label: "Lifestyle", emoji: "🌿" },
  { id: "corporate", label: "Corporativo", emoji: "🏢" },
  { id: "ecommerce", label: "E-commerce", emoji: "🛒" },
  { id: "social", label: "Redes Sociais", emoji: "📱" },
  { id: "outdoor", label: "Outdoor", emoji: "🌅" },
  { id: "minimal", label: "Minimalista", emoji: "◻️" },
];

const MagicUpGenerate = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generations, setGenerations] = useState<{ id: string; prompt: string; imageUrl: string; favorite: boolean; productName?: string }[]>([]);
  const { addGeneration: saveToHistory } = useMagicUpHistory();
  const [showPromptBank, setShowPromptBank] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Product selection
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("premium");
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(0);

  const { data: productsData, isLoading: productsLoading } = useProducts({
    search: productSearch, page: productPage, pageSize: 12, onlyWithImages: true,
  });
  const { data: categories } = useCategories();
  const { data: variants } = useProductVariants(selectedProduct?.id || null);

  const products = productsData?.products || [];
  const colorVariants = (variants || []).filter(v => v.color_hex);

  // Auto-generate smart prompt when product + style changes
  const smartPrompt = useMemo(() => {
    if (!selectedProduct) return "";
    return buildSmartPrompt(selectedProduct, selectedStyle, "");
  }, [selectedProduct, selectedStyle]);

  const handleGenerate = async () => {
    const finalPrompt = prompt.trim() || smartPrompt;
    if (!finalPrompt) return;
    setIsGenerating(true);
    // Simulate generation - will use edge function when Cloud is enabled
    setTimeout(() => {
      const entry = {
        id: Date.now().toString(),
        prompt: finalPrompt,
        imageUrl: "/placeholder.svg",
        favorite: false,
        productName: selectedProduct?.name,
      };
      setGenerations((prev) => [entry, ...prev]);
      // Persist to shared history
      saveToHistory({
        prompt: finalPrompt,
        imageUrl: "/placeholder.svg",
        productName: selectedProduct?.name,
        productSku: selectedProduct?.sku,
        style: STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.label,
      });
      setIsGenerating(false);
    }, 2000);
  };

  const toggleFavorite = (id: string) => {
    setGenerations((prev) =>
      prev.map((g) => (g.id === id ? { ...g, favorite: !g.favorite } : g))
    );
  };

  const applySmartPrompt = () => {
    if (smartPrompt) setPrompt(smartPrompt);
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
        {/* Left: Product context panel */}
        <div className="w-72 bg-surface-1 border-r border-border flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-border">
            <h2 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Produto de Referência</h2>
            {selectedProduct ? (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-2 border border-border">
                <div className="w-12 h-12 rounded-md bg-card flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={getProductImageUrl(selectedProduct)}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{selectedProduct.name}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedProduct.sku}</p>
                </div>
                <button
                  onClick={() => { setSelectedProduct(null); setPrompt(""); }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={() => setShowProductPicker(true)}
              >
                <Package className="w-3.5 h-3.5" /> Selecionar Produto
              </Button>
            )}
          </div>

          {/* Product colors */}
          {selectedProduct && (
            <div className="p-3 border-b border-border">
              <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Cores do Produto</h3>
              {colorVariants.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {colorVariants.map((v) => (
                    <div
                      key={v.id}
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: v.color_hex || "#ccc" }}
                      title={v.color_name || v.name}
                    />
                  ))}
                </div>
              ) : selectedProduct.colors?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedProduct.colors.map((c, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-surface-2 border border-border text-foreground">{c}</span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">Sem cores definidas</p>
              )}
            </div>
          )}

          {/* Style selector */}
          <div className="p-3 border-b border-border">
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Estilo Visual</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`px-2 py-1.5 rounded-md text-xs text-left transition-all ${
                    selectedStyle === style.id
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-surface-2 text-muted-foreground border border-border hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  {style.emoji} {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Smart prompt preview */}
          {selectedProduct && smartPrompt && (
            <div className="p-3 flex-1 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Prompt Inteligente</h3>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-primary" onClick={applySmartPrompt}>
                  <Wand2 className="w-3 h-3" /> Usar
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed font-mono bg-surface-2 rounded-lg p-2 border border-border">
                {smartPrompt}
              </p>
            </div>
          )}

          {/* Product info */}
          {selectedProduct && (
            <div className="p-3 border-t border-border mt-auto">
              <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Detalhes</h3>
              <div className="space-y-1 text-[10px]">
                {selectedProduct.brand && (
                  <p className="text-muted-foreground">Marca: <span className="text-foreground">{selectedProduct.brand}</span></p>
                )}
                {selectedProduct.engraving_type && (
                  <p className="text-muted-foreground">Gravação: <span className="text-primary font-mono">{selectedProduct.engraving_type}</span></p>
                )}
                {selectedProduct.shape_type && (
                  <p className="text-muted-foreground">Formato: <span className="text-foreground">{selectedProduct.shape_type}</span></p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col">
          {/* Prompt input */}
          <div className="p-4 border-b border-border">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={selectedProduct
                    ? `Descreva detalhes extras para "${selectedProduct.name}" ou use o prompt inteligente...`
                    : "Descreva a imagem publicitária que você deseja gerar..."
                  }
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
                    disabled={isGenerating || (!prompt.trim() && !smartPrompt)}
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

            {/* Quick style tags */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {selectedProduct && (
                <button
                  onClick={applySmartPrompt}
                  className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Prompt Inteligente
                </button>
              )}
              {STYLE_OPTIONS.slice(0, 4).map((style) => (
                <button
                  key={style.id}
                  onClick={() => {
                    setSelectedStyle(style.id);
                    if (selectedProduct) {
                      setPrompt(buildSmartPrompt(selectedProduct, style.id, ""));
                    }
                  }}
                  className="px-3 py-1 rounded-full bg-surface-2 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  {style.emoji} {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Bank panel */}
          <AnimatePresence>
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
                        onClick={() => {
                          // If product selected, merge template with product context
                          if (selectedProduct) {
                            const merged = p.prompt
                              .replace("{product}", selectedProduct.name)
                              .replace("{technique}", selectedProduct.engraving_type || "personalização")
                              .replace("{logo}", "logo do cliente");
                            setPrompt(merged);
                          } else {
                            setPrompt(p.prompt);
                          }
                          setShowPromptBank(false);
                        }}
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
          </AnimatePresence>

          {/* Generated images */}
          <div className="flex-1 overflow-auto p-4">
            {generations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                  <Image className="w-9 h-9 text-muted-foreground" />
                </div>
                <p className="text-sm font-display font-semibold text-foreground mb-1">Nenhuma geração ainda</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {selectedProduct ? `Selecione um estilo e gere para "${selectedProduct.name}"` : "Selecione um produto ou digite um prompt"}
                </p>
                {!selectedProduct && (
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowProductPicker(true)}>
                    <Package className="w-3.5 h-3.5" /> Começar com um Produto
                  </Button>
                )}
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
                      {gen.productName && (
                        <p className="text-[10px] text-primary font-mono mb-1">{gen.productName}</p>
                      )}
                      <p className="text-xs text-muted-foreground line-clamp-2">{gen.prompt}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      <AnimatePresence>
        {showProductPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8"
            onClick={() => setShowProductPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-3xl max-h-[70vh] bg-card rounded-2xl border border-border shadow-elevated flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <h2 className="text-sm font-display font-semibold text-foreground">Selecionar Produto</h2>
                <button onClick={() => setShowProductPicker(false)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 border-b border-border shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou SKU..."
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setProductPage(0); }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {productsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowProductPicker(false);
                          setPrompt(buildSmartPrompt(product, selectedStyle, ""));
                        }}
                        className="rounded-lg border border-border hover:border-primary/40 overflow-hidden text-left transition-all hover:shadow-glow"
                      >
                        <div className="aspect-square bg-surface-2 flex items-center justify-center p-2">
                          <img
                            src={getProductImageUrl(product)}
                            alt={product.name}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                          />
                        </div>
                        <div className="p-2">
                          <h3 className="text-[10px] font-semibold text-foreground truncate">{product.name}</h3>
                          <p className="text-[9px] text-muted-foreground truncate">{product.sku}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {(productsData?.total || 0) > 12 && (
                <div className="p-3 border-t border-border flex items-center justify-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" disabled={productPage === 0} onClick={() => setProductPage(p => p - 1)} className="text-xs">
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono">
                    {productPage + 1} / {Math.ceil((productsData?.total || 0) / 12)}
                  </span>
                  <Button variant="outline" size="sm" disabled={productPage >= Math.ceil((productsData?.total || 0) / 12) - 1} onClick={() => setProductPage(p => p + 1)} className="text-xs">
                    <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MagicUpGenerate;
