import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wand2, Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAMPLE_PROMPTS, PROMPT_CATEGORIES } from "@/features/magic-up";
import { useProducts, useCategories, useProductVariants } from "@/features/mockup";
import type { DbProduct } from "@/features/mockup";
import { useMagicUpHistory } from "@/features/magic-up";
import MagicUpLeftPanel, { STYLE_OPTIONS } from "@/features/magic-up/components/MagicUpLeftPanel";
import MagicUpProductPickerModal from "@/features/magic-up/components/MagicUpProductPickerModal";
import MagicUpResultsGrid from "@/features/magic-up/components/MagicUpResultsGrid";

function buildSmartPrompt(product: DbProduct, style: string, customText: string): string {
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

const MagicUpGenerate = () => {
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationBatches, setGenerationBatches] = useState<{
    id: string; prompt: string; productName?: string;
    variations: { id: string; imageUrl: string; favorite: boolean; selected: boolean; style: string }[];
    createdAt: string;
  }[]>([]);
  const { addGeneration: saveToHistory } = useMagicUpHistory();
  const [showPromptBank, setShowPromptBank] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("premium");
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(0);

  const { data: productsData, isLoading: productsLoading } = useProducts({ search: productSearch, page: productPage, pageSize: 12, onlyWithImages: true });
  useCategories();
  const { data: variants } = useProductVariants(selectedProduct?.id || null);
  const products = productsData?.products || [];
  const colorVariants = (variants || []).filter(v => v.color_hex);

  const smartPrompt = useMemo(() => {
    if (!selectedProduct) return "";
    return buildSmartPrompt(selectedProduct, selectedStyle, "");
  }, [selectedProduct, selectedStyle]);

  const VARIATION_STYLES = ["premium", "lifestyle", "flatlay", "minimal"];
  const VARIATION_LABELS = ["Premium", "Lifestyle", "Flat Lay", "Minimalista"];

  const handleGenerate = async () => {
    const finalPrompt = prompt.trim() || smartPrompt;
    if (!finalPrompt) return;
    setIsGenerating(true);
    setTimeout(() => {
      const batchId = Date.now().toString();
      const variations = VARIATION_STYLES.map((style, i) => ({ id: `${batchId}-${i}`, imageUrl: "/placeholder.svg", favorite: false, selected: i === 0, style: VARIATION_LABELS[i] }));
      setGenerationBatches((prev) => [{ id: batchId, prompt: finalPrompt, productName: selectedProduct?.name, variations, createdAt: new Date().toISOString() }, ...prev]);
      saveToHistory({ prompt: finalPrompt, imageUrl: "/placeholder.svg", productName: selectedProduct?.name, productSku: selectedProduct?.sku, style: STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.label });
      setIsGenerating(false);
    }, 2000);
  };

  const toggleFavorite = (batchId: string, varId: string) => {
    setGenerationBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, variations: b.variations.map((v) => v.id === varId ? { ...v, favorite: !v.favorite } : v) } : b));
  };

  const selectVariation = (batchId: string, varId: string) => {
    setGenerationBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, variations: b.variations.map((v) => ({ ...v, selected: v.id === varId })) } : b));
  };

  const applySmartPrompt = () => { if (smartPrompt) setPrompt(smartPrompt); };

  const filteredPrompts = SAMPLE_PROMPTS.filter((p) => selectedCategory === "Todos" || p.category === selectedCategory);

  return (
    <div className="h-screen flex flex-col">
      <div className="h-12 bg-surface-1 border-b border-border flex items-center px-4 shrink-0">
        <Sparkles className="w-4 h-4 text-primary mr-2" />
        <h1 className="text-sm font-display font-semibold text-foreground">Magic Up — Gerador de Imagens IA</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <MagicUpLeftPanel
          selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct}
          colorVariants={colorVariants} selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle}
          smartPrompt={smartPrompt} applySmartPrompt={applySmartPrompt}
          setPrompt={setPrompt} onOpenProductPicker={() => setShowProductPicker(true)}
        />

        <div className="flex-1 flex flex-col">
          {/* Prompt input */}
          <div className="p-4 border-b border-border">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={selectedProduct ? `Descreva detalhes extras para "${selectedProduct.name}" ou use o prompt inteligente...` : "Descreva a imagem publicitária que você deseja gerar..."}
                  className="w-full h-24 px-4 py-3 rounded-xl bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary"
                />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowPromptBank(!showPromptBank)}>
                    <Wand2 className="w-3.5 h-3.5" /> Prompts
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1.5 bg-gradient-primary text-primary-foreground" onClick={handleGenerate} disabled={isGenerating || (!prompt.trim() && !smartPrompt)}>
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Gerar
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {selectedProduct && (
                <button onClick={applySmartPrompt} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs text-primary hover:bg-primary/20 transition-colors flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Prompt Inteligente
                </button>
              )}
              {STYLE_OPTIONS.slice(0, 4).map((style) => (
                <button key={style.id} onClick={() => { setSelectedStyle(style.id); if (selectedProduct) setPrompt(buildSmartPrompt(selectedProduct, style.id, "")); }} className="px-3 py-1 rounded-full bg-surface-2 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
                  {style.emoji} {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Bank */}
          <AnimatePresence>
            {showPromptBank && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 240, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-border overflow-hidden">
                <div className="p-4 h-full overflow-auto">
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    <button onClick={() => setSelectedCategory("Todos")} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${selectedCategory === "Todos" ? "bg-primary/20 text-primary" : "bg-surface-2 text-muted-foreground hover:text-foreground"}`}>Todos</button>
                    {PROMPT_CATEGORIES.map((cat) => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${selectedCategory === cat ? "bg-primary/20 text-primary" : "bg-surface-2 text-muted-foreground hover:text-foreground"}`}>{cat}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {filteredPrompts.map((p) => (
                      <button key={p.id} onClick={() => {
                        if (selectedProduct) { setPrompt(p.prompt.replace("{product}", selectedProduct.name).replace("{technique}", selectedProduct.engraving_type || "personalização").replace("{logo}", "logo do cliente")); }
                        else { setPrompt(p.prompt); }
                        setShowPromptBank(false);
                      }} className="text-left p-3 rounded-lg bg-surface-2 border border-border hover:border-primary/40 transition-colors">
                        <h4 className="text-xs font-semibold text-foreground">{p.title}</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{p.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-auto p-4">
            <MagicUpResultsGrid
              generationBatches={generationBatches} isGenerating={isGenerating}
              selectedProduct={selectedProduct} onSelectVariation={selectVariation}
              onToggleFavorite={toggleFavorite} onOpenProductPicker={() => setShowProductPicker(true)}
            />
          </div>
        </div>
      </div>

      <MagicUpProductPickerModal
        open={showProductPicker} onClose={() => setShowProductPicker(false)}
        products={products} productsLoading={productsLoading}
        productSearch={productSearch} setProductSearch={setProductSearch}
        productPage={productPage} setProductPage={setProductPage}
        totalProducts={productsData?.total || 0}
        onSelect={(product) => { setSelectedProduct(product); setShowProductPicker(false); setPrompt(buildSmartPrompt(product, selectedStyle, "")); }}
      />
    </div>
  );
};

export default MagicUpGenerate;
