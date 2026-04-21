

## Retomar último asset e filtros ao voltar do preview para a biblioteca

Hoje o preview já persiste em `localStorage` (`dam-last-preview-asset`) o último asset visto (com TTL de 24h) e o `useDamFilters` mantém os filtros entre preview e biblioteca via URL + `localStorage`. Falta a "ponte" na biblioteca: ao entrar em `/dam`, scrollar/destacar o card do último asset e expor um atalho rápido para reabrir o preview no mesmo asset.

### Mudanças

**Editar: `src/features/dam/pages/DamLibraryPage.tsx`**
- Importar `LAST_ASSET_KEY` e `LAST_ASSET_TTL_MS` de `DamPreviewPage`.
- Ler do `localStorage` na montagem; se válido (não expirado), guardar em estado `lastPreviewAssetId: string | null`.
- Após `assets` carregarem (efeito que dispara quando `isLoading === false` e há `lastPreviewAssetId`):
  - Localizar o card via `data-asset-id={a.id}` (adicionar atributo no `AssetCard` e nas linhas do `AssetListView`).
  - `el.scrollIntoView({ behavior: "smooth", block: "center" })`.
  - Aplicar classe temporária `ring-2 ring-primary` por ~2s para destacar (`setTimeout` limpa).
  - Limpar o id após o destaque para não repetir em re-renders subsequentes (estado local, sem apagar o `localStorage`).
- Adicionar pequeno banner/chip no topo da lista (logo abaixo do header) quando `lastPreviewAssetId` existe e está nos resultados:
  - Texto: "Continuar de onde parou: <nome do asset>" + botão `Reabrir no preview` (link para `/dam/preview?asset=<id>{queryString sem ?}`) + botão `X` para descartar (apaga o `localStorage` e esconde).

**Editar: `src/features/dam/components/AssetCard.tsx`**
- Adicionar `data-asset-id={asset.id}` no elemento raiz para permitir o `querySelector`.

**Editar: `src/features/dam/components/AssetListView.tsx`**
- Adicionar `data-asset-id={a.id}` na `<TableRow>` para o mesmo propósito.

**Editar: `src/features/dam/pages/DamPreviewPage.tsx`**
- Exportar uma função utilitária `readLastPreviewAsset(): string | null` (lê e valida TTL) para reutilização no `DamLibraryPage` em vez de duplicar a lógica de parse/expiração. Manter `LAST_ASSET_KEY` e `LAST_ASSET_TTL_MS` exportados.

### Comportamento

- Filtros já são restaurados automaticamente (via `useDamFilters` + URL/localStorage) — sem mudanças necessárias.
- Ao abrir `/dam` após visitar `/dam/preview?asset=X`:
  - Banner "Continuar de onde parou: <nome>" aparece se X estiver entre os assets carregados.
  - O card de X é scrollado para o centro e destacado por ~2s.
  - Clicar em "Reabrir no preview" volta para `/dam/preview?asset=X&...filtros`.
  - Clicar no X do banner descarta o estado e some.
- Se o asset não estiver mais nos resultados (filtro mudou, asset arquivado/excluído), o banner não aparece e nada é destacado.
- TTL de 24h continua valendo: depois disso o id é ignorado.
- Se o usuário rolar/clicar antes do destaque, nada quebra; o destaque é só visual.

### Critérios de aceite

- Voltar de `/dam/preview` para `/dam` (via botão "Voltar à biblioteca" ou `Esc`) faz scroll automático até o último asset visto e o destaca por ~2s.
- Banner "Continuar de onde parou" aparece com nome correto e botão para reabrir no preview com mesmos filtros.
- Filtros (busca, tipo, cliente, tags, ordenação, arquivados) permanecem os mesmos sem redigitar.
- Após 24h o estado expira e a página abre normal sem destaque/banner.
- Se o asset não estiver na página atual de resultados, nada quebra (sem erro, sem banner).
- Sem regressão em filtros, paginação, upload, drawer ou quick preview.

