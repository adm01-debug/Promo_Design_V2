import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
globalThis.Image = dom.window.Image;

// Stub color-contrast (depends on browser-only canvas only via simple math, should be fine)
const { generateBrandKitPdf } = await import("/dev-server/src/features/dam/lib/brand-kit-pdf.ts");

// Tiny 1x1 PNG, JPEG, WebP data URLs
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const JPEG =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAB//Z";
const WEBP = "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=";

const bigPalette = (n) =>
  Array.from({ length: n }, (_, i) => ({
    hex: `#${i.toString(16).padStart(2, "0")}${((i * 7) % 256).toString(16).padStart(2, "0")}${((i * 13) % 256).toString(16).padStart(2, "0")}`,
    name: `Cor ${i + 1}`,
  }));

const cases = [
  {
    label: "PNG_logo_small_palette",
    logoDataUrl: PNG,
    primary: bigPalette(3),
    secondary: bigPalette(2),
  },
  { label: "JPEG_logo", logoDataUrl: JPEG, primary: bigPalette(5), secondary: [] },
  { label: "WEBP_logo", logoDataUrl: WEBP, primary: bigPalette(4), secondary: bigPalette(4) },
  {
    label: "large_palette_30",
    logoDataUrl: PNG,
    primary: bigPalette(20),
    secondary: bigPalette(10),
  },
  {
    label: "huge_palette_60",
    logoDataUrl: PNG,
    primary: bigPalette(40),
    secondary: bigPalette(20),
  },
];

import fs from "fs";
for (const c of cases) {
  try {
    const doc = generateBrandKitPdf({
      clientName: "Teste Brand",
      primary: c.primary,
      secondary: c.secondary,
      fonts: [{ name: "Inter", usage: "Body", source: "Google" }],
      doRules: ["Use cor primária"],
      dontRules: ["Não distorcer logo"],
      notes: "Notas",
      logoDataUrl: c.logoDataUrl,
    });
    const buf = Buffer.from(doc.output("arraybuffer"));
    const path = `/tmp/brand_${c.label}.pdf`;
    fs.writeFileSync(path, buf);
    console.log(`✓ ${c.label}: ${buf.length} bytes -> ${path}`);
  } catch (e) {
    console.error(`✗ ${c.label}:`, e.message);
  }
}
