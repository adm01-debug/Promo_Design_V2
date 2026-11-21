/**
 * Magic Up — barrel export
 * Re-exports all magic-up domain modules for clean imports.
 */
export { useMagicUpHistory } from "./hooks/use-magicup-history";
export type { MagicUpHistoryItem } from "./hooks/use-magicup-history";
export { useMagicUpJobs, MAGIC_UP_STYLE_LABELS } from "./hooks/use-magic-up-jobs";
export type { MagicUpJob } from "./hooks/use-magic-up-jobs";
export {
  SAMPLE_PROMPTS,
  PROMPT_CATEGORIES,
  INSPIRATION_GALLERY,
  SAMPLE_PRODUCTS,
} from "./lib/mockup-types";
export type { PromptTemplate, MagicUpGeneration, InspirationItem } from "./lib/mockup-types";
export { default as InspirationGallery } from "./components/InspirationGallery";
export { default as PromptGenerator } from "./components/PromptGenerator";
export { default as DownloadMenu } from "./components/DownloadMenu";
