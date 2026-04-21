

## Google Fonts dinâmico com cache, dedupe e await de carga

Blindar `google-fonts-loader.ts` para que a fonte digitada renderize de verdade sem FOUT e sem fallback silencioso, e estender o preview ao vivo para a tela de edição.

### Mudanças

**`src/features/dam/lib/google-fonts-loader.ts`** — reforço
- Cache global `Map<string, Promise<boolean>>` por família (lowercase). A promise resolve `true` quando `document.fonts.load("1em 'Family'")` confirma carga, `false` se o link 404/timeout (3s).
- Antes de injetar, varrer `document.head.querySelectorAll('link[data-google-font]')` e qualquer `<link href*="fonts.googleapis.com">` pré-existente para popular o cache e evitar duplicação com `index.html`.
- URL encoding correto: `encodeURIComponent(name).replace(/%20/g, "+")` para suportar qualquer nome.
- Pesos configuráveis: `loadGoogleFont(name, weights = [300, 400, 500, 600, 700, 900])` — default cobre o espectro usado em branding. Exportar também preset `BRAND_WEIGHTS`.
- `loadGoogleFont` retorna `Promise<boolean>`. Falha marca o cache como `false` e emite `console.warn` (sem toast — não é erro do usuário).
- `useGoogleFonts(names[])`: guarda `loaded: Record<string, boolean>` em state, aguarda cada promise e força re-render quando resolvem (elimina FOUT no segundo paint). Retorna `{ loaded, allReady }` pros consumidores opcionalmente mostrarem skeleton.

**`src/features/dam/pages/BrandGuidelinesPage.tsx`** — preview ao vivo na edição
- Nos inputs de nome de fonte (heading/body na aba de tipografia), usar `useGoogleFonts` com os valores digitados (debounced 300ms para não bombardear Google Fonts enquanto o usuário digita).
- Abaixo de cada input, mostrar uma linha de preview `"Aa Bb Cc 0123 — {nomeDaFonte}"` com `fontFamily: "{name}", sans-serif`. Se `loaded[name] === false`, mostrar mini badge `⚠ Fonte não encontrada no Google Fonts`.

**`BrandPreviewCard.tsx` e `BrandApplicationPreview.tsx`** — ajuste mínimo
- Consumir `allReady` do hook; quando `false`, aplicar `visibility: hidden` apenas no bloco do heading durante os primeiros ~300ms pra evitar flash de Times New Roman. Fallback continua sendo `sans-serif`.

### Critérios de aceite

- Digitar "Playfair Display" no input de heading em `BrandGuidelinesPage` carrega a fonte em <1s e o preview abaixo renderiza de verdade (não Times/serif genérico).
- Digitar "Fonte Inexistente XYZ" mostra o aviso `⚠ Fonte não encontrada` em até 3s e não polui o DOM com links duplicados se o usuário corrigir.
- Reabrir a página de preview de outro cliente com a mesma fonte reaproveita o cache (sem novo `<link>`).
- Pesos 300 e 900 ficam disponíveis (`font-weight: 300` e `900` renderizam diferente).
- Pré-carregamentos em `index.html` (se houver) não são duplicados.
- `BrandPreviewCard` e `BrandApplicationPreview` não piscam fallback serif no primeiro paint.
- Sem regressão: fontes já em uso (Inter default) continuam renderizando.

