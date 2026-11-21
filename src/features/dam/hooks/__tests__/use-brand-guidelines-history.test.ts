import { describe, expect, it } from "vitest";
import { diffSnapshots, parseSnapshot } from "../use-brand-guidelines-history";
import type { BrandGuidelines } from "../use-brand-guidelines";

const base: BrandGuidelines = {
  id: "bg-1",
  organization_id: "org-1",
  client_id: "c-1",
  primary_colors: [{ name: "Azul", hex: "#1e3a8a" }],
  secondary_colors: [],
  fonts: [{ name: "Inter" }],
  do_rules: ["usar logo"],
  dont_rules: ["esticar logo"],
  logo_asset_id: null,
  notes: "v1",
  created_at: "2026-11-21T00:00:00Z",
  updated_at: "2026-11-21T00:00:00Z",
};

describe("diffSnapshots", () => {
  it("detects color changes", () => {
    const b = { ...base, primary_colors: [{ name: "Azul", hex: "#1d4ed8" }] };
    const d = diffSnapshots(base, b);
    expect(d.primary_colors).toBe(true);
    expect(d.secondary_colors).toBe(false);
    expect(d.notes).toBe(false);
  });

  it("detects font and rules changes", () => {
    const b = {
      ...base,
      fonts: [{ name: "Inter", usage: "display" }],
      do_rules: ["usar logo", "margem segura"],
    };
    const d = diffSnapshots(base, b);
    expect(d.fonts).toBe(true);
    expect(d.do_rules).toBe(true);
    expect(d.dont_rules).toBe(false);
  });

  it("is stable when nothing changed", () => {
    const d = diffSnapshots(base, { ...base });
    expect(Object.values(d).every((v) => v === false)).toBe(true);
  });
});

describe("parseSnapshot", () => {
  it("rebuilds a BrandGuidelines from json snapshot", () => {
    const snap = {
      primary_colors: base.primary_colors,
      secondary_colors: [],
      fonts: base.fonts,
      do_rules: base.do_rules,
      dont_rules: base.dont_rules,
      logo_asset_id: null,
      notes: "v1",
    };
    const result = parseSnapshot(snap as unknown as Parameters<typeof parseSnapshot>[0]);
    expect(result.primary_colors).toEqual(base.primary_colors);
    expect(result.fonts).toEqual(base.fonts);
    expect(result.notes).toBe("v1");
    expect(result.logo_asset_id).toBeNull();
  });

  it("tolerates malformed json blocks", () => {
    const snap = { primary_colors: "nope", fonts: null, notes: null };
    const result = parseSnapshot(snap as unknown as Parameters<typeof parseSnapshot>[0]);
    expect(result.primary_colors).toEqual([]);
    expect(result.fonts).toEqual([]);
    expect(result.notes).toBeNull();
  });
});
