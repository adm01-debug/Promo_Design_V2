

## Toggle de zoom polido na pré-visualização rápida

Já existe um botão de zoom em `PreviewStage.tsx` (linhas 121-130), mas é minimal: só ícone, sem label visível, sem atalho de teclado e sem indicação clara do estado atual. Vamos transformá-lo num toggle de verdade com label "Ajustar"/"100%", atalho `Z`, e aproveitar o cursor para sinalizar interatividade.

### Mudanças

**`src/features/dam/components/PreviewStage.tsx`**

1. Trocar o `<Button>` de zoom único por um par compacto estilo toggle group inline:
   - "Ajustar" (ativo quando `zoom === "fit"`) com ícone `Minimize2`
   - "100%" (ativo quando `zoom === "actual"`) com ícone `Maximize2`
   - O botão ativo usa `variant="default"` (ou bg `accent`), o inativo `variant="ghost"`.
   - `aria-pressed` no item ativo, `title` indicando "(Z)" como atalho.

2. Quando `zoom === "actual"` e a imagem é maior que o container, o `overflow-auto` do `.flex-1` (já presente na linha 144) permite pan via scroll. Adicionar `cursor-grab` na imagem para sinalizar isso (e `cursor-zoom-in`/`cursor-zoom-out` no estado fit/actual respectivamente como dica visual extra ao passar o mouse).

3. Suporte a clique na imagem para alternar zoom rapidamente (além dos botões), respeitando posição do cursor: clicar no ponto X,Y centraliza esse ponto após zoom para `actual` (scrollLeft/scrollTop calculados a partir de bounding rect). No path `actual → fit`, só reseta scroll para 0,0.

4. Expor o toggle como callback opcional (`onToggleZoom?: () => void`) ou simplesmente escutar a tecla `Z` dentro do próprio `PreviewStage` (mais isolado). Adicionar `useEffect` com listener:
   - `Z` (sem modificadores, fora de input/textarea/contentEditable): alterna `fit ↔ actual`.
   - Só ativa quando `isImage && url` (senão é noop).

**`src/features/dam/pages/DamPreviewPage.tsx`**

5. Atualizar a dica do header (linha ~155, "← / → navegar · Enter detalhes · Esc voltar") para incluir "· Z zoom".

### Critérios de aceite

- O toggle mostra claramente qual modo está ativo ("Ajustar" vs "100%") com fundo destacado no item ativo.
- Pressionar `Z` (fora de campos editáveis) alterna entre fit e 100% quando há imagem visível.
- Em `actual`, é possível scrollar a imagem dentro do container; cursor vira `grab`.
- Clicar diretamente na imagem alterna zoom; quando entra em `actual`, o ponto clicado fica aproximadamente centralizado.
- Para assets não-imagem, o toggle de zoom continua oculto (comportamento atual preservado).
- A linha de atalhos no header de `DamPreviewPage` lista `Z` junto dos outros.
- TypeScript estrito sem warnings; sem regressão visual no resto da página.

