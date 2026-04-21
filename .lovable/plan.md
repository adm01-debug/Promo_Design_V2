

## Exportação em lote: ZIP de arquivos + CSV de metadados

Adicionar um botão "Exportar" no header de `/dam/preview` que permite baixar:
1. **CSV** com metadados dos assets filtrados (ou da seleção em modo Compare).
2. **ZIP** com os arquivos binários + um `manifest.csv` interno.

A escolha do escopo (filtrados vs selecionados) e do formato (CSV vs ZIP) é feita em um menu dropdown.

### Mudanças

**Novo: `src/features/dam/lib/asset-export.ts`**
- `buildAssetsCsv(assets: Asset[], clients: Client[]): string` — gera CSV com colunas: `id, name, type, client, version, file_size, mime_type, tags, colors, is_archived, created_at, updated_at, storage_path`. Reutilizar utilitários de escape do `audit-csv.ts` (extrair helper compartilhado se necessário, ou duplicar mínimo).
- `downloadCsv(filename: string, csv: string): void` — cria Blob `text/csv;charset=utf-8` e dispara download (mesmo padrão de `audit-csv.ts`).
- `async function downloadAssetsZip(assets: Asset[], clients: Client[], onProgress?: (done: number, total: number) => void): Promise<void>` — usa `jszip` (já em `package.json` via mockup PDF; verificar — se não, adicionar) para:
  - Para cada asset: chamar `getAssetSignedUrl(asset.storage_path)`, fazer `fetch`, adicionar ao zip em `<type>/<safe-name>.<ext>` (deduplicar nomes com sufixo `_2`, `_3`).
  - Adicionar `manifest.csv` na raiz do zip com os mesmos metadados do CSV.
  - Chamar `onProgress` a cada item processado.
  - Gerar blob via `zip.generateAsync({ type: "blob" })` e disparar download como `dam-assets-<timestamp>.zip`.
  - Try/catch por asset: falhas individuais viram entradas no `manifest.csv` com coluna `download_status` = `error`.

**Novo: `src/features/dam/components/ExportMenu.tsx`**
- Dropdown menu acionado por botão "Exportar" (ícone `Download`) no header.
- Itens:
  - **CSV — Filtrados (`{total}`)** → chama `downloadCsv` com `assets` da query atual.
  - **CSV — Seleção (`{compare.count}`)** → habilitado só quando `compareMode && count > 0`; usa `selectedAssets`.
  - Separator
  - **ZIP — Filtrados (`{total}`)** → chama `downloadAssetsZip` com confirmação se `total > 50` (toast/dialog simples).
  - **ZIP — Seleção (`{compare.count}`)** → idem para seleção.
- Estado local `isExporting: boolean` desabilita o botão; mostra `Loader2` girando + texto "Empacotando X/Y…" usando `toast` com ID atualizado via `onProgress`.

**Editar: `src/features/dam/pages/DamPreviewPage.tsx`**
- Importar e renderizar `<ExportMenu>` no header, entre o botão "Compare" e a legenda de atalhos.
- Passar props: `assets` (filtrados), `selectedAssets`, `clients` (já vindos de `useClients`), `compareMode`.

**Verificação de dependência**:
- `jszip` já é usado em `src/features/dam/lib/brand-kit-pdf.ts` ou `src/features/service-orders/lib/ServiceOrderBatchPdf.ts`? Verificar; se não estiver instalado, adicionar `jszip` + `@types/jszip` via `bun add` no modo default.

### Critérios de aceite

- Botão "Exportar" visível no header de `/dam/preview` com ícone Download.
- 4 opções no menu: CSV filtrados, CSV seleção, ZIP filtrados, ZIP seleção; opções de seleção desabilitadas quando `compareMode` off ou `count === 0`.
- CSV abre corretamente em Excel/Sheets com acentuação (UTF-8 BOM) e colunas escapadas.
- ZIP > 50 itens pede confirmação antes de iniciar.
- Durante exportação ZIP: toast com progresso `Empacotando X/Y assets…`; ao final toast de sucesso ou erro com contagem de falhas.
- ZIP gerado contém pasta por `type` + `manifest.csv` na raiz com `download_status` por linha.
- Nomes duplicados são deduplicados com `_2`, `_3`.
- Sem regressão no header (botão Compare, atalhos, popover mobile).

