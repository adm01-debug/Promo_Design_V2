import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, ZoomIn, ZoomOut, RotateCw, Download, Save,
  ChevronDown, Move, Maximize2, FileText, Palette, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAMPLE_PRODUCTS, type Product, type Technique, type LogoPlacement } from "@/lib/mockup-types";
import { processLogoForLaser, countUniqueColors, loadImageWithFallback } from "@/lib/canvas-utils";
import { generateApprovalPdf } from "@/lib/pdf-export";

const TECHNIQUES: { id: Technique; label: string; description: string }[] = [
  { id: "laser", label: "Laser", description: "Gravação monocromática" },
  { id: "serigrafia", label: "Serigrafia", description: "1-3 cores Pantone" },
  { id: "uv", label: "Digital UV", description: "Policromia completa" },
];

const MockupNew = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAreaIdx, setSelectedAreaIdx] = useState(0);
  const [technique, setTechnique] = useState<Technique>("uv");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoColors, setLogoColors] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [placement, setPlacement] = useState<{ x: number; y: number; scale: number; rotation: number }>({
    x: 0, y: 0, scale: 1, rotation: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [step, setStep] = useState<"product" | "technique" | "canvas">("product");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentArea = selectedProduct?.areas[selectedAreaIdx];

  // Handle logo upload
  const handleLogoUpload = useCallback(async (file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setLogoPreview(dataUrl);

      // Analyze colors
      const img = new window.Image();
      img.onload = () => {
        const colors = countUniqueColors(img);
        setLogoColors(colors);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleLogoUpload(file);
    }
  }, [handleLogoUpload]);

  // Canvas mouse handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - placement.x, y: e.clientY - placement.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPlacement((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handleCanvasMouseUp = () => setIsDragging(false);

  // Export PDF
  const handleExportPdf = () => {
    if (!selectedProduct || !currentArea) return;

    const canvas = canvasRef.current;
    const dataUrl = canvas?.toDataURL("image/png") || "";

    const pdf = generateApprovalPdf({
      productName: selectedProduct.name,
      technique: TECHNIQUES.find((t) => t.id === technique)?.label || technique,
      dimensions: { width: currentArea.widthCm, height: currentArea.heightCm },
      colors: logoColors.slice(0, 5),
      area: currentArea.name,
      date: new Date().toLocaleDateString("pt-BR"),
      mockupImageDataUrl: dataUrl,
    });

    pdf.save(`mockup-${selectedProduct.id}-${Date.now()}.pdf`);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-display font-semibold text-foreground">Novo Mockup</h1>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <button
              onClick={() => setStep("product")}
              className={`px-2 py-1 rounded ${step === "product" ? "bg-primary/20 text-primary" : "hover:text-foreground"}`}
            >
              1. Produto
            </button>
            <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
            <button
              onClick={() => selectedProduct && setStep("technique")}
              className={`px-2 py-1 rounded ${step === "technique" ? "bg-primary/20 text-primary" : "hover:text-foreground"} ${!selectedProduct ? "opacity-40" : ""}`}
            >
              2. Técnica
            </button>
            <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
            <button
              onClick={() => selectedProduct && setStep("canvas")}
              className={`px-2 py-1 rounded ${step === "canvas" ? "bg-primary/20 text-primary" : "hover:text-foreground"} ${!selectedProduct ? "opacity-40" : ""}`}
            >
              3. Canvas
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5">
            <Save className="w-3.5 h-3.5" /> Salvar Rascunho
          </Button>
          <Button size="sm" className="text-xs gap-1.5 bg-gradient-primary text-primary-foreground" onClick={handleExportPdf}>
            <FileText className="w-3.5 h-3.5" /> Exportar PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Step: Product Selection */}
        <AnimatePresence mode="wait">
          {step === "product" && (
            <motion.div
              key="product"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-6 overflow-auto"
            >
              <h2 className="text-lg font-display font-bold text-foreground mb-1">Selecione o Produto</h2>
              <p className="text-sm text-muted-foreground mb-6">Escolha o produto base para o mockup</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {SAMPLE_PRODUCTS.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => { setSelectedProduct(product); setStep("technique"); }}
                    className={`group relative rounded-xl border-2 transition-all overflow-hidden text-left ${
                      selectedProduct?.id === product.id
                        ? "border-primary shadow-glow"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="aspect-square bg-surface-2 flex items-center justify-center">
                      <img src={product.imageUrl} alt={product.name} className="w-3/4 h-3/4 object-contain opacity-60" />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">{product.category} · {product.areas.length} área(s)</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "technique" && selectedProduct && (
            <motion.div
              key="technique"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-6 overflow-auto"
            >
              <h2 className="text-lg font-display font-bold text-foreground mb-1">Técnica de Personalização</h2>
              <p className="text-sm text-muted-foreground mb-6">{selectedProduct.name}</p>

              {/* Area selector */}
              {selectedProduct.areas.length > 1 && (
                <div className="mb-6">
                  <label className="text-xs font-mono text-muted-foreground uppercase mb-2 block">Área</label>
                  <div className="flex gap-2">
                    {selectedProduct.areas.map((area, i) => (
                      <button
                        key={area.id}
                        onClick={() => setSelectedAreaIdx(i)}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          selectedAreaIdx === i
                            ? "bg-primary/20 text-primary border border-primary/40"
                            : "bg-surface-2 text-muted-foreground border border-border hover:border-primary/30"
                        }`}
                      >
                        {area.name}
                        <span className="block text-[10px] opacity-60">{area.widthCm}×{area.heightCm}cm</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Techniques */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {TECHNIQUES.filter((t) => currentArea?.techniques.includes(t.id)).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTechnique(t.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      technique === t.id
                        ? "border-primary bg-primary/10 shadow-glow"
                        : "border-border hover:border-primary/40 bg-surface-2"
                    }`}
                  >
                    <Palette className={`w-6 h-6 mb-2 ${technique === t.id ? "text-primary" : "text-muted-foreground"}`} />
                    <h3 className="text-sm font-semibold text-foreground">{t.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setStep("canvas")}
                className="bg-gradient-primary text-primary-foreground"
              >
                Continuar para Canvas →
              </Button>
            </motion.div>
          )}

          {step === "canvas" && selectedProduct && (
            <motion.div
              key="canvas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex"
            >
              {/* Canvas area */}
              <div className="flex-1 flex flex-col">
                {/* Canvas toolbar */}
                <div className="h-10 bg-surface-1 border-b border-border flex items-center justify-between px-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2">
                      <Move className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPlacement((p) => ({ ...p, rotation: p.rotation + 15 }))}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2">
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-muted-foreground w-12 text-center">{zoom}%</span>
                    <button onClick={() => setZoom(Math.min(400, zoom + 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2">
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Canvas */}
                <div
                  className="flex-1 canvas-grid flex items-center justify-center overflow-auto"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div
                    className="relative bg-card rounded-xl border border-border shadow-elevated"
                    style={{
                      width: 600,
                      height: 500,
                      transform: `scale(${zoom / 100})`,
                    }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                  >
                    {/* Product image */}
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain opacity-80"
                    />

                    {/* Customization area overlay */}
                    {currentArea && (
                      <div
                        className="absolute border-2 border-dashed border-primary/50 rounded-md"
                        style={{
                          left: currentArea.x,
                          top: currentArea.y,
                          width: currentArea.width,
                          height: currentArea.height,
                        }}
                      >
                        <span className="absolute -top-5 left-0 text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {currentArea.name} ({currentArea.widthCm}×{currentArea.heightCm}cm)
                        </span>

                        {/* Logo overlay */}
                        {logoPreview && (
                          <img
                            src={logoPreview}
                            alt="Logo"
                            className="absolute cursor-move"
                            style={{
                              left: placement.x,
                              top: placement.y,
                              width: `${placement.scale * 100}%`,
                              transform: `rotate(${placement.rotation}deg)`,
                            }}
                            draggable={false}
                          />
                        )}
                      </div>
                    )}

                    {/* Upload prompt */}
                    {!logoPreview && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="text-center cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-semibold text-foreground">Arraste sua logo aqui</p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, SVG, JPG</p>
                        </div>
                      </div>
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                </div>
              </div>

              {/* Right panel - Properties */}
              <div className="w-64 bg-surface-1 border-l border-border flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-border">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Produto</h3>
                  <p className="text-sm font-semibold text-foreground">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground">{TECHNIQUES.find((t) => t.id === technique)?.label}</p>
                </div>

                <div className="p-4 border-b border-border">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Logo</h3>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {logoFile ? logoFile.name : "Upload Logo"}
                  </Button>

                  {logoColors.length > 0 && (
                    <div className="mt-3">
                      <label className="text-[10px] font-mono text-muted-foreground uppercase">Cores Detectadas</label>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {logoColors.slice(0, 6).map((color, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded border border-border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-b border-border">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Posição</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-mono text-muted-foreground">Escala</label>
                        <input
                          type="range"
                          min="0.2"
                          max="2"
                          step="0.05"
                          value={placement.scale}
                          onChange={(e) => setPlacement((p) => ({ ...p, scale: parseFloat(e.target.value) }))}
                          className="w-full mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-muted-foreground">Rotação</label>
                        <input
                          type="number"
                          value={placement.rotation}
                          onChange={(e) => setPlacement((p) => ({ ...p, rotation: parseInt(e.target.value) || 0 }))}
                          className="w-full mt-1 px-2 py-1 rounded-md bg-surface-2 border border-border text-xs font-mono text-foreground"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Export buttons */}
                <div className="p-4 mt-auto space-y-2">
                  <Button className="w-full gap-2 bg-gradient-primary text-primary-foreground text-sm" onClick={handleExportPdf}>
                    <FileText className="w-4 h-4" /> Layout PDF
                  </Button>
                  <Button variant="outline" className="w-full gap-2 text-sm">
                    <Download className="w-4 h-4" /> Baixar PNG
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
