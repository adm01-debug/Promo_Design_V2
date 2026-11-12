import type { AssetType } from "../hooks/use-assets";

export type SizeUnit = "KB" | "MB";

export interface CustomSizeRange {
  /** Inclusive minimum, in bytes. null = no lower bound. */
  minBytes: number | null;
  /** Inclusive maximum, in bytes. null = no upper bound. */
  maxBytes: number | null;
  /** Last unit chosen by the user; preserved so the popover restores the same UX. */
  unit: SizeUnit;
  /** Raw min input value (string) — kept so the popover restores exactly. */
  minRaw: string;
  /** Raw max input value (string) — kept so the popover restores exactly. */
  maxRaw: string;
}

export const VIEW_MODE_KEY = "dam-view-mode";
export const PAGE_SIZE_KEY = "dam-page-size";
export const PAGE_KEY = "dam-page";
export const TAGS_MODE_KEY = "dam-tags-mode";
export const INCLUDE_ARCHIVED_KEY = "dam-include-archived";
export const ARCHIVED_ONLY_KEY = "dam-archived-only";
export const OCR_ONLY_KEY = "dam-ocr-only";
export const PAGINATION_MODE_KEY = "dam-pagination-mode";
export const SEARCH_KEY = "dam-search";
export const ASSET_TYPES_KEY = "dam-asset-types";
export const CLIENT_ID_KEY = "dam-client-id";
export const TAGS_KEY = "dam-tags";
export const SORT_KEY = "dam-sort";
export const LIST_SHOW_SIZE_KEY = "dam-list-show-size";
export const SIZE_RANGE_KEY = "dam-size-range";
export const UPDATED_RANGE_KEY = "dam-updated-range";
export const CUSTOM_SIZE_KEY = "dam-custom-size-range";

export type SortValue =
  | "relevance"
  | "created_desc"
  | "created_asc"
  | "name_asc"
  | "name_desc"
  | "size_desc"
  | "size_asc"
  | "updated_desc"
  | "updated_asc"
  | "version_desc";

export interface SortOption {
  value: SortValue;
  label: string;
  sortBy: "created_at" | "updated_at" | "name" | "file_size" | "version" | "relevance";
  sortDir: "asc" | "desc";
}

export const SORT_OPTIONS: SortOption[] = [
  { value: "relevance", label: "Relevância", sortBy: "relevance", sortDir: "desc" },
  { value: "created_desc", label: "Mais recentes", sortBy: "created_at", sortDir: "desc" },
  { value: "created_asc", label: "Mais antigos", sortBy: "created_at", sortDir: "asc" },
  { value: "name_asc", label: "Nome A→Z", sortBy: "name", sortDir: "asc" },
  { value: "name_desc", label: "Nome Z→A", sortBy: "name", sortDir: "desc" },
  { value: "size_desc", label: "Maior arquivo", sortBy: "file_size", sortDir: "desc" },
  { value: "size_asc", label: "Menor arquivo", sortBy: "file_size", sortDir: "asc" },
  {
    value: "updated_desc",
    label: "Modificados recentemente",
    sortBy: "updated_at",
    sortDir: "desc",
  },
  {
    value: "updated_asc",
    label: "Modificados há mais tempo",
    sortBy: "updated_at",
    sortDir: "asc",
  },
  { value: "version_desc", label: "Versão", sortBy: "version", sortDir: "desc" },
];

export type SizeRangeKey = "all" | "lt1mb" | "1to5mb" | "5to20mb" | "gt20mb";

export interface SizeRangeOption {
  value: SizeRangeKey;
  label: string;
  min?: number;
  max?: number;
}

export const SIZE_RANGE_OPTIONS: SizeRangeOption[] = [
  { value: "all", label: "Qualquer tamanho" },
  { value: "lt1mb", label: "Até 1 MB", max: 1 * 1024 * 1024 },
  { value: "1to5mb", label: "1–5 MB", min: 1 * 1024 * 1024, max: 5 * 1024 * 1024 },
  { value: "5to20mb", label: "5–20 MB", min: 5 * 1024 * 1024, max: 20 * 1024 * 1024 },
  { value: "gt20mb", label: "Acima de 20 MB", min: 20 * 1024 * 1024 },
];

export type UpdatedRangeKey = "all" | "24h" | "7d" | "30d" | "90d";

export interface UpdatedRangeOption {
  value: UpdatedRangeKey;
  label: string;
  hours?: number;
}

export const UPDATED_RANGE_OPTIONS: UpdatedRangeOption[] = [
  { value: "all", label: "Qualquer data" },
  { value: "24h", label: "Últimas 24h", hours: 24 },
  { value: "7d", label: "Últimos 7 dias", hours: 24 * 7 },
  { value: "30d", label: "Últimos 30 dias", hours: 24 * 30 },
  { value: "90d", label: "Últimos 90 dias", hours: 24 * 90 },
];

export const VALID_ASSET_TYPES: AssetType[] = [
  "logo",
  "art",
  "photo",
  "mockup",
  "document",
  "other",
];

export const TYPES: { value: AssetType | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "logo", label: "Logos" },
  { value: "art", label: "Artes" },
  { value: "photo", label: "Fotos" },
  { value: "mockup", label: "Mockups" },
  { value: "document", label: "Documentos" },
  { value: "other", label: "Outros" },
];
