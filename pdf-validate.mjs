import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
globalThis.Image = dom.window.Image;
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;

const { buildAssetsPdf } = await import('/dev-server/src/features/dam/lib/asset-pdf.ts');
const { buildAssetsCsvWithMetadata } = await import('/dev-server/src/features/dam/lib/asset-export.ts');

const mkAsset = (i) => ({
  id: `a${i}`,
  name: `Asset ${i}`,
  asset_type: ['logo','art','photo','mockup','document','other'][i % 6],
  client_id: i % 3 === 0 ? 'c1' : null,
  version: (i % 5) + 1,
  file_size: i * 12345,
  tags: ['marca', 'campanha-2024', 'verao'],
  created_at: new Date(2024, 0, (i % 28) + 1).toISOString(),
});

const clients = [{ id: 'c1', name: 'Cliente Demo Importante S/A' }];
const assets = Array.from({length: 30}, (_, i) => mkAsset(i));

const summary = {
  search: 'logo demo',
  assetTypes: ['logo', 'art', 'photo'],
  clientName: 'Cliente Demo Importante S/A',
  tags: ['marca', 'campanha-2024'],
  tagsMode: 'any',
  includeArchived: true,
  archivedOnly: false,
  ocrOnly: true,
  minSize: 100 * 1024,
  maxSize: 5 * 1024 * 1024,
  sizeUnit: 'KB',
  updatedRangeLabel: 'Últimas 24h',
  pageSize: 50,
  viewMode: 'list',
  sortLabel: 'Mais recentes',
  total: 30,
  shown: 30,
};

import fs from 'fs';
const doc = buildAssetsPdf(assets, clients, summary);
fs.writeFileSync('/tmp/dam_meta.pdf', Buffer.from(doc.output('arraybuffer')));
console.log(`PDF: ${doc.getNumberOfPages()} páginas`);

const csv = buildAssetsCsvWithMetadata(assets, clients, summary);
fs.writeFileSync('/tmp/dam_meta.csv', csv);
console.log('--- CSV preview (first 25 lines) ---');
console.log(csv.split('\n').slice(0, 25).join('\n'));
