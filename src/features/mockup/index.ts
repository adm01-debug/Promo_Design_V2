/**
 * Mockup — barrel export
 * Re-exports all mockup domain modules for clean imports.
 */
export { useMockupDrafts } from "./hooks/use-mockup-drafts";
export type { MockupDraft } from "./hooks/use-mockup-drafts";
export {
  useProducts,
  useProduct,
  useProductImages,
  useProductVariants,
  usePrintAreaTechniques,
  useCategories,
  getProductImageUrl,
} from "./hooks/use-products";
export { generateApprovalPdf } from "./lib/pdf-export";
export { generateFinalArtPdf } from "../service-orders/lib/ServiceOrderPdf";
export {
  loadImageWithFallback,
  cmToPx,
  pxToCm,
  countUniqueColors,
  composeMockup,
  calculateAutoFit,
  detectSurfaceType,
  PERSPECTIVE_PRESETS,
} from "./lib/canvas-utils";
export type { SurfaceType } from "./lib/canvas-utils";
export { getWarpedPreview, getWarpedPreviewWorker, clearWarpCache, applyMeshWarp } from "./lib/mesh-warp";
export type { DbProduct, DbProductImage, DbPrintAreaTechnique, DbCategory, DbProductVariant } from "./lib/db-types";
