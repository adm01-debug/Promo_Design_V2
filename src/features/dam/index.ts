/**
 * DAM (Digital Asset Management) — barrel export
 * Reutilizável em features que precisam consumir/escolher assets.
 */
export { AssetPicker } from "./components/AssetPicker";
export { downloadAssetAsFile, getAssetSignedUrl } from "./lib/asset-urls";
export type { Asset, AssetType, AssetFilters } from "./hooks/use-assets";
export { useLatestAssetVersion } from "./hooks/use-assets";
