import { describe, it, expect } from "vitest";

/**
 * Backend behavior under test (mirrored from public.search_assets_ranked):
 *
 *   ocr_match := (
 *        (ocr_text % term  OR ocr_text ILIKE %term%)
 *     AND NOT (
 *           name % term
 *        OR name ILIKE %term%
 *        OR description ILIKE %term%
 *     )
 *   )
 *
 * pg_trgm `%` operator returns true when trigram similarity(a, b) >= the
 * `pg_trgm.similarity_threshold` GUC (default 0.3). For these tests we use
 * a JS approximation of the predicate that is sufficient to exercise the
 * branching logic the SQL relies on:
 *   - "name % term" → name contains a normalized form of term, OR shares ≥3 trigrams
 *   - "ILIKE %term%" → case-insensitive substring
 *
 * We are NOT re-implementing pg_trgm exactly; we are validating the BRANCHING
 * RULE: ocr_match should ONLY be true when the hit comes from ocr_text and
 * NOT from name / description.
 */

function ilikeContains(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack || !needle) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Conservative trigram-similarity proxy: true when the needle appears as a
 * case-insensitive substring (the cheap, always-true case for `%` in pg_trgm
 * when the term is short and well-contained). Sufficient for branch coverage.
 */
function trgmMatch(haystack: string | null | undefined, needle: string): boolean {
  return ilikeContains(haystack, needle);
}

interface AssetFixture {
  name: string;
  description?: string | null;
  ocr_text?: string | null;
}

function computeOcrMatch(asset: AssetFixture, term: string): boolean {
  const t = term.trim();
  if (!t) return false;
  const ocrHit = trgmMatch(asset.ocr_text, t) || ilikeContains(asset.ocr_text, t);
  const nameOrDescHit =
    trgmMatch(asset.name, t) ||
    ilikeContains(asset.name, t) ||
    ilikeContains(asset.description ?? "", t);
  return ocrHit && !nameOrDescHit;
}

describe("search_assets_ranked.ocr_match — backend predicate", () => {
  it("is TRUE when match comes ONLY from ocr_text", () => {
    const asset = {
      name: "Banner promocional",
      description: "Material para campanha de inverno",
      ocr_text: "PROMOÇÃO IMPERDÍVEL — TÊNIS ESPORTIVO 50% OFF",
    };
    expect(computeOcrMatch(asset, "tênis")).toBe(true);
  });

  it("is FALSE when match comes from name (even if also in ocr_text)", () => {
    const asset = {
      name: "Logo Nike Tênis",
      description: null,
      ocr_text: "TÊNIS NIKE PRO",
    };
    expect(computeOcrMatch(asset, "tênis")).toBe(false);
  });

  it("is FALSE when match comes from description (even if also in ocr_text)", () => {
    const asset = {
      name: "Arte final v3",
      description: "Peça promocional para tênis esportivo",
      ocr_text: "TÊNIS PROMOÇÃO 2025",
    };
    expect(computeOcrMatch(asset, "tênis")).toBe(false);
  });

  it("is FALSE when ocr_text does not contain the term at all", () => {
    const asset = {
      name: "Banner inverno",
      description: "Campanha sazonal",
      ocr_text: "Coleção outono inverno 2025",
    };
    expect(computeOcrMatch(asset, "tênis")).toBe(false);
  });

  it("is FALSE when ocr_text is null/empty", () => {
    expect(
      computeOcrMatch(
        { name: "Banner", description: "Texto", ocr_text: null },
        "qualquer",
      ),
    ).toBe(false);
    expect(
      computeOcrMatch(
        { name: "Banner", description: "Texto", ocr_text: "" },
        "qualquer",
      ),
    ).toBe(false);
  });

  it("is FALSE when the search term is empty (mirrors q.term IS NULL guard)", () => {
    const asset = {
      name: "X",
      description: "Y",
      ocr_text: "anything goes here",
    };
    expect(computeOcrMatch(asset, "")).toBe(false);
    expect(computeOcrMatch(asset, "   ")).toBe(false);
  });

  it("is case-insensitive on ocr_text and name exclusion", () => {
    // OCR-only match, mixed case
    expect(
      computeOcrMatch(
        { name: "Foto produto", description: null, ocr_text: "BLACK FRIDAY" },
        "black",
      ),
    ).toBe(true);
    // Name contains it in different case → must suppress ocr_match
    expect(
      computeOcrMatch(
        { name: "Black Friday Banner", description: null, ocr_text: "black friday" },
        "BLACK",
      ),
    ).toBe(false);
  });

  it("treats description hit as suppression even when name is unrelated", () => {
    const asset = {
      name: "Untitled-1",
      description: "Catálogo de canecas personalizadas",
      ocr_text: "CANECA PROMO 2024",
    };
    expect(computeOcrMatch(asset, "caneca")).toBe(false);
  });

  it("multiple OCR-only matches across different assets all flag true", () => {
    const term = "voucher";
    const assets: AssetFixture[] = [
      { name: "img-001.png", description: null, ocr_text: "VOUCHER 10% OFF" },
      { name: "img-002.png", description: "Layout final", ocr_text: "Voucher promocional" },
      { name: "img-003.png", description: "", ocr_text: "use o voucher na compra" },
    ];
    for (const a of assets) {
      expect(computeOcrMatch(a, term)).toBe(true);
    }
  });

  it("only OCR portion matters when name+description are explicitly empty strings", () => {
    const asset = { name: "", description: "", ocr_text: "lorem CUPOM ipsum" };
    expect(computeOcrMatch(asset, "cupom")).toBe(true);
  });
});