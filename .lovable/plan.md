

## Fallback visual quando o asset salvo expira ou desaparece

Hoje, quando o asset persistido em `localStorage` (`dam-last-preview-asset`) não está mais nos resultados (arquivado, excluído, ou fora dos filtros atuais), o `DamPreviewPage` silenciosamente cai no índice 0 e o `DamLibraryPage` simplesmente não destaca nada nem mostra o banner de "Continuar de onde parou". O usuário não sabe o que aconteceu com o último asset que viu.

### Mudanças

**Editar: `src/features/dam/pages/DamPreviewPage.tsx`**
- Já existe o chip "Fora dos filtros atuais" quando `?asset=` referencia id ausente. Estender para também cobrir o caso "veio do `localStorage` e não foi encontrado":
  - Detectar: se na primeira carga `assetIdParam` está presente mas `assetMissingFromList === true`, disparar `toast` discreto (variante padrão, 4s):
    - "O asset que você visualizou por último não está disponível nos filtros atuais. Mostrando o primeiro disponível."
    - Ação no toast: botão "Limpar filtros" → chama uma função que reseta filtros via `useDamFilters` (`resetAll()` se existir, ou navega para `/dam/preview` sem query).
  - Usar `useRef` `didShowFallbackToastRef` para garantir que o toast aparece só uma vez por sessão de preview.
  - Limpar `localStorage` (`clearLastPreviewAsset()`) só quando o usuário escolher "Limpar filtros" ou após confirmação — caso contrário, manter o id salvo (filtros podem ter sido mudados temporariamente).

**Editar: `src/features/dam/pages/DamLibraryPage.tsx`**
- Hoje o banner "Continuar de onde parou" só aparece quando o asset está nos resultados. Adicionar caso de fallback:
  - Após carregar `assets` e `lastPreviewAssetId` estar setado mas `lastPreviewAsset === undefined` (não encontrado nos resultados atuais), renderizar um banner alternativo discreto (variante `outline`, ícone `AlertCircle` em `text-muted-foreground`):
    - Texto: "O último asset visualizado não está nos resultados atuais (pode ter sido arquivado ou removido pelos filtros)."
    - Botões: `Limpar filtros` (chama `clearAllFilters()`) e `Descartar` (chama `clearLastPreviewAsset()` + esconde o banner).
  - Se o asset existir, mantém o banner atual de "Continuar de onde parou".
  - Banner de fallback some automaticamente quando o usuário muda filtros e o asset volta a aparecer.

**Editar: `src/features/dam/pages/DamPreviewPage.tsx` (expiração)**
- A expiração de TTL (24h) já é tratada em `readLastPreviewAsset()` retornando `null` quando expirado. Adicionar comportamento visual:
  - No mount, se `localStorage.getItem(LAST_ASSET_KEY)` existe mas `readLastPreviewAsset()` retorna `null` (expirado), disparar `toast` informativo único:
    - "Sua sessão de pré-visualização anterior expirou (mais de 24h). Começando do início."
  - Limpar a entrada expirada de `localStorage` automaticamente nesse caso.

**Editar: `src/features/dam/pages/DamLibraryPage.tsx` (expiração)**
- Mesma lógica: detectar entrada expirada no mount, mostrar toast discreto único e limpar `localStorage`.
- Extrair helper compartilhado em `DamPreviewPage.tsx` (já exporta `LAST_ASSET_KEY`/`LAST_ASSET_TTL_MS`): adicionar `peekLastPreviewAssetRaw()` que retorna `{ id, expired }` sem limpar, para que cada página decida se mostra toast.

### Comportamento

- **Expirado (>24h)**: ao entrar em `/dam` ou `/dam/preview`, toast discreto "sessão expirada", localStorage limpo, página continua normal.
- **Asset arquivado/removido por filtro**: 
  - Em `/dam/preview?asset=X` (X não nos resultados): chip "Fora dos filtros" + toast com botão "Limpar filtros", primeiro asset vira ativo.
  - Em `/dam` voltando do preview: banner alternativo "último asset não está nos resultados" com ações Limpar filtros / Descartar.
- **Asset disponível**: comportamento atual mantido (destaque + banner "Continuar de onde parou").

### Critérios de aceite

- Toast de expiração aparece uma única vez quando entrada do localStorage está expirada, e a entrada é limpa automaticamente.
- Toast/chip de "fora dos filtros" no `/dam/preview` quando o asset salvo não está nos resultados, com ação para limpar filtros.
- Banner de fallback no `/dam` quando o asset salvo não está nos resultados, com ações Limpar filtros e Descartar.
- Limpar filtros restaura o destaque/banner normal se o asset voltar a aparecer.
- Descartar remove a entrada do localStorage e o banner some.
- Sem regressão no banner "Continuar de onde parou" quando o asset existe, nem em filtros, paginação, upload, drawer ou quick preview.

