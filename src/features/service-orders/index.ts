/**
 * Service Orders — barrel export
 * Re-exports all service-order domain modules for clean imports.
 */
export { useServiceOrders, STATUS_CONFIG } from "@/hooks/use-service-orders";
export type { OsStatus, StoredServiceOrder } from "@/hooks/use-service-orders";
export { useServiceOrderRealtime } from "@/hooks/use-service-order-realtime";
export { default as SectionTitle } from "@/components/service-order/SectionTitle";
export { default as ArtUploadField } from "@/components/service-order/ArtUploadField";
export { default as PdfPreviewDialog } from "@/components/service-order/PdfPreviewDialog";
export { generateServiceOrderPdf } from "@/components/service-order/ServiceOrderPdf";
export type { PdfFormData } from "@/components/service-order/ServiceOrderPdf";
export {
  validateForm,
  generateOsNumber,
  TECHNIQUES,
} from "@/components/service-order/types";
export type { ServiceOrderData, ValidationErrors } from "@/components/service-order/types";
