import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, ZoomIn, ZoomOut, RotateCw, Download, Save,
  ChevronDown, Move, FileText, Palette, GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAMPLE_PRODUCTS, type Product, type Technique } from "@/lib/mockup-types";
import { countUniqueColors } from "@/lib/canvas-utils";
import { generateApprovalPdf } from "@/lib/pdf-export";

const TECHNIQUES: { id: Technique; label: string; description: string; color: string }[] = [
  { id: "laser", label: "Laser", description: "Gravação monocromática", color: "text-orange-400" },
  { id: "serigrafia", label: "Serigrafia", description: "1-3 cores Pantone", color: "text-blue-400" },
  { id: "uv", label: "Digital UV", description: "Policromia completa", color: "text-green-400" },
];

const MockupNew = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAreaIdx, setSelectedAreaIdx] = useState(0);
  const [technique, setTechnique] = useState<Technique>("uv");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoColors, setLogoColors] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [placement, setPlacement] = useState({ x: 10, y: 10, scale: 0.8, rotation: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [step, setStep] = useState<"product" | "technique" | "canvas">("product");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const currentArea = selectedProduct?.areas[selectedAreaIdx];

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

  // Drag logo within area
  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - placement.x, y: e.clientY - placement.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPlacement((p) => ({ ...p, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
    }
    if (isResizing) {
      const rect = areaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = e.clientX - rect.left;
      const newScale = Math.max(0.1, Math.min(2, relX / (rect.width * 0.5)));
      setPlacement((p) => ({ ...p, scale: newScale }));
    }
  };

  const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
  };

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

  const handleExportPng = () => {
    // Compose canvas for export
    if (!selectedProduct) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1000;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const link = document.createElement("a");
    link.download = `mockup-${selectedProduct.id}-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-surface-1 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-display font-semibold text-foreground">Novo Mockup</h1>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {(["product", "technique", "canvas"] as const).map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                {i > 0 && <ChevronDown className="w-3 h-3 rotate-[-90deg]" />}
                <button
                  onClick={() => {
                    if (s === "product") setStep(s);
                    else if (selectedProduct) setStep(s);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    step === s ? "bg-primary/20 text-primary font-medium" : "hover:text-foreground"
                  } ${!selectedProduct && s !== "product" ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {i + 1}. {s === "product" ? "Produto" : s === "technique" ? "Técnica" : "Canvas"}
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5">
            <Save className="w-3.5 h-3.5" /> Salvar
          </Button>
          <Button size="sm" className="text-xs gap-1.5 bg-gradient-primary text-primary-foreground" onClick={handleExportPdf}>
            <FileText className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Step 1: Product */}
          {step === "product" && (
            <motion.div key="product" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-6 overflow-auto">
              <h2 className="text-lg font-display font-bold text-foreground mb-1">Selecione o Produto</h2>
              <p className="text-sm text-muted-foreground mb-6">Escolha o produto base para o mockup</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {SAMPLE_PRODUCTS.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => { setSelectedProduct(product); setSelectedAreaIdx(0); setStep("technique"); }}
                    className={`group relative rounded-xl border-2 transition-all overflow-hidden text-left ${
                      selectedProduct?.id === product.id ? "border-primary shadow-glow" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="aspect-square bg-surface-2 flex items-center justify-center p-4">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="p-3 bg-card">
                      <h3 className="text-sm font-semibold text-foreground">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">{product.category} · {product.areas.length} área(s)</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Technique */}
          {step === "technique" && selectedProduct && (
            <motion.div key="technique" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-6 overflow-auto">
              <h2 className="text-lg font-display font-bold text-foreground mb-1">Técnica de Personalização</h2>
              <p className="text-sm text-muted-foreground mb-6">{selectedProduct.name}</p>

              {selectedProduct.areas.length > 1 && (
                <div className="mb-6">
                  <label className="text-xs font-mono text-muted-foreground uppercase mb-2 block">Área de Personalização</label>
                  <div className="flex gap-2">
                    {selectedProduct.areas.map((area, i) => (
                      <button
                        key={area.id}
                        onClick={() => setSelectedAreaIdx(i)}
                        className={`px-4 py-2.5 rounded-lg text-sm transition-all ${
                          selectedAreaIdx === i
                            ? "bg-primary/20 text-primary border border-primary/40"
                            : "bg-surface-2 text-muted-foreground border border-border hover:border-primary/30"
                        }`}
                      >
                        {area.name}
                        <span className="block text-[10px] opacity-60 mt-0.5">{area.widthCm}×{area.heightCm}cm</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mb-8">
                {TECHNIQUES.filter((t) => currentArea?.techniques.includes(t.id)).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTechnique(t.id)}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${
                      technique === t.id ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/40 bg-surface-2"
                    }`}
                  >
                    <Palette className={`w-6 h-6 mb-2 ${technique === t.id ? "text-primary" : "text-muted-foreground"}`} />
                    <h3 className="text-sm font-semibold text-foreground">{t.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                  </button>
                ))}
              </div>

              <Button onClick={() => setStep("canvas")} className="bg-gradient-primary text-primary-foreground">
                Continuar para Canvas →
              </Button>
            </motion.div>
          )}

          {/* Step 3: Canvas */}
          {step === "canvas" && selectedProduct && (
            <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex">
              {/* Canvas area */}
              <div className="flex-1 flex flex-col">
                {/* Canvas toolbar */}
                <div className="h-10 bg-surface-1 border-b border-border flex items-center justify-between px-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2"><Move className="w-4 h-4" /></button>
                    <button onClick={() => setPlacement((p) => ({ ...p, rotation: p.rotation + 15 }))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2">
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {currentArea?.name} ({currentArea?.widthCm}×{currentArea?.heightCm}cm)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs font-mono text-muted-foreground w-12 text-center">{zoom}%</span>
                    <button onClick={() => setZoom(Math.min(400, zoom + 25))} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2"><ZoomIn className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Canvas */}
                <div
                  className="flex-1 canvas-grid flex items-center justify-center overflow-auto"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div
                    className="relative bg-surface-2 rounded-xl border border-border shadow-elevated select-none"
                    style={{ width: 500, height: 500, transform: `scale(${zoom / 100})` }}
                  >
                    {/* Product image */}
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />

                    {/* Customization area overlay */}
                    {currentArea && (
                      <div
                        ref={areaRef}
                        className="absolute border-2 border-dashed border-primary/40 rounded bg-primary/5"
                        style={{
                          left: currentArea.x,
                          top: currentArea.y,
                          width: currentArea.width,
                          height: currentArea.height,
                        }}
                      >
                        {/* Area label */}
                        <span className="absolute -top-5 left-0 text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {currentArea.name}
                        </span>

                        {/* Logo */}
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
                            {/* Resize handle */}
                            <div
                              className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-primary rounded-sm cursor-se-resize flex items-center justify-center border border-primary-foreground"
                              onMouseDown={handleResizeStart}
                            >
                              <GripVertical className="w-2.5 h-2.5 text-primary-foreground rotate-[-45deg]" />
                            </div>
                            {/* Selection border */}
                            <div className="absolute inset-0 border border-primary/60 rounded-sm pointer-events-none" />
                          </div>
                        )}

                        {/* Upload prompt in area */}
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
                    )}

                    <canvas ref={canvasRef} className="hidden" width={1200} height={1000} />
                  </div>
                </div>
              </div>

              {/* Right panel */}
              <div className="w-60 bg-surface-1 border-l border-border flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-border">
                  <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Produto</h3>
                  <p className="text-sm font-semibold text-foreground">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TECHNIQUES.find((t) => t.id === technique)?.label} · {currentArea?.name}
                  </p>
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

                {/* Dimension info */}
                {currentArea && (
                  <div className="p-4 border-b border-border">
                    <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Dimensões Reais</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-surface-2 rounded-md p-2">
                        <span className="text-muted-foreground block text-[10px]">Largura</span>
                        <span className="text-foreground font-mono">{currentArea.widthCm}cm</span>
                      </div>
                      <div className="bg-surface-2 rounded-md p-2">
                        <span className="text-muted-foreground block text-[10px]">Altura</span>
                        <span className="text-foreground font-mono">{currentArea.heightCm}cm</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Export */}
                <div className="p-4 mt-auto space-y-2">
                  <Button className="w-full gap-2 bg-gradient-primary text-primary-foreground text-xs" onClick={handleExportPdf}>
                    <FileText className="w-3.5 h-3.5" /> Layout de Aprovação (PDF)
                  </Button>
                  <Button variant="outline" className="w-full gap-2 text-xs" onClick={handleExportPng}>
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
