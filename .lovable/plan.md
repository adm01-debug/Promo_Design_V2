

## Preservar asset ativo ao mudar filtros + explicar motivo da remoção

Hoje, ao mudar filtros em `/dam/preview`, se o asset ativo não estiver mais nos resultados, o usuário vê apenas um chip genérico "Fora dos filtros". Vamos preservar o asset quando ele continua visível e, quando não continua, identificar qual filtro específico o removeu (tipo, cliente, tags, busca, arquivado).

### Mudanças

**Editar: `src/features/dam/pages/DamPreviewPage.tsx`**

1. **Preservar asset ativo entre mudanças de filtro**
   - Hoje: o efeito de leitura de `?asset=` já reposiciona `activeIndex` quando o id ainda existe na lista nova — isso já funciona. Garantir que o efeito de "init no índice 0" (`didInitRef`) NÃO sobrescreva quando há `?asset=` válido.
   - Adicionar guarda: se `activeAsset` muda de id apenas por causa de re-fetch (filtro mudou e id antigo sumiu), não atualizar imediatamente o `localStorage` com o id novo — manter o id antigo persistido por curto prazo (até o usuário interagir) para permitir restauração ao limpar filtros.
   - Implementação: usar um `useRef` `lastUserSelectedIdRef` que só atualiza quando o usuário clica/usa setas. O efeito de persist no `localStorage` passa a usar esse ref em vez do `activeAsset.id` puro.

2. **Diagnosticar motivo da remoção**
   - Criar helper `diagnoseAssetRemoval(asset: Asset, state: DamFiltersState): string[]` em `src/features/dam/lib/filter-diagnosis.ts` que recebe o asset "perdido" (precisamos ter ele em memória) e o `state` atual de filtros, e retorna lista de razões legíveis:
     - `assetTypes`: "Filtro de tipo (Logo) exclui este asset (tipo: Arte)"
     - `clientId`: "Filtro de cliente (Cliente X) exclui este asset (cliente: Cliente Y / sem cliente)"
     - `tags` + `tagsMode`: "Filtro de tags exige [X, Y] (modo: todas/qualquer); asset tem [Z]"
     - `includeArchived`: "Asset está arquivado e filtro 'incluir arquivados' está desligado"
     - `search`: "Busca '<termo>' não corresponde ao nome/tags do asset"
   - Para isso precisamos manter o **último asset visualizado completo** (não só o id). Adicionar estado `lastKnownAsset: Asset | null` que é atualizado sempre que `activeAsset` muda enquanto está nos resultados. Quando o asset some, usamos `lastKnownAsset` para diagnosticar.

3. **UI: mostrar motivos no chip + toast**
   - Substituir o chip atual "Fora dos filtros" por um `Popover` clicável: trigger é o badge `AlertCircle` "Asset removido pelos filtros", o conteúdo lista os motivos retornados pelo helper como bullets, com ações:
     - Botão "Limpar filtros" → `resetFilters()` + reposiciona no asset.
     - Botão "Remover apenas filtro de [tipo X]" para cada filtro identificado como causa (chama setter específico de `useDamFilters`).
   - Toast de fallback (que hoje só diz "fora dos filtros") passa a incluir o primeiro motivo na descrição: "Removido pelo filtro de tipo (Logo). Mostrando o primeiro disponível."

4. **Persist do `lastKnownAsset`**
   - Quando `activeAsset` está nos resultados, atualizar `setLastKnownAsset(activeAsset)`.
   - Quando some, manter o último valor para diagnóstico (não limpar).
   - Ao limpar filtros via botão, reposicionar `activeIndex` no índice do `lastKnownAsset.id` se voltou a aparecer.

### Comportamento

- Mudar filtros e o asset continuar visível → permanece ativo (sem mudanças visíveis para o usuário).
- Mudar filtros e o asset sumir → chip clicável "Asset removido pelos filtros" aparece; toast discreto explica o motivo principal; clicar no chip abre popover com lista de motivos e ações para remover filtros específicos.
- Limpar filtros (via botão do chip ou do toast) → asset volta a ser o ativo automaticamente, sem cair no índice 0.
- Sem regressão na sincronização com `?asset=`, back/forward, banner de "Continuar de onde parou", expiração ou compare mode.

### Critérios de aceite

- Asset ativo permanece selecionado após mudança de filtro quando ainda está nos resultados.
- Quando some, chip "Asset removido pelos filtros" aparece com popover listando motivos específicos (tipo/cliente/tags/busca/arquivado).
- Toast inclui motivo principal na descrição.
- Ações no popover removem filtros específicos e reposicionam o asset.
- Limpar filtros restaura o asset anterior se ele voltar a aparecer.

