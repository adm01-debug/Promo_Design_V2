import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useProducts,
  useProductImages,
  useProductVariants,
  usePrintAreaTechniques,
  getProductImageUrl,
} from "@/features/mockup";
import type { DbProduct, DbPrintAreaTechnique, DbProductVariant } from "@/features/mockup";
import { useMockupEditor } from "@/features/mockup/hooks/use-mockup-editor";
import MockupTopBar from "@/features/mockup/components/MockupTopBar";
import MockupProductStep from "@/features/mockup/components/MockupProductStep";
import MockupAreaStep from "@/features/mockup/components/MockupAreaStep";
import MockupCanvas from "@/features/mockup/components/MockupCanvas";
import MockupRightPanel from "@/features/mockup/components/MockupRightPanel";

const MockupNew = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(null);
  const [selectedArea, setSelectedArea] = useState<DbPrintAreaTechnique | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<DbProductVariant | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [step, setStep] = useState<"product" | "area" | "canvas">("product");

  const { data: productsData, isLoading: productsLoading } = useProducts({
    search,
    page,
    pageSize: 24,
    onlyWithImages: false,
  });
  const { data: productImages } = useProductImages(selectedProduct?.id || null);
  const { data: printAreas } = usePrintAreaTechniques(selectedProduct?.id || null);
  const { data: variants } = useProductVariants(selectedProduct?.id || null);

  const products = productsData?.products || [];
  const totalPages = Math.ceil((productsData?.total || 0) / 24);

  const selectedProductImage = selectedProduct
    ? selectedVariant?.selected_thumbnail ||
      productImages?.find((i) => selectedVariant?.id && i.variant_id === selectedVariant.id)
        ?.url_cdn ||
      productImages?.find(
        (i) =>
          selectedVariant?.color_name && i.applies_to_color && i.color_id === selectedVariant.id,
      )?.url_cdn ||
      productImages?.find((i) => i.is_primary)?.url_cdn ||
      getProductImageUrl(selectedProduct)
    : null;

  const colorVariants = (variants || []).filter((v) => v.color_hex);

  const editor = useMockupEditor({
    selectedProduct,
    selectedArea,
    selectedVariant,
    selectedProductImage,
    selectedTemplate,
    step,
  });

  // Restore draft (executa uma vez quando restoreDraft estabilizar).
  useEffect(() => {
    editor.restoreDraft(setStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.restoreDraft]);

  return (
    <div className="h-screen flex flex-col">
      <MockupTopBar
        step={step}
        setStep={setStep}
        hasProduct={!!selectedProduct}
        hasArea={!!selectedArea}
        historyIdx={editor.historyIdx}
        historyLength={editor.history.length}
        undo={editor.undo}
        redo={editor.redo}
        isSaving={editor.isSaving}
        draftId={editor.draftId}
        onSave={() => editor.handleSaveDraft(false)}
        onExportPdf={editor.handleExportPdf}
        onExportPng={editor.handleExportPng}
        isExporting={editor.isExporting}
      />

      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "product" && (
            <MockupProductStep
              search={search}
              setSearch={(s) => {
                setSearch(s);
                setPage(0);
              }}
              page={page}
              setPage={setPage}
              products={products}
              totalPages={totalPages}
              productsLoading={productsLoading}
              selectedProductId={selectedProduct?.id || null}
              onSelect={(product) => {
                setSelectedProduct(product);
                setSelectedArea(null);
                setSelectedVariant(null);
                setStep("area");
              }}
            />
          )}

          {step === "area" && selectedProduct && (
            <MockupAreaStep
              selectedProduct={selectedProduct}
              selectedProductImage={selectedProductImage}
              colorVariants={colorVariants}
              selectedVariant={selectedVariant}
              setSelectedVariant={setSelectedVariant}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              selectedArea={selectedArea}
              printAreas={printAreas}
              onSelectArea={(area) => {
                setSelectedArea(area);
                setStep("canvas");
              }}
              onSelectTemplate={(templateId, area) => {
                setSelectedTemplate(templateId);
                setSelectedArea(area);
                setStep("canvas");
              }}
              onManualArea={() => {
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
            />
          )}

          {step === "canvas" && selectedProduct && selectedArea && (
            <motion.div
              key="canvas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex"
            >
              <MockupCanvas
                selectedProduct={selectedProduct}
                selectedProductImage={selectedProductImage}
                selectedArea={selectedArea}
                placement={editor.placement}
                setPlacement={editor.setPlacement}
                zoom={editor.zoom}
                setZoom={editor.setZoom}
                showGrid={editor.showGrid}
                setShowGrid={editor.setShowGrid}
                showRulers={editor.showRulers}
                setShowRulers={editor.setShowRulers}
                showGuides={editor.showGuides}
                setShowGuides={editor.setShowGuides}
                showLogo={editor.showLogo}
                logoPreview={editor.logoPreview}
                warpedLogoUrl={editor.warpedLogoUrl}
                surfaceType={editor.surfaceType}
                blendMode={editor.blendMode}
                logoOpacity={editor.logoOpacity}
                shadowEnabled={editor.shadowEnabled}
                shadowIntensity={editor.shadowIntensity}
                isDragging={editor.isDragging}
                isWarping={editor.isWarping}
                isResizing={editor.isResizing}
                areaW={editor.areaW}
                areaH={editor.areaH}
                centerLogo={editor.centerLogo}
                handleLogoMouseDown={editor.handleLogoMouseDown}
                handleMouseMove={editor.handleMouseMove}
                handleMouseUp={editor.handleMouseUp}
                handleDrop={editor.handleDrop}
                setIsResizing={editor.setIsResizing}
                fileInputRef={editor.fileInputRef}
                areaRef={editor.areaRef}
                canvasContainerRef={editor.canvasContainerRef}
                suggestedPlacement={editor.suggestedPlacement}
              />
              <MockupRightPanel
                selectedProduct={selectedProduct}
                selectedProductImage={selectedProductImage}
                selectedArea={selectedArea}
                colorVariants={colorVariants}
                selectedVariant={selectedVariant}
                setSelectedVariant={setSelectedVariant}
                logoFile={editor.logoFile}
                logoPreview={editor.logoPreview}
                logoColors={editor.logoColors}
                showLogo={editor.showLogo}
                setShowLogo={editor.setShowLogo}
                clearLogo={editor.clearLogo}
                fileInputRef={editor.fileInputRef}
                handleLogoUpload={editor.handleLogoUpload}
                isRemovingBg={editor.isRemovingBg}
                handleRemoveBg={editor.handleRemoveBg}
                isSuggestingPlacement={editor.isSuggestingPlacement}
                handleSuggestPlacement={editor.handleSuggestPlacement}
                aiReasoning={editor.aiReasoning}
                suggestedPlacement={editor.suggestedPlacement}
                applySuggestedPlacement={editor.applySuggestedPlacement}
                cancelAIRequest={editor.cancelAIRequest}
                blendMode={editor.blendMode}
                setBlendMode={editor.setBlendMode}
                logoOpacity={editor.logoOpacity}
                setLogoOpacity={editor.setLogoOpacity}
                shadowEnabled={editor.shadowEnabled}
                setShadowEnabled={editor.setShadowEnabled}
                shadowIntensity={editor.shadowIntensity}
                setShadowIntensity={editor.setShadowIntensity}
                autoFitLogo={editor.autoFitLogo}
                surfaceType={editor.surfaceType}
                setSurfaceType={editor.setSurfaceType}
                isWarping={editor.isWarping}
                warpedLogoUrl={editor.warpedLogoUrl}
                placement={editor.placement}
                setPlacement={editor.setPlacement}
                exportFormat={editor.exportFormat}
                setExportFormat={editor.setExportFormat}
                handleExportPdf={editor.handleExportPdf}
                handleExportPng={editor.handleExportPng}
                isExporting={editor.isExporting}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MockupNew;
