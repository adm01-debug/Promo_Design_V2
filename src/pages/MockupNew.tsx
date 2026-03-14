import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, ZoomIn, ZoomOut, RotateCw, Download, Save,
  ChevronDown, Move, FileText, Palette, GripVertical,
  Search, Loader2, Package, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts, useProductImages, useProductVariants, usePrintAreaTechniques, useCategories, getProductImageUrl } from "@/hooks/use-products";
import type { DbProduct, DbPrintAreaTechnique, DbProductVariant } from "@/lib/db-types";
import { countUniqueColors } from "@/lib/canvas-utils";
import { generateApprovalPdf } from "@/lib/pdf-export";

const MockupNew = () => {
  const [search, setSearch] = useState("");
  
  const [page, setPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(null);
  const [selectedArea, setSelectedArea] = useState<DbPrintAreaTechnique | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<DbProductVariant | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoColors, setLogoColors] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [placement, setPlacement] = useState({ x: 10, y: 10, scale: 0.8, rotation: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [step, setStep] = useState<"product" | "area" | "canvas">("product");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  // Data from external Supabase
  const { data: productsData, isLoading: productsLoading } = useProducts({
    search, page, pageSize: 24, onlyWithImages: false,
  });
  
  const { data: productImages } = useProductImages(selectedProduct?.id || null);
  const { data: printAreas } = usePrintAreaTechniques(selectedProduct?.id || null);
  const { data: variants } = useProductVariants(selectedProduct?.id || null);

  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = Math.ceil(totalProducts / 24);

  // Get best display image — variant thumbnail > color-matched image > primary > fallback
  const selectedProductImage = selectedProduct
    ? (
        selectedVariant?.selected_thumbnail ||
        productImages?.find(i => selectedVariant?.id && i.variant_id === selectedVariant.id)?.url_cdn ||
        productImages?.find(i => selectedVariant?.color_name && i.applies_to_color && i.color_id === selectedVariant.id)?.url_cdn ||
        productImages?.find(i => i.is_primary)?.url_cdn ||
        getProductImageUrl(selectedProduct)
      )
    : null;

  // Color variants with hex colors
  const colorVariants = (variants || []).filter(v => v.color_hex);

  const handleLogoUpload = useCallback((file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setLogoPreview(dataUrl);
      const img = new window.Image();
      img.onload = () => setLogoColors(countUniqueColors(img));
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleLogoUpload(file);
  }, [handleLogoUpload]);

  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - placement.x, y: e.clientY - placement.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setPlacement((p) => ({ ...p, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
    if (isResizing) {
      const rect = areaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = e.clientX - rect.left;
      setPlacement((p) => ({ ...p, scale: Math.max(0.1, Math.min(2, relX / (rect.width * 0.5))) }));
    }
  };

  const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };

  const handleExportPdf = () => {
    if (!selectedProduct || !selectedArea) return;
    const pdf = generateApprovalPdf({
      productName: selectedProduct.name,
      technique: selectedProduct.engraving_type || "N/A",
      dimensions: { width: selectedArea.max_width, height: selectedArea.max_height },
      colors: logoColors.slice(0, 5),
      area: selectedArea.location_name,
      date: new Date().toLocaleDateString("pt-BR"),
      mockupImageDataUrl: "",
    });
    pdf.save(`mockup-${selectedProduct.sku}-${Date.now()}.pdf`);
  };


  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-display font-semibold text-foreground">Novo Mockup</h1>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {(["product", "area", "canvas"] as const).map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                {i > 0 && <ChevronDown className="w-3 h-3 rotate-[-90deg]" />}
                <button
                  onClick={() => {
                    if (s === "product") setStep(s);
                    else if (s === "area" && selectedProduct) setStep(s);
                    else if (s === "canvas" && selectedArea) setStep(s);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    step === s ? "bg-primary/20 text-primary font-medium" : "hover:text-foreground"
                  }`}
                >
                  {i + 1}. {s === "product" ? "Produto" : s === "area" ? "Área / Técnica" : "Canvas"}
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5"><Save className="w-3.5 h-3.5" /> Salvar</Button>
          <Button size="sm" className="text-xs gap-1.5 bg-gradient-primary text-primary-foreground" onClick={handleExportPdf}>
            <FileText className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {/* STEP 1: Product selection from DB */}
          {step === "product" && (
            <motion.div key="product" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
              {/* Search & filters */}
              <div className="p-4 border-b border-border space-y-3 shrink-0">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar produto por nome ou SKU... (6.100+ produtos)"
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => { setSelectedCategoryId(undefined); setPage(0); }}
                    className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 ${
                      !selectedCategoryId ? "bg-primary/20 text-primary border border-primary/40" : "bg-surface-2 text-muted-foreground border border-border hover:text-foreground"
                    }`}
                  >
                    Todos ({totalProducts})
                  </button>
                  {topCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategoryId(cat.id); setPage(0); }}
                      className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors shrink-0 ${
                        selectedCategoryId === cat.id ? "bg-primary/20 text-primary border border-primary/40" : "bg-surface-2 text-muted-foreground border border-border hover:text-foreground"
                      }`}
                    >
                      {cat.name} ({cat.products_count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Product grid */}
              <div className="flex-1 overflow-auto p-4">
                {productsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando produtos...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Package className="w-10 h-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                      {products.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct(product);
                            setSelectedArea(null);
                            setSelectedVariant(null);
                            setStep("area");
                          }}
                          className={`group rounded-lg border transition-all overflow-hidden text-left ${
                            selectedProduct?.id === product.id ? "border-primary shadow-glow" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="aspect-square bg-surface-2 flex items-center justify-center p-2 relative">
                            <img
                              src={getProductImageUrl(product)}
                              alt={product.name}
                              className="w-full h-full object-contain"
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                            />
                            {product.allows_personalization && (
                              <span className="absolute top-1 right-1 text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">
                                PERS
                              </span>
                            )}
                          </div>
                          <div className="p-2 bg-card">
                            <h3 className="text-xs font-semibold text-foreground truncate">{product.name}</h3>
                            <p className="text-[10px] text-muted-foreground truncate">{product.sku}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs">
                          <ChevronLeft className="w-3 h-3" /> Anterior
                        </Button>
                        <span className="text-xs text-muted-foreground font-mono">
                          {page + 1} / {totalPages}
                        </span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs">
                          Próximo <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Area & technique selection */}
          {step === "area" && selectedProduct && (
            <motion.div key="area" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-6 overflow-auto">
              <div className="flex items-center gap-4 mb-6">
                {selectedProductImage && (
                  <div className="w-24 h-24 rounded-lg bg-surface-2 border border-border flex items-center justify-center p-2 shrink-0">
                    <img src={selectedProductImage} alt="" className="w-full h-full object-contain" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-display font-bold text-foreground">{selectedProduct.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedProduct.sku} · {selectedProduct.brand || "Sem marca"}</p>
                  {selectedProduct.engraving_type && (
                    <p className="text-xs text-primary mt-1 font-mono">{selectedProduct.engraving_type}</p>
                  )}
                </div>
              </div>

              {/* Color variants */}
              {colorVariants.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-display font-semibold text-foreground mb-3">Cores Disponíveis</h3>
                  <div className="flex flex-wrap gap-2">
                    {colorVariants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(selectedVariant?.id === variant.id ? null : variant)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-left ${
                          selectedVariant?.id === variant.id
                            ? "border-primary bg-primary/10 shadow-glow"
                            : "border-border hover:border-primary/40 bg-surface-2"
                        }`}
                        title={variant.color_name || variant.name}
                      >
                        <div
                          className="w-5 h-5 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: variant.color_hex || "#ccc" }}
                        />
                        <span className="text-xs text-foreground">{variant.color_name || variant.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Also show product.colors if no variants */}
              {colorVariants.length === 0 && selectedProduct.colors && selectedProduct.colors.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-display font-semibold text-foreground mb-3">Cores</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.colors.map((color, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs text-foreground">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="text-sm font-display font-semibold text-foreground mb-3">Áreas de Personalização</h3>

              {!printAreas || printAreas.length === 0 ? (
                <div className="p-4 rounded-xl bg-surface-2 border border-border text-center">
                  <p className="text-sm text-muted-foreground mb-2">Nenhuma área de personalização cadastrada para este produto.</p>
                  <p className="text-xs text-muted-foreground">Você pode prosseguir com área manual.</p>
                  <Button
                    className="mt-3 bg-gradient-primary text-primary-foreground"
                    onClick={() => {
                      setSelectedArea({
                        id: "manual",
                        product_id: selectedProduct.id,
                        tabela_preco_id: "",
                        max_width: selectedProduct.width_cm || 10,
                        max_height: selectedProduct.height_cm || 10,
                        is_curved: false,
                        shape: "rectangle",
                        location_code: "FRONTAL",
                        location_name: "Área Manual",
                        location_order: 1,
                        gravacao_largura_max: selectedProduct.width_cm || 10,
                        gravacao_altura_max: selectedProduct.height_cm || 10,
                        is_active: true,
                      });
                      setStep("canvas");
                    }}
                  >
                    Usar Área Manual →
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {printAreas.map((area) => (
                    <button
                      key={area.id}
                      onClick={() => { setSelectedArea(area); setStep("canvas"); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedArea?.id === area.id ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/40 bg-surface-2"
                      }`}
                    >
                      <Palette className={`w-5 h-5 mb-2 ${selectedArea?.id === area.id ? "text-primary" : "text-muted-foreground"}`} />
                      <h4 className="text-sm font-semibold text-foreground">{area.location_name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {area.max_width}×{area.max_height}cm · {area.shape}
                        {area.is_curved && " · Curvo"}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-1">{area.location_code}</p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: Canvas */}
          {step === "canvas" && selectedProduct && selectedArea && (
            <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex">
              <div className="flex-1 flex flex-col">
                <div className="h-10 bg-surface-1 border-b border-border flex items-center justify-between px-3">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2"><Move className="w-4 h-4" /></button>
                    <button onClick={() => setPlacement((p) => ({ ...p, rotation: p.rotation + 15 }))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2">
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {selectedArea.location_name} ({selectedArea.max_width}×{selectedArea.max_height}cm)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs font-mono text-muted-foreground w-12 text-center">{zoom}%</span>
                    <button onClick={() => setZoom(Math.min(400, zoom + 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2"><ZoomIn className="w-4 h-4" /></button>
                  </div>
                </div>

                <div
                  className="flex-1 canvas-grid flex items-center justify-center overflow-auto"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div
                    className="relative bg-white rounded-xl border border-border shadow-elevated select-none"
                    style={{ width: 500, height: 500, transform: `scale(${zoom / 100})` }}
                  >
                    {selectedProductImage && (
                      <img
                        src={selectedProductImage}
                        alt={selectedProduct.name}
                        className="w-full h-full object-contain pointer-events-none"
                        draggable={false}
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                      />
                    )}

                    {/* Customization area */}
                    <div
                      ref={areaRef}
                      className="absolute border-2 border-dashed border-primary/40 rounded bg-primary/5"
                      style={{
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: Math.min(selectedArea.max_width * 20, 400),
                        height: Math.min(selectedArea.max_height * 20, 400),
                      }}
                    >
                      <span className="absolute -top-5 left-0 text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {selectedArea.location_name}
                      </span>

                      {logoPreview && (
                        <div
                          className={`absolute cursor-move ${isDragging ? "opacity-80" : ""}`}
                          style={{
                            left: placement.x,
                            top: placement.y,
                            width: `${placement.scale * 100}%`,
                            transform: `rotate(${placement.rotation}deg)`,
                          }}
                          onMouseDown={handleLogoMouseDown}
                        >
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-contain pointer-events-none" draggable={false} />
                          <div
                            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-sm cursor-se-resize flex items-center justify-center border border-primary-foreground"
                            onMouseDown={(e) => { e.stopPropagation(); setIsResizing(true); }}
                          >
                            <GripVertical className="w-2.5 h-2.5 text-primary-foreground rotate-[-45deg]" />
                          </div>
                          <div className="absolute inset-0 border border-primary/60 rounded-sm pointer-events-none" />
                        </div>
                      )}

                      {!logoPreview && (
                        <div
                          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors rounded"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-6 h-6 text-primary/60 mb-1" />
                          <span className="text-[10px] text-primary/60 font-mono">Soltar logo aqui</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right panel */}
              <div className="w-60 bg-surface-1 border-l border-border flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-border">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Produto</h3>
                  <p className="text-sm font-semibold text-foreground truncate">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedProduct.sku}</p>
                  {selectedProduct.engraving_type && (
                    <p className="text-[10px] text-primary font-mono mt-1">{selectedProduct.engraving_type}</p>
                  )}
                  {/* Variant color swatches in canvas panel */}
                  {colorVariants.length > 0 && (
                    <div className="mt-3">
                      <label className="text-[10px] font-mono text-muted-foreground uppercase">Cor</label>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {colorVariants.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              selectedVariant?.id === v.id ? "border-primary scale-110 shadow-glow" : "border-border hover:border-primary/40"
                            }`}
                            style={{ backgroundColor: v.color_hex || "#ccc" }}
                            title={v.color_name || v.name}
                          />
                        ))}
                      </div>
                      {selectedVariant && (
                        <p className="text-[10px] text-foreground mt-1">{selectedVariant.color_name || selectedVariant.name}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 border-b border-border">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Logo</h3>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                  />
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {logoFile ? logoFile.name : "Upload Logo"}
                  </Button>

                  {logoColors.length > 0 && (
                    <div className="mt-3">
                      <label className="text-[10px] font-mono text-muted-foreground uppercase">Cores Detectadas</label>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {logoColors.slice(0, 6).map((color, i) => (
                          <div key={i} className="w-5 h-5 rounded border border-border" style={{ backgroundColor: color }} title={color} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-b border-border">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Posição</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground flex justify-between">
                        Escala <span>{Math.round(placement.scale * 100)}%</span>
                      </label>
                      <input type="range" min="0.1" max="2" step="0.05" value={placement.scale}
                        onChange={(e) => setPlacement((p) => ({ ...p, scale: parseFloat(e.target.value) }))}
                        className="w-full mt-1 accent-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-muted-foreground">Rotação</label>
                      <div className="flex gap-2 mt-1">
                        <input type="number" value={placement.rotation}
                          onChange={(e) => setPlacement((p) => ({ ...p, rotation: parseInt(e.target.value) || 0 }))}
                          className="flex-1 px-2 py-1 rounded-md bg-surface-2 border border-border text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                        />
                        <span className="text-xs text-muted-foreground self-center">°</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-b border-border">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Área de Gravação</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface-2 rounded-md p-2">
                      <span className="text-muted-foreground block text-[10px]">Largura</span>
                      <span className="text-foreground font-mono">{selectedArea.max_width}cm</span>
                    </div>
                    <div className="bg-surface-2 rounded-md p-2">
                      <span className="text-muted-foreground block text-[10px]">Altura</span>
                      <span className="text-foreground font-mono">{selectedArea.max_height}cm</span>
                    </div>
                  </div>
                  <div className="mt-2 bg-surface-2 rounded-md p-2 text-xs">
                    <span className="text-muted-foreground block text-[10px]">Formato</span>
                    <span className="text-foreground font-mono">{selectedArea.shape} {selectedArea.is_curved ? "(curvo)" : ""}</span>
                  </div>
                </div>

                <div className="p-4 mt-auto space-y-2">
                  <Button className="w-full gap-2 bg-gradient-primary text-primary-foreground text-xs" onClick={handleExportPdf}>
                    <FileText className="w-3.5 h-3.5" /> Layout de Aprovação (PDF)
                  </Button>
                  <Button variant="outline" className="w-full gap-2 text-xs">
                    <Download className="w-3.5 h-3.5" /> Baixar PNG
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MockupNew;
