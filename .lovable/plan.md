

## Badges WCAG + copy-hex em todas as paletas

Estender o que já existe (copy + toast + badges parciais) para cobrir **todas** as cores em todos os pontos onde a paleta aparece.

### Mudanças

**`src/features/dam/components/BrandPreviewCard.tsx`**
- Adicionar nova seção "Paleta completa" abaixo da grid existente, listando **todas** as cores (`primary` + `secondary`) como swatches grandes (40×40px) com:
  - Nome da cor (se houver) + HEX em mono (clicável → copia + toast existente).
  - Badge WCAG vs branco (`AAA`/`AA`/`FAIL`) — verde/azul/vermelho.
  - Badge WCAG vs preto — segundo badge ao lado.
  - Tooltip mostrando ratio numérico ("4.8:1").
- Os 5 dots do hero ganham badge WCAG flutuante (canto inferior direito do dot, mini pill 8px).
- Remover o `slice(0, 8)` da seção "Botão de marca" — manter como está mas a nova seção cobre tudo.

**`src/features/dam/pages/BrandGuidelinesPage.tsx`** — `ColorList` (lista editável)
- Ao lado de cada input HEX, mostrar:
  - Mini badge WCAG (vs branco) — usa o mesmo `wcagLevel()`.
  - Botão `Copy` (ícone `Copy` do lucide) que copia o HEX e dispara toast `"Copiado #XXXXXX"`.
- Não bloqueia salvar quando `FAIL` — apenas avisa visualmente.

**`src/features/dam/lib/color-contrast.ts`** — pequena extensão
- Exportar `wcagBoth(hex)` → `{ vsWhite: WcagLevel; vsBlack: WcagLevel; ratioWhite: number; ratioBlack: number }` para evitar duplicação de cálculo nos dois badges.

### Critérios de aceite

- Toda cor renderizada em `BrandPreviewCard` (hero dots + paleta completa + botões) mostra badge WCAG vs branco e vs preto.
- Toda cor na lista editável de `BrandGuidelinesPage` (primária e secundária) mostra badge WCAG vs branco e botão de copiar com toast.
- Clicar em qualquer cor (swatch, badge, ou botão copy) copia o HEX em maiúscula e mostra toast `"Copiado #XXXXXX"`.
- Tooltip nos badges mostra ratio numérico (ex: "Contraste 7.2:1 vs branco").
- Sem regressão: hero, fonts preview e botões existentes continuam idênticos.

