

## Thumbnails para PDF/SVG/AI no upload

Hoje só imagens raster geram thumbnail e preview no `AssetUploadDialog` e via `processImage` em `useAssetUpload`. PDF/SVG/AI mostram apenas o ícone genérico `FileImage`. Vou estender ambos para gerar previews antes e depois do upload.

### Mudanças

**`src/features/dam/components/AssetUploadDialog.tsx`**
- Após `addFiles`, para cada entrada não-imagem:
  - **SVG** (`image/svg+xml` ou extensão `.svg`): ler como texto via `FileReader.readAsText`, criar Blob `image/svg+xml` e `URL.createObjectURL` → atribuir a `entry.preview`
  - **PDF** (`application/pdf`): usar `pdfjs-dist` (já instalado? verificar; se não, adicionar) para renderizar página 1 num canvas off-screen (largura 256px) → `canvas.toBlob` → `URL.createObjectURL` em `entry.preview`
  - **AI / PSD**: sem renderer client-side viável → manter ícone, mas trocar por ícone específico (`FileType` ou badge "AI"/"PSD")
- Tudo assíncrono e progressivo: entrada aparece imediatamente com placeholder ("Gerando preview...") e é atualizada quando o blob fica pronto
- Manter cleanup dos `URL.revokeObjectURL` no unmount/remove

**`src/features/dam/hooks/use-asset-upload.ts`**
- Estender `processImage` → `processFile(file)`:
  - Imagem: comportamento atual
  - SVG: rasterizar em canvas 256×256 via `<img>` apontando para data URL do SVG → gerar JPEG thumbnail e dimensões
  - PDF: renderizar página 1 com pdfjs em canvas 512px largura → JPEG thumbnail + dimensões da página
  - AI/PSD/outros: retornar `null` (sem thumb, sem dimensões)
- Restante do upload (storage, dominantColors, mime) inalterado
- `dominant_colors` continua extraído quando há canvas (PDF e SVG ganham paleta também)

**Dependências**
- Adicionar `pdfjs-dist` (~2MB, lazy-import dinâmico só quando há PDF na fila para não inflar bundle inicial)
- Configurar worker via `import.meta.url` → `pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString()`

**Sem mudanças** em banco, RLS, `AssetThumbnail` (já lê `thumbnail_path` que agora será preenchido) ou outros componentes.

### Critérios de aceite

- Selecionar PDF mostra preview da primeira página na lista do diálogo em até ~1s
- Selecionar SVG mostra o vetor renderizado como preview
- Selecionar `.ai`/`.psd` mostra ícone dedicado (sem quebrar)
- Após upload, o card na grade da DAM exibe o thumbnail gerado (não mais ícone genérico) para PDF e SVG
- `dominant_colors` é populado também para PDF/SVG quando rasterizáveis
- Lazy-load do `pdfjs-dist`: bundle inicial não cresce se nenhum PDF for selecionado
- Cleanup correto de blob URLs ao remover entradas/fechar diálogo
- Sem regressão: imagens raster continuam funcionando idênticas; retry, validação de tags e modo versão preservados

