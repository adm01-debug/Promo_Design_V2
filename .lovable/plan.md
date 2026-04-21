

## Painel de prévia rápida (Quick Preview) na biblioteca DAM

Adicionar um painel lateral fixo (não-modal) que mostra thumbnail ampliado, metadados completos e versão do asset selecionado/em hover na grade de `/dam`, sem sair da lista nem abrir o drawer pesado de detalhes.

### UX

- **Toggle no header**: botão "Prévia rápida" ao lado de "Filtros salvos" liga/desliga o painel (estado em `localStorage` `dam-quickpreview-enabled`).
- **Quando ligado**: layout vira 2 colunas — grade de assets + painel sticky de ~320px à direita (em telas `lg+`). Em telas menores o painel vira drawer inferior recolhível.
- **Seleção**:
  - Hover em um card (debounce 150ms) → atualiza prévia.
  - Clique simples → "fixa" o asset no painel (mantém ao mover mouse fora). Clicar no mesmo de novo desfixa.
  - Clique em "Abrir detalhes" no painel → abre o `AssetDetailDrawer` existente (preserva fluxo atual de edição).
- **Sem painel**: comportamento atual intacto (clique abre drawer direto).

### Conteúdo do painel `QuickPreviewPanel`

- Thumbnail ampliado (~280px, aspect square) via `AssetThumbnail`.
- Nome + badge de tipo + badge `v{version}` se >1.
- Bloco metadados:
  - Cliente (nome resolvido)
  - Tamanho formatado (KB/MB)
  - Dimensões (`width`×`height` se imagem)
  - MIME type
  - Data criação (relativa pt-BR via `formatDistanceToNow`)
  - Tags (chips, max 6 + "+N")
  - Cores dominantes (4 swatches)
- Indicador de versão: se `useLatestAssetVersion(asset.id).hasUpdate` → badge "Nova versão disponível".
- Ações compactas: "Abrir detalhes", "Copiar URL" (signed URL), "Baixar".
- Atalhos: `Space` fixa/desfixa; `Enter` abre detalhes; setas ↑↓ navegam pelos cards quando painel fixado.

### Arquivos

**Novo**: `src/features/dam/components/QuickPreviewPanel.tsx`
- Props: `asset: Asset | null`, `pinned: boolean`, `onPin: () => void`, `onOpenDetails: () => void`, `clients: Client[]`.
- Reutiliza: `AssetThumbnail`, `getAssetSignedUrl`, `useLatestAssetVersion`, componentes shadcn (`Card`, `Badge`, `Button`, `Separator`).

**Novo hook**: `src/features/dam/hooks/use-quick-preview.ts`
- Estado: `enabled`, `hoverAsset`, `pinnedAsset`, com debounce no hover (150ms).
- Persiste `enabled` em `localStorage`.
- Expõe: `{ enabled, toggleEnabled, activeAsset, setHoverAsset, pinnedId, togglePin }`.
- `activeAsset = pinnedAsset ?? hoverAsset`.

**Editar**: `src/features/dam/pages/DamLibraryPage.tsx`
- Importar hook + painel.
- Botão toggle no header (ícone `PanelRight`, ao lado do `SavedSearchesMenu`).
- Wrapper de layout: `<div className="flex gap-4">` quando `enabled`, com grade em `flex-1` e painel em `w-80 shrink-0 sticky top-4 self-start`.
- Passar `onMouseEnter`/`onClick` para os `AssetCard`s via callbacks novos (`onHover`, `onQuickSelect`) — só quando painel ligado.

**Editar**: `src/features/dam/components/AssetCard.tsx`
- Adicionar props opcionais `onHover?: () => void`, `onQuickSelect?: () => void`, `isQuickActive?: boolean`.
- Aplicar `ring-2 ring-primary` quando `isQuickActive`.
- `onMouseEnter` chama `onHover`; `onClick` mantém comportamento atual mas chama `onQuickSelect` antes — quando painel está ligado a página decide se abre drawer ou só seleciona.

### Detalhes técnicos

- **Performance**: hover debounced; signed URL cacheado em `useState` no painel via `useEffect` com cleanup; sem refetch desnecessário ao alternar entre assets já visitados (cache local Map id→url).
- **Acessibilidade**: painel tem `role="complementary"`, `aria-label="Prévia rápida do asset"`. Botão toggle com `aria-pressed`.
- **Responsivo**: `< lg` → painel vira `Sheet` lateral (mantém componente, troca container).
- **Sem regressão**: todo comportamento atual permanece intocado quando `enabled=false` (estado inicial padrão).

### Critérios de aceite

- Botão "Prévia rápida" no header de `/dam` liga/desliga painel; estado persiste entre sessões.
- Com painel ligado: hover em card mostra preview após 150ms; clique fixa; clique novamente desfixa.
- Painel mostra thumbnail ampliado, nome, tipo, versão, cliente, tamanho, dimensões, MIME, data, tags, cores e badge de nova versão quando aplicável.
- Botões "Abrir detalhes", "Copiar URL", "Baixar" funcionam.
- Atalhos `Space`/`Enter`/setas operam quando painel está visível e foco não está em input.
- Em mobile/tablet (`< lg`) painel vira drawer lateral.
- `docs/FEATURES.md`: nova linha na seção 6 "Prévia rápida (quick preview)" → ✅ apontando para `QuickPreviewPanel.tsx`.

