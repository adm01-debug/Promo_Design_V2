import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
globalThis.Image = dom.window.Image;

const { buildAssetsPdf } = await import('/dev-server/src/features/dam/lib/asset-pdf.ts');

const mkAsset = (i) => ({
  id: `a${i}`,
  name: i % 7 === 0
    ? `Logo ${i} — versão muito longa que precisa quebrar em várias linhas para validar wrapping`
    : `Asset ${i}`,
  asset_type: ['logo','art','photo','mockup','document','other'][i % 6],
  client_id: i % 3 === 0 ? 'c1' : null,
  version: (i % 5) + 1,
  file_size: i * 12345,
  tags: i % 4 === 0
    ? Array.from({length: 12}, (_, k) => `tag-muito-longa-${i}-${k}`)
    : ['curta', 'media-tag', 'outra'],
  created_at: new Date(2024, 0, (i % 28) + 1).toISOString(),
});

const clients = [{ id: 'c1', name: 'Cliente Demo Importante S/A' }];

import fs from 'fs';
for (const n of [3, 50, 200]) {
  const assets = Array.from({length: n}, (_, i) => mkAsset(i));
  const doc = buildAssetsPdf(assets, clients, {
    search: 'logo demo',
    assetTypes: ['logo', 'art', 'photo'],
    clientName: 'Cliente Demo Importante S/A',
    tags: ['marca', 'campanha-2024'],
    tagsMode: 'all',
    includeArchived: true,
    sortLabel: 'Mais recentes',
    total: n,
    shown: n,
  });
  const buf = Buffer.from(doc.output('arraybuffer'));
  const path = `/tmp/dam_${n}.pdf`;
  fs.writeFileSync(path, buf);
  console.log(`✓ ${n} assets: ${(buf.length/1024).toFixed(1)} KB → ${path} (${doc.getNumberOfPages()} páginas)`);
}
