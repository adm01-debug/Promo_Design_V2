

## Polir botões de ação do overlay da preview

Os botões **Copiar URL**, **Download** e **Detalhes** já existem no canto superior direito do `PreviewStage` (linhas 196-204), mas estão apenas como ícones sem rótulos, sem atalhos de teclado e sem feedback de estado. Vamos elevá-los ao mesmo nível de polimento do toggle de zoom.

### Mudanças

**`src/features/dam/components/PreviewStage.tsx`**

1. **Rótulos visíveis nos botões** (consistente com "Ajustar"/"100%"):
   - Copiar URL → ícone + label "Copiar"
   - Download → ícone + label "Baixar"
   - Detalhes → ícone + label "Detalhes"
   - Mesmo estilo `h-8 px-2 text-xs gap-1` do grupo de zoom.

2. **Feedback visual no Copiar**: após sucesso, trocar o ícone `LinkIcon` por `Check` (lucide) por ~1.5s e mostrar texto "Copiado". Estado local `copied: boolean` com `setTimeout`.

3. **Atalhos de teclado** no `useEffect` já existente (que cuida do `Z`):
   - `C` → copiar URL (chama `handleCopy`)
   - `D` → download (chama `handleDownload`)
   - `Enter` continua abrindo detalhes (já tratado em `DamPreviewPage`)
   - Mesmas guards: ignorar quando há modificadores, inputs/textarea/contentEditable focados, ou quando `!url`.
   - Atualizar `title` dos botões: `Copiar URL (C)`, `Download (D)`, `Detalhes (Enter)`.

4. **Acessibilidade**: adicionar `aria-label` explícito em cada botão (já que o label de texto pode sumir em telas menores no futuro) e `aria-live="polite"` no estado "Copiado" via `sr-only` para leitores de tela.

5. **Estado `disabled` mais claro**: `Copiar` e `Baixar` continuam desabilitados enquanto `url` carrega. `Detalhes` pode habilitar imediatamente (não depende da URL assinada).

**`src/features/dam/pages/DamPreviewPage.tsx`**
- Atualizar a legenda de atalhos no header para incluir os novos:
  `← / → (j/k) navegar · Home/End extremos · Enter detalhes · Z zoom · C copiar · D baixar · Esc voltar`
- Mesma atualização no `PopoverContent` mobile.

### Critérios de aceite

- Os três botões (Copiar, Baixar, Detalhes) mostram ícone + texto e têm tooltip com o atalho.
- Pressionar `C` copia a URL e mostra "Copiado" com `Check` por ~1.5s; `D` dispara download; `Enter` abre o drawer de detalhes (já existente).
- Atalhos respeitam inputs focados, modificadores e drawer aberto.
- Botão "Detalhes" funciona mesmo enquanto o signed URL ainda carrega.
- Linha de atalhos no header e popover mobile listam `C` e `D`.
- Sem regressão no toggle de zoom, navegação ou outras teclas.

