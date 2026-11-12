/**
 * Service Orders — barrel export
 * Re-exports all service-order domain modules for clean imports.
 */
export {
  useServiceOrders,
  STATUS_CONFIG,
  STATUS_TRANSITIONS,
  canTransition,
  getNextStatuses,
} from "./hooks/use-service-orders";
export type {
  OsStatus,
  StoredServiceOrder,
  UseServiceOrdersOptions,
} from "./hooks/use-service-orders";
export { useServiceOrderRealtime } from "./hooks/use-service-order-realtime";
export { default as SectionTitle } from "./components/SectionTitle";
export { default as ArtUploadField } from "./components/ArtUploadField";
export { default as PdfPreviewDialog } from "./components/PdfPreviewDialog";
export { generateServiceOrderPdf, generateFinalArtPdf } from "./lib/ServiceOrderPdf";
export type { PdfFormData } from "./lib/ServiceOrderPdf";
export { generateBatchPdf } from "./lib/ServiceOrderBatchPdf";
export type { BatchPdfFilters } from "./lib/ServiceOrderBatchPdf";
export { generateClientSummaryPdf, clientSlug } from "./lib/ClientSummaryPdf";
export type { ClientSummaryClient } from "./lib/ClientSummaryPdf";
export { getLogoDataUrl } from "./lib/logo-loader";
export { validateForm, generateOsNumber, TECHNIQUES, serviceOrderSchema } from "./types";
export type { ServiceOrderData, ValidationErrors } from "./types";
export {
  ERR_ORDER_EDIT,
  LOCKED_EDIT_STATUSES,
  OrderEditError,
  assertOrderEditable,
  checkOrderEdit,
  isOrderEditError,
  isOrderEditable,
} from "./lib/order-edit-guard";
export type { OrderEditViolation } from "./lib/order-edit-guard";
