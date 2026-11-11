/**
 * Parses a URL search-param value into a tri-state boolean, supporting common
 * truthy/falsy spellings used in shared links.
 *
 *   "1" | "true"  | "yes" | "on"  -> true
 *   "0" | "false" | "no"  | "off" -> false
 *   null / undefined / unknown    -> null  (caller should fall back)
 *
 * Comparison is case-insensitive and trims surrounding whitespace.
 */
export function parseBoolParam(raw: string | null | undefined): boolean | null {
  if (raw == null) return null;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}
