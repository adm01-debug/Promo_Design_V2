import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
globalThis.Image = dom.window.Image;

const { generateBrandKitPdf } = await import('../src/features/dam/lib/brand-kit-pdf.ts');

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAB//Z';
const WEBP = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';

const bigPalette = (n) => Array.from({length: n}, (_, i) => ({
  hex: `#${(i*30%256).toString(16).padStart(2,'0')}${(i*70%256).toString(16).padStart(2,'0')}${(i*130%256).toString(16).padStart(2,'0')}`,
  name: `Cor ${i+1}`,
}));

const cases = [
  { label: 'png_small', logoDataUrl: PNG, primary: bigPalette(3), secondary: bigPalette(2) },
  { label: 'jpeg', logoDataUrl: JPEG, primary: bigPalette(5), secondary: [] },
  { label: 'webp', logoDataUrl: WEBP, primary: bigPalette(4), secondary: bigPalette(4) },
  { label: 'large_30', logoDataUrl: PNG, primary: bigPalette(20), secondary: bigPalette(10) },
  { label: 'huge_60', logoDataUrl: PNG, primary: bigPalette(40), secondary: bigPalette(20) },
];

import fs from 'fs';
for (const c of cases) {
  try {
    const doc = generateBrandKitPdf({
      clientName: 'Teste Brand',
      primary: c.primary,
      secondary: c.secondary,
      fonts: [{ name: 'Inter', usage: 'Body', source: 'Google' }],
      doRules: ['Use cor primária'],
      dontRules: ['Não distorcer logo'],
      notes: 'Notas de teste',
      logoDataUrl: c.logoDataUrl,
    });
    const buf = Buffer.from(doc.output('arraybuffer'));
    const path = `/tmp/brand_${c.label}.pdf`;
    fs.writeFileSync(path, buf);
    const pages = doc.internal.pages.length - 1;
    console.log(`✓ ${c.label}: ${buf.length}b, ${pages}p`);
  } catch (e) {
    console.error(`✗ ${c.label}:`, e.message);
  }
}
