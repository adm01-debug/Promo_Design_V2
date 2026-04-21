

## Modo de Comparação (2–4 assets lado a lado) na pré-visualização

Adicionar um modo "Compare" em `/dam/preview` para selecionar 2–4 assets e exibi-los lado a lado, com zoom/pan sincronizados — útil para validar variações de logo, cores, versões.

### Mudanças

**Novo: `src/features/dam/hooks/use-compare-selection.ts`**
- Estado de seleção: `selectedIds: string[]` (max 4), persistido em `sessionStorage` (`dam-compare-selection`).
- API: `toggle(id)`, `clear()`, `remove(id)`, `count`, `canAdd`.
- Toggle ignora se já tem 4 e o id não está incluso (com toast de aviso).

**Novo: `src/features/dam/components/CompareGrid.tsx`**
- Recebe `assets: Asset[]` (2–4 itens).
- Layout responsivo: 2 itens → grid 2 colunas; 3 → 3 colunas; 4 → 2x2.
- Cada célula: header compacto (nome + botão `X` para remover) + área de imagem.
- Zoom/pan **sincronizado**: estado único `{ scale, tx, ty }` no grid, propagado a todas as células.
  - Wheel/pinch sobre qualquer célula atualiza o estado global.
  - Drag (mousedown→move) também sincroniza.
  - Botões "Reset", "Ajustar", "100%" no topo.
- Cada célula carrega seu próprio signed URL via `getAssetSignedUrl` (cache já existente cobre revisitas).
- Skeleton enquanto URL carrega; mensagem de erro se não-imagem.

**Novo: `src/features/dam/components/CompareTopBar.tsx`**
- Barra fixa no topo da stage quando `compareMode` ativo: `N de 4 selecionados · [Adicionar do strip] · [Limpar] · [Sair do modo]`.

**Editar: `src/features/dam/pages/DamPreviewPage.tsx`**
1. Importar `useCompareSelection` e estado `compareMode: boolean` (toggle via botão no header e atalho `M`).
2. Botão no header: `[Compare]` (mostra contador quando há seleção).
3. Quando `compareMode`:
   - `PreviewStage` é substituído por `<CompareGrid assets={selectedAssets} ... />` se `count >= 2`, senão um placeholder "Selecione ao menos 2 assets do strip abaixo".
   - `PreviewThumbStrip` ganha modo "selecionável" (checkbox visual + borda diferente para selecionados).
4. Atalhos adicionais (apenas em compareMode):
   - `Espaço` adiciona/remove o asset ativo da seleção.
   - `M` sai do modo.
   - Setas continuam navegando o `activeIndex` (cursor para selecionar com Espaço).
5. Atualizar legenda de atalhos no header e popover mobile incluindo: `M compare · Espaço (no compare) selecionar`.

**Editar: `src/features/dam/components/PreviewThumbStrip.tsx`**
- Aceitar props opcionais: `selectionMode?: boolean`, `selectedIds?: string[]`, `onToggleSelect?: (id: string) => void`.
- Quando `selectionMode`: thumb selecionada ganha borda primária + checkmark no canto; clique chama `onToggleSelect` em vez de `onSelect` (cursor segue separado).
- Sem regressão no modo normal.

### Critérios de aceite

- Botão "Compare" no header alterna o modo; ícone + contador quando há seleção.
- Strip permite selecionar 2–4 thumbs (checkmark visível); tentativa de 5ª mostra toast.
- Grid renderiza lado a lado com zoom/pan sincronizado em todas as células (testar com mouse wheel + drag).
- Botões Reset/Ajustar/100% afetam todas simultaneamente.
- Remover via `X` no header da célula ou desmarcar no strip atualiza o grid em tempo real.
- Atalhos: `M` entra/sai, `Espaço` toggle do asset ativo, demais atalhos seguem funcionando.
- Seleção persiste em `sessionStorage` durante a sessão (sobrevive a F5).
- Sair do modo limpa o grid mas mantém a seleção (próximo `M` restaura).
- Sem regressão em PreviewStage normal, drawer de detalhes, ou navegação.

