import { motion } from "framer-motion";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DbProduct, DbPrintAreaTechnique, DbProductVariant } from "@/features/mockup";
import { MOCKUP_TEMPLATES } from "@/features/mockup/hooks/use-mockup-editor";

interface MockupAreaStepProps {
  selectedProduct: DbProduct;
  selectedProductImage: string | null;
  colorVariants: DbProductVariant[];
  selectedVariant: DbProductVariant | null;
  setSelectedVariant: (v: DbProductVariant | null) => void;
  selectedTemplate: string | null;
  setSelectedTemplate: (id: string) => void;
  selectedArea: DbPrintAreaTechnique | null;
  printAreas: DbPrintAreaTechnique[] | undefined;
  onSelectArea: (area: DbPrintAreaTechnique) => void;
  onSelectTemplate: (templateId: string, area: DbPrintAreaTechnique) => void;
  onManualArea: () => void;
}

const MockupAreaStep = ({
  selectedProduct, selectedProductImage, colorVariants, selectedVariant, setSelectedVariant,
  selectedTemplate, printAreas, selectedArea, onSelectArea, onSelectTemplate, onManualArea,
}: MockupAreaStepProps) => (
  <motion.div key="area" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 p-6 overflow-auto">
    <div className="flex items-center gap-4 mb-6">
      {selectedProductImage && (
        <div className="w-24 h-24 rounded-lg bg-muted border border-border flex items-center justify-center p-2 shrink-0">
          <img src={selectedProductImage} alt="" className="w-full h-full object-contain" />
        </div>
      )}
      <div>
        <h2 className="text-lg font-bold text-foreground">{selectedProduct.name}</h2>
        <p className="text-sm text-muted-foreground">{selectedProduct.sku} · {selectedProduct.brand || "Sem marca"}</p>
        {selectedProduct.engraving_type && (
          <span className="inline-block text-xs text-primary mt-1 font-mono bg-primary/10 px-2 py-0.5 rounded">{selectedProduct.engraving_type}</span>
        )}
      </div>
    </div>

    {colorVariants.length > 0 && (
      <div className="mb-6">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Cores Disponíveis</h3>
        <div className="flex flex-wrap gap-2">
          {colorVariants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => setSelectedVariant(selectedVariant?.id === variant.id ? null : variant)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-left ${
                selectedVariant?.id === variant.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <div className="w-5 h-5 rounded-full border border-border shrink-0" style={{ backgroundColor: variant.color_hex || "#ccc" }} />
              <span className="text-xs text-foreground">{variant.color_name || variant.name}</span>
            </button>
          ))}
        </div>
      </div>
    )}

    {colorVariants.length === 0 && selectedProduct.colors && selectedProduct.colors.length > 0 && (
      <div className="mb-6">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Cores</h3>
        <div className="flex flex-wrap gap-2">
          {selectedProduct.colors.map((color, i) => (
            <span key={i} className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground">{color}</span>
          ))}
        </div>
      </div>
    )}

    <div className="mb-6">
      <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Templates Rápidos</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MOCKUP_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              const area: DbPrintAreaTechnique = {
                id: `tpl-${t.id}`, product_id: selectedProduct.id, tabela_preco_id: "",
                max_width: t.area.w / 2, max_height: t.area.h / 2, is_curved: false, shape: "rectangle",
                location_code: t.id.toUpperCase(), location_name: t.name, location_order: 1,
                gravacao_largura_max: t.area.w / 2, gravacao_altura_max: t.area.h / 2, is_active: true,
              };
              onSelectTemplate(t.id, area);
            }}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              selectedTemplate === t.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
            }`}
          >
            <div className="w-full aspect-[4/3] bg-muted rounded-lg mb-2 flex items-center justify-center">
              <div className="border border-dashed border-primary/40 bg-primary/5 rounded" style={{ width: `${t.area.w}%`, height: `${t.area.h}%` }} />
            </div>
            <span className="text-xs font-semibold text-foreground block">{t.name}</span>
            <span className="text-[9px] text-muted-foreground">{t.category}</span>
          </button>
        ))}
      </div>
    </div>

    <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Áreas de Personalização do Produto</h3>
    {!printAreas || printAreas.length === 0 ? (
      <div className="p-4 rounded-xl bg-card border border-border text-center">
        <p className="text-sm text-muted-foreground mb-2">Nenhuma área cadastrada. Use um template acima ou crie área manual.</p>
        <Button onClick={onManualArea}>Usar Área Manual →</Button>
      </div>
    ) : (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {printAreas.map((area) => (
          <button
            key={area.id}
            onClick={() => onSelectArea(area)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selectedArea?.id === area.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40 bg-card"
            }`}
          >
            <Palette className={`w-5 h-5 mb-2 ${selectedArea?.id === area.id ? "text-primary" : "text-muted-foreground"}`} />
            <h4 className="text-sm font-semibold text-foreground">{area.location_name}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {area.max_width}×{area.max_height}cm · {area.shape}
              {area.is_curved && " · Curvo"}
            </p>
          </button>
        ))}
      </div>
    )}
  </motion.div>
);

export default MockupAreaStep;
