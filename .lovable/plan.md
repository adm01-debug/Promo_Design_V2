

## Ordenação por Relevância na pré-visualização rápida

A biblioteca (`/dam`) já oferece "Relevância" como opção de ordenação (via `SORT_OPTIONS` em `useDamFilters` + RPC `search_assets_ranked`). A pré-visualização (`/dam/preview`) usa o mesmo hook `useDamFilters` e o mesmo `useAssets`, então o backend já suporta — falta apenas:

1. Garantir que a opção apareça no select de ordenação do `PreviewSidebar` quando há busca ativa.
2. Tornar "Relevância" o default automático ao começar a digitar (≥3 chars) na sidebar de preview, voltando ao último sort escolhido quando a busca esvaziar — assim o usuário vê os melhores resultados primeiro sem precisar trocar manualmente o select.
3. Indicação visual leve de que os resultados estão ordenados por relevância (badge "por relevância" próximo ao contador).

### Mudanças

**`src/features/dam/components/PreviewSidebar.tsx`**
- O `Select` de ordenação já filtra `relevance` quando `search.length < MIN_SEARCH_LENGTH` (linhas ~107-115). Manter.
- Adicionar pequeno badge `por relevância` ao lado do contador de assets no rodapé quando `state.sort === "relevance"` e há busca ativa (≥3 chars).

**`src/features/dam/pages/DamPreviewPage.tsx`**
- Adicionar `useEffect` que observa `debouncedSearch` e o sort atual:
  - Quando `debouncedSearch.length >= MIN_SEARCH_LENGTH` e `state.sort !== "relevance"`: salvar o sort anterior em `useRef` e chamar `filters.setSort("relevance")`.
  - Quando a busca cair abaixo de `MIN_SEARCH_LENGTH` e `state.sort === "relevance"`: restaurar o sort salvo no ref (fallback para `"created_desc"` se ausente).
  - Não interferir se o usuário trocar manualmente para outro sort durante uma busca ativa (detectado comparando contra o último valor "auto-aplicado").

### Critérios de aceite

- Ao digitar uma busca ≥3 chars na sidebar do preview, a ordenação muda automaticamente para "Relevância" e os resultados refletem o ranking do RPC `search_assets_ranked`.
- Ao apagar a busca (ou cair abaixo de 3 chars), o sort volta ao valor anterior (ex: "Mais recentes").
- Se o usuário escolher manualmente outro sort durante uma busca, a escolha é respeitada (sem auto-override em loop).
- Um badge discreto `por relevância` aparece junto ao contador no rodapé enquanto a ordenação ativa for relevância com busca válida.
- A URL continua refletindo `sort=relevance` (já tratado por `useDamFilters`), mantendo a sessão compartilhável.
- Sem regressão na biblioteca `/dam` nem nos testes existentes de `useAssets`.

